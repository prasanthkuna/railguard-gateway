/**
 * Kit 11 end to end, against any Kit11Rail (simulator or Metal testnet) and any AirwallexTreasury
 * (simulator or Airwallex sandbox): sell queries, raise the upstream price and show the refusal,
 * rebalance the mandates inside the 20 *USDZ total with a person's approval, resolve a disputed batch,
 * then move earnings to Airwallex, convert and pay the EUR licence fee.
 */
import {
  type DisputeDecision,
  type Kit11Model,
  type RebalanceDecision,
  decideDispute,
  decideRebalance,
} from "./agent"
import {
  type RebalanceOption,
  type SpentByRole,
  approvalHash,
  changedRoles,
  rebalanceOptions,
  validateAllocation,
} from "./budget"
import {
  AGENT_ROLES,
  type AgentRole,
  type Allocation,
  KIT11,
  type Kit11Config,
  centsToUsdz,
  sumBudgets,
} from "./kit11"
import type { Kit11Rail, MandateVerification, RailPull, SaleRecord } from "./rail"
import { deterministicUuid, railguardRequestId } from "./requestId"
import type {
  AirwallexTreasury,
  ConversionResult,
  DepositResult,
  LicenceTransferResult,
} from "./treasury"

export type Kit11Actor =
  | "owner"
  | "customer-agent"
  | "sourcing-agent"
  | "support-agent"
  | "treasury-agent"
  | "approver"
  | "railguard"
  | "airwallex"

export interface Kit11Event {
  at: string
  step: string
  actor: Kit11Actor
  detail: string
  outcome?: string | undefined
  transaction?: string | undefined
  requestId?: string | undefined
}

export interface Kit11Proposal {
  option: RebalanceOption
  decision: RebalanceDecision
  approvalHash: string
}

export interface Kit11RunOptions {
  rail: Kit11Rail
  treasury: AirwallexTreasury
  models?: Kit11Model[]
  config?: Kit11Config
  allocation: Allocation
  /** The person approving the new limits sees exactly these terms (bound by approvalHash). */
  approve: (proposal: Kit11Proposal) => boolean | Promise<boolean>
  /** Distinguishes runs so each run's payouts are new intents (retries inside a run reuse ids). */
  runId: string
  salesBefore?: number
  salesAfter?: number
  /** Order numbers that deliver wrong data (the dispute's real problem). */
  wrongDataOrders?: number[]
  /** Re-send the earnings payout after it paid, to prove the chain pays one payment id once. */
  resendEarnings?: boolean
  now?: () => Date
  onEvent?: (e: Kit11Event) => void
}

export interface Kit11RunResult {
  runId: string
  chain: Kit11Rail["mode"]
  treasuryMode: AirwallexTreasury["mode"]
  addresses: Kit11Rail["addresses"]
  events: Kit11Event[]
  sales: SaleRecord[]
  refusal?: { reason: string; recordedTx?: string | undefined } | undefined
  allocationBefore: Allocation
  allocationAfter: Allocation
  proposal?: Kit11Proposal | undefined
  approved: boolean
  dispute?:
    | (DisputeDecision & {
        verifiedOrders: number
        refunds: Array<{ orderNo: number; paymentId: string; pull: RailPull }>
      })
    | undefined
  earnings?:
    | { cents: number; paymentId: string; pull: RailPull; resend?: RailPull | undefined }
    | undefined
  deposit?: DepositResult | undefined
  conversion?: ConversionResult | undefined
  licence?: LicenceTransferResult | undefined
  verifications: Partial<Record<AgentRole, MandateVerification>>
  invariants: {
    budgetsWithinTotal: boolean
    customerNotChargedOnRefusal: boolean
    earningsPaidOnce: boolean
    noUnresolvedUnknown: boolean
  }
}

const ACTOR_OF: Record<AgentRole, Kit11Actor> = {
  sourcing: "sourcing-agent",
  support: "support-agent",
  treasury: "treasury-agent",
}

export async function runKit11(o: Kit11RunOptions): Promise<Kit11RunResult> {
  const config = o.config ?? KIT11
  const now = o.now ?? (() => new Date())
  const events: Kit11Event[] = []
  const log = (e: Omit<Kit11Event, "at">) => {
    const ev = { at: now().toISOString(), ...e }
    events.push(ev)
    o.onEvent?.(ev)
  }
  const sales: SaleRecord[] = []
  let allocation = o.allocation
  const allocationBefore = o.allocation
  const wrong = new Set(o.wrongDataOrders ?? [2])
  let unresolvedUnknown = 0

  const spent = async (): Promise<SpentByRole> => {
    const s = {} as SpentByRole
    for (const r of AGENT_ROLES) s[r] = (await o.rail.mandateState(r)).spentCents
    return s
  }

  const result: Kit11RunResult = {
    runId: o.runId,
    chain: o.rail.mode,
    treasuryMode: o.treasury.mode,
    addresses: o.rail.addresses,
    events,
    sales,
    allocationBefore,
    allocationAfter: allocation,
    approved: false,
    verifications: {},
    invariants: {
      budgetsWithinTotal: false,
      customerNotChargedOnRefusal: true,
      earningsPaidOnce: true,
      noUnresolvedUnknown: true,
    },
  }

  // 1. The three mandates, held to the total in code.
  const startCheck = validateAllocation(
    allocation,
    { sourcing: -1, support: -1, treasury: -1 },
    config,
  )
  if (!startCheck.ok) throw new Error(`initial allocation invalid: ${startCheck.errors.join("; ")}`)
  log({
    step: "MANDATES_BOUND",
    actor: "owner",
    detail: `sourcing ${centsToUsdz(allocation.sourcing.budgetCents)} (cap ${centsToUsdz(allocation.sourcing.capCents)}), support ${centsToUsdz(allocation.support.budgetCents)}, treasury ${centsToUsdz(allocation.treasury.budgetCents)}: ${centsToUsdz(sumBudgets(allocation))} of ${centsToUsdz(config.totalBudgetCents)} *USDZ`,
  })

  let queryPrice = config.queryPriceCents
  let orderNo = 0
  const sell = async () => {
    orderNo += 1
    let sale = await o.rail.sellQuery(orderNo, { wrongData: wrong.has(orderNo) })
    if (sale.outcome === "UNKNOWN" && sale.customerNonce) {
      // Railguard: an unanswered purchase is UNKNOWN until the facilitator says whether it settled.
      const found = await o.rail.findSettlement(o.rail.addresses.account, sale.customerNonce)
      sale = found.found
        ? { ...sale, outcome: "SOLD", customerTx: found.transaction, reconciled: "FOUND" }
        : { ...sale, outcome: "NOT_CHARGED", reconciled: "NOT_FOUND" }
      log({
        step: "RECONCILED",
        actor: "railguard",
        detail: `order ${orderNo}: /settlements says ${found.found ? "settled" : "not settled"}`,
        outcome: sale.outcome,
      })
    }
    sales.push(sale)
    log({
      step: sale.outcome === "SOLD" ? "QUERY_SOLD" : "QUERY_NOT_CHARGED",
      actor: sale.outcome === "SOLD" ? "customer-agent" : "sourcing-agent",
      detail:
        sale.outcome === "SOLD"
          ? `order ${orderNo}: buyer paid ${centsToUsdz(sale.queryPriceCents)} with a signed order; sourcing paid upstream ${centsToUsdz(sale.upstreamPriceCents)}`
          : `order ${orderNo}: upstream purchase at ${centsToUsdz(sale.upstreamPriceCents)} refused (${sale.refusal ?? "unknown"}); route answered an error, buyer not charged`,
      outcome: sale.outcome,
      transaction: sale.customerTx,
    })
    return sale
  }

  // 2. Sell queries at the normal upstream price.
  for (let i = 0; i < (o.salesBefore ?? 3); i++) await sell()

  // 3. Upstream raises its price past the sourcing cap.
  await o.rail.setUpstreamPrice(config.raisedUpstreamPriceCents)
  log({
    step: "UPSTREAM_PRICE_RAISED",
    actor: "railguard",
    detail: `upstream ${centsToUsdz(config.upstreamPriceCents)} -> ${centsToUsdz(config.raisedUpstreamPriceCents)} *USDZ, above the sourcing cap ${centsToUsdz(allocation.sourcing.capCents)}`,
  })
  const refused = await sell()
  result.invariants.customerNotChargedOnRefusal = refused.outcome === "NOT_CHARGED"
  const reason = refused.refusal ?? "mandate_cap_exceeded"
  const refusalId = railguardRequestId({
    kind: "upstream-refusal",
    runId: o.runId,
    orderNo: refused.orderNo,
    cents: config.raisedUpstreamPriceCents,
  })
  const rec = await o.rail.recordRefusal("sourcing", {
    to: o.rail.addresses.upstream,
    cents: config.raisedUpstreamPriceCents,
    paymentId: refusalId,
  })
  result.refusal = { reason: rec.reason || reason, recordedTx: rec.transaction }
  log({
    step: "REFUSAL_RECORDED",
    actor: "railguard",
    detail: `the account refused ${centsToUsdz(config.raisedUpstreamPriceCents)} to upstream: ${rec.reason}; recorded on chain, moves nothing`,
    transaction: rec.transaction,
    requestId: refusalId,
    outcome: "REFUSED",
  })
  const v1 = await o.rail.verifyMandate("sourcing")
  log({
    step: "REFUSAL_VERIFIED",
    actor: "railguard",
    detail: `mandate verify (sourcing): ${v1.verified ? "verified" : "FAILED"}, ${v1.payments} payments, ${v1.refusals} refusals`,
    outcome: v1.verified ? "VERIFIED" : "FAILED",
  })

  // 4. Treasury agent proposes; a person approves the exact terms; owner replaces the mandates.
  const options = rebalanceOptions(
    allocation,
    await spent(),
    config,
    config.raisedUpstreamPriceCents,
    queryPrice,
  )
  const decision = await decideRebalance(o.models ?? [], options, {
    upstreamFrom: config.upstreamPriceCents,
    upstreamTo: config.raisedUpstreamPriceCents,
    refusal: reason,
  })
  const option = options.find((x) => x.id === decision.optionId)
  if (!option) throw new Error("no rebalance option")
  const proposal: Kit11Proposal = {
    option,
    decision,
    approvalHash: approvalHash(option.allocation, option.queryPriceCents),
  }
  result.proposal = proposal
  log({
    step: "REBALANCE_PROPOSED",
    actor: "treasury-agent",
    detail: `option ${option.id}: ${option.title}. ${decision.rationale} (${decision.decidedBy})`,
    requestId: proposal.approvalHash,
  })
  const approved = await o.approve(proposal)
  result.approved = approved
  if (!approved) {
    log({
      step: "ESCALATED",
      actor: "approver",
      detail: "new limits not approved; sourcing stays paused, nothing replaced",
    })
    result.invariants.budgetsWithinTotal = sumBudgets(allocation) <= config.totalBudgetCents
    return result
  }
  log({
    step: "LIMITS_APPROVED",
    actor: "approver",
    detail: `approved ${proposal.approvalHash}`,
    requestId: proposal.approvalHash,
  })
  const recheck = validateAllocation(option.allocation, await spent(), config, {
    sourcingCapAtLeast: config.raisedUpstreamPriceCents,
    supportCapAtLeast: option.queryPriceCents,
  })
  if (!recheck.ok)
    throw new Error(`approved allocation no longer valid: ${recheck.errors.join("; ")}`)
  for (const role of changedRoles(allocation, option.allocation)) {
    const r = await o.rail.replaceMandate(role, option.allocation[role])
    log({
      step: "MANDATE_REPLACED",
      actor: "owner",
      detail: `${role}: cap ${centsToUsdz(option.allocation[role].capCents)}, budget ${centsToUsdz(option.allocation[role].budgetCents)} (spend carried over; old credential revoked)`,
      transaction: r.transaction,
    })
  }
  allocation = option.allocation
  result.allocationAfter = allocation
  if (option.queryPriceCents !== queryPrice) {
    queryPrice = option.queryPriceCents
    await o.rail.setQueryPrice(queryPrice)
    log({
      step: "QUERY_PRICE_CHANGED",
      actor: "owner",
      detail: `query price now ${centsToUsdz(queryPrice)} *USDZ`,
    })
  }

  // 5. Business keeps running at the new upstream price.
  for (let i = 0; i < (o.salesAfter ?? 2); i++) await sell()

  // 6. Disputed batch: signed orders prove the buyer's agent placed them; refund only wrong data.
  const batch = sales.filter((s) => s.outcome === "SOLD" && s.orderNo <= (o.salesBefore ?? 3))
  let verifiedOrders = 0
  for (const s of batch) {
    const v = await o.rail.verifySignedOrder(s)
    if (v.ok) verifiedOrders += 1
    log({
      step: "SIGNED_ORDER_CHECKED",
      actor: "railguard",
      detail: `order ${s.orderNo}: ${v.detail}`,
      outcome: v.ok ? "PLACED_BY_BUYER" : "NOT_PROVEN",
      transaction: s.customerTx,
    })
  }
  const dispute = await decideDispute(o.models ?? [], batch)
  log({
    step: "DISPUTE_JUDGED",
    actor: "support-agent",
    detail: `refund orders [${dispute.refundOrderNos.join(", ")}]: ${dispute.rationale} (${dispute.decidedBy})`,
  })
  const refunds: Array<{ orderNo: number; paymentId: string; pull: RailPull }> = []
  for (const n of dispute.refundOrderNos) {
    const s = batch.find((x) => x.orderNo === n)
    if (!s || !s.customerTx) continue
    const paymentId = railguardRequestId({
      kind: "refund",
      runId: o.runId,
      orderNo: n,
      customerTx: s.customerTx,
    })
    const pull = await pullOnce(
      o.rail,
      "support",
      { to: o.rail.addresses.customerAccount, cents: s.queryPriceCents, paymentId },
      log,
    )
    if (pull.outcome === "UNKNOWN") unresolvedUnknown += 1
    refunds.push({ orderNo: n, paymentId, pull })
  }
  result.dispute = { ...dispute, verifiedOrders, refunds }

  // 7. Treasury: move earnings to a Metal address we hold, credit it in Airwallex, convert, pay.
  const sold = sales.filter((s) => s.outcome === "SOLD")
  const revenue = sold.reduce((t, s) => t + s.queryPriceCents, 0)
  const upstreamCost = sold.reduce((t, s) => t + s.upstreamPriceCents, 0)
  const refunded = refunds
    .filter((r) => r.pull.outcome === "PAID")
    .reduce((t, r) => t + (batch.find((b) => b.orderNo === r.orderNo)?.queryPriceCents ?? 0), 0)
  const earningsCents = Math.max(
    1,
    Math.min(revenue - upstreamCost - refunded, allocation.treasury.capCents),
  )
  const earningsId = railguardRequestId({
    kind: "earnings",
    runId: o.runId,
    cents: earningsCents,
    to: o.rail.addresses.bridge,
  })
  const pull = await pullOnce(
    o.rail,
    "treasury",
    { to: o.rail.addresses.bridge, cents: earningsCents, paymentId: earningsId },
    log,
  )
  let resend: RailPull | undefined
  if (o.resendEarnings && pull.outcome === "PAID") {
    resend = await o.rail.pull("treasury", {
      to: o.rail.addresses.bridge,
      cents: earningsCents,
      paymentId: earningsId,
    })
    result.invariants.earningsPaidOnce = resend.alreadyPaid
    log({
      step: "DUPLICATE_PAYOUT_BLOCKED",
      actor: "railguard",
      detail: `re-sent the same payout (lost-answer drill): ${resend.alreadyPaid ? "already paid, nothing sent" : resend.outcome}`,
      requestId: earningsId,
      outcome: resend.alreadyPaid ? "BLOCKED" : resend.outcome,
    })
  }
  if (pull.outcome === "UNKNOWN") unresolvedUnknown += 1
  result.earnings = { cents: earningsCents, paymentId: earningsId, pull, resend }

  if (pull.outcome === "PAID" && pull.transaction) {
    result.deposit = await o.treasury.creditEarnings({
      amountUsd: centsToUsdz(earningsCents),
      metalTx: pull.transaction,
    })
    log({
      step: "EARNINGS_CREDITED",
      actor: "airwallex",
      detail: `deposit ${result.deposit.amount} USD, reference = Metal tx (${result.deposit.status}${result.deposit.reused ? ", found existing" : ""})`,
      transaction: pull.transaction,
      requestId: result.deposit.depositId,
    })
    const convId = deterministicUuid({ kind: "fx", runId: o.runId, buyEur: config.licenceFeeEur })
    result.conversion = await o.treasury.convertToEur({
      buyEur: config.licenceFeeEur,
      requestId: convId,
    })
    log({
      step: "FX_CONVERTED",
      actor: "treasury-agent",
      detail: `bought ${result.conversion.buyAmount} EUR${result.conversion.sellAmount ? ` for ${result.conversion.sellAmount} USD` : ""} (${result.conversion.status})`,
      requestId: result.conversion.conversionId || convId,
    })
    const licenceId = railguardRequestId({
      kind: "licence-fee",
      runId: o.runId,
      eur: config.licenceFeeEur,
    })
    result.licence = await o.treasury.payLicenceFee({
      amountEur: config.licenceFeeEur,
      requestId: licenceId,
      reference: `Licence fee ${o.runId}`,
    })
    log({
      step: "LICENCE_FEE_PAID",
      actor: "airwallex",
      detail: `EUR ${result.licence.amount} licence fee transfer ${result.licence.transferId} (${result.licence.status})`,
      requestId: licenceId,
      outcome: result.licence.status,
    })
  } else {
    log({
      step: "ESCALATED",
      actor: "railguard",
      detail: `earnings payout ${pull.outcome}; nothing credited in Airwallex until it is known`,
      requestId: earningsId,
    })
  }

  // 8. Everything checked from the chain.
  for (const r of AGENT_ROLES) {
    const v = await o.rail.verifyMandate(r)
    result.verifications[r] = v
    log({
      step: "MANDATE_VERIFIED",
      actor: "railguard",
      detail: `${r}: ${v.verified ? "verified" : "FAILED"} (${v.payments} payments, ${v.refusals} refusals)`,
      outcome: v.verified ? "VERIFIED" : "FAILED",
    })
  }
  result.invariants.budgetsWithinTotal = sumBudgets(allocation) <= config.totalBudgetCents
  result.invariants.noUnresolvedUnknown = unresolvedUnknown === 0
  return result
}

/** A payout under a mandate. UNKNOWN re-runs the SAME pull (same payment id), never a new one. */
export async function pullOnce(
  rail: Kit11Rail,
  role: AgentRole,
  p: { to: string; cents: number; paymentId: string },
  log: (e: Omit<Kit11Event, "at">) => void,
  maxReruns = 3,
): Promise<RailPull> {
  let r = await rail.pull(role, p)
  let reruns = 0
  while (r.outcome === "UNKNOWN" && reruns < maxReruns) {
    reruns += 1
    log({
      step: "UNKNOWN_RERUN_SAME_ID",
      actor: "railguard",
      detail: `${role} payout answer lost: re-running the same pull (${reruns}/${maxReruns})`,
      requestId: p.paymentId,
      outcome: "UNKNOWN",
    })
    r = await rail.pull(role, p)
  }
  log({
    step:
      r.outcome === "PAID"
        ? "PAYOUT_PAID"
        : r.outcome === "REFUSED"
          ? "PAYOUT_REFUSED"
          : "PAYOUT_UNKNOWN",
    actor: ACTOR_OF[role],
    detail: `${role} paid ${centsToUsdz(p.cents)} *USDZ to ${p.to.slice(0, 10)}…: ${r.outcome}${r.alreadyPaid ? " (already paid, nothing sent)" : ""}${r.reason ? ` ${r.reason}` : ""}`,
    transaction: r.transaction,
    requestId: p.paymentId,
    outcome: r.outcome,
  })
  return r
}
