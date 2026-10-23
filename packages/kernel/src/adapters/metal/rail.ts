import { createHash } from "node:crypto"
import type { MetalOutcome } from "./cliOutput"
import { type AgentRole, type Allocation, METAL_TESTNET, type MandateTerms } from "./kit11"

/** What one market-data query delivered, kept beside the signed order for disputes. */
export interface DeliveredQuote {
  symbol: string
  price: string
  asOf: string
  source: string
}

export interface SaleRecord {
  orderNo: number
  /** SOLD: customer charged and data delivered. NOT_CHARGED: refused, nothing settled. */
  outcome: "SOLD" | "NOT_CHARGED" | "UNKNOWN"
  queryPriceCents: number
  upstreamPriceCents: number
  customerTx?: string | undefined
  customerNonce?: string | undefined
  sourcingTx?: string | undefined
  signedOffer?: string | undefined
  refusal?: string | undefined
  delivered?: DeliveredQuote | undefined
  /** Set when an UNKNOWN answer was reconciled against the facilitator's /settlements. */
  reconciled?: "FOUND" | "NOT_FOUND" | undefined
}

export interface RailPull {
  outcome: MetalOutcome
  alreadyPaid: boolean
  transaction?: string | undefined
  reason?: string | undefined
}

export interface MandateState {
  spentCents: number
  budgetCents: number
  capCents: number
  revoked: boolean
  mandateId: string
}

export interface MandateVerification {
  verified: boolean
  payments: number
  refusals: number
  detail: string
}

export interface Kit11Addresses {
  account: string
  upstream: string
  bridge: string
  customerAccount: string
}

/**
 * The chain side of Kit 11 behind one interface: the simulator below for tests and the public demo
 * page, and the metal-agent CLI + x402 servers in labs/metal-kit11 for Metal testnet.
 */
export interface Kit11Rail {
  readonly mode: "simulated" | "metal-testnet"
  readonly addresses: Kit11Addresses
  setUpstreamPrice(cents: number): Promise<void>
  setQueryPrice(cents: number): Promise<void>
  /** A customer agent buys one query (signed order); our route buys upstream with the sourcing agent. */
  sellQuery(orderNo: number, opts?: { wrongData?: boolean }): Promise<SaleRecord>
  /** `mandate pull` under a role's mandate. Same paymentId = same payment, paid at most once. */
  pull(role: AgentRole, p: { to: string; cents: number; paymentId: string }): Promise<RailPull>
  /** A refused pull recorded on chain (moves nothing), so the refusal is verifiable from the chain. */
  recordRefusal(
    role: AgentRole,
    p: { to: string; cents: number; paymentId: string },
  ): Promise<{ transaction?: string | undefined; reason: string }>
  /** Owner-only: `mandate replace` (spend carries over; old credential is revoked). */
  replaceMandate(
    role: AgentRole,
    terms: MandateTerms,
  ): Promise<{ transaction?: string; mandateId: string }>
  mandateState(role: AgentRole): Promise<MandateState>
  verifyMandate(role: AgentRole): Promise<MandateVerification>
  verifySignedOrder(sale: SaleRecord): Promise<{ ok: boolean; detail: string }>
  /** Facilitator /settlements lookup, used to reconcile an UNKNOWN purchase before paying again. */
  findSettlement(payTo: string, nonce: string): Promise<{ found: boolean; transaction?: string }>
}

// ---------------------------------------------------------------------------------------------
// Simulator: enforces the same mandate rules Metal's account enforces on chain.

interface SimMandate extends MandateTerms {
  id: string
  spentCents: number
  revoked: boolean
  payments: number
  refusals: number
}

const fakeHash = (seed: string) => `0x${createHash("sha256").update(seed).digest("hex")}`

export interface SimulatedRailOptions {
  allocation: Allocation
  addresses?: Partial<Kit11Addresses>
  accountBalanceCents?: number
  queryPriceCents: number
  upstreamPriceCents: number
  /** Roles whose first payout answer is lost (the pull still lands): exercises UNKNOWN handling. */
  dropFirstAnswer?: AgentRole[]
}

export function createSimulatedKit11Rail(options: SimulatedRailOptions): Kit11Rail & {
  balanceCents(): number
  pullsLanded(paymentId: string): number
} {
  const addresses: Kit11Addresses = {
    account: options.addresses?.account ?? "0x5100000000000000000000000000000000000001",
    upstream: options.addresses?.upstream ?? "0x5100000000000000000000000000000000000002",
    bridge: options.addresses?.bridge ?? "0x5100000000000000000000000000000000000003",
    customerAccount:
      options.addresses?.customerAccount ?? "0x5100000000000000000000000000000000000004",
  }
  let balance = options.accountBalanceCents ?? 2000
  let queryPrice = options.queryPriceCents
  let upstreamPrice = options.upstreamPriceCents
  let seq = 0
  const mandates = new Map<AgentRole, SimMandate>()
  for (const role of ["sourcing", "support", "treasury"] as AgentRole[]) {
    mandates.set(role, {
      ...options.allocation[role],
      id: `sim-mandate-${role}-1`,
      spentCents: 0,
      revoked: false,
      payments: 0,
      refusals: 0,
    })
  }
  const paidIds = new Map<string, string>()
  const landed = new Map<string, number>()
  const drop = new Set<AgentRole>(options.dropFirstAnswer ?? [])
  const settlements: Array<{ payTo: string; nonce: string; transaction: string }> = []

  function check(m: SimMandate, to: string, cents: number): string | undefined {
    if (m.revoked) return "mandate_revoked"
    if (m.payees.length > 0 && !m.payees.some((p) => p.toLowerCase() === to.toLowerCase())) {
      return "mandate_payee_not_listed"
    }
    if (cents > m.capCents) return "mandate_cap_exceeded"
    if (m.spentCents + cents > m.budgetCents) return "mandate_budget_spent"
    if (cents > balance) return "transfer_would_fail"
    return undefined
  }

  function mandateFor(role: AgentRole): SimMandate {
    const m = mandates.get(role)
    if (!m) throw new Error(`no mandate for ${role}`)
    return m
  }

  return {
    mode: "simulated",
    addresses,
    balanceCents: () => balance,
    pullsLanded: (id) => landed.get(id) ?? 0,
    async setUpstreamPrice(cents) {
      upstreamPrice = cents
    },
    async setQueryPrice(cents) {
      queryPrice = cents
    },
    async sellQuery(orderNo, opts = {}) {
      seq += 1
      const nonce = fakeHash(`nonce:${orderNo}:${seq}`)
      const sourcing = mandateFor("sourcing")
      const refusal = check(sourcing, addresses.upstream, upstreamPrice)
      if (refusal) {
        sourcing.refusals += 1
        // Our route answers an error status, so the customer's payment is never settled.
        return {
          orderNo,
          outcome: "NOT_CHARGED",
          queryPriceCents: queryPrice,
          upstreamPriceCents: upstreamPrice,
          customerNonce: nonce,
          refusal,
        }
      }
      sourcing.spentCents += upstreamPrice
      sourcing.payments += 1
      balance -= upstreamPrice
      balance += queryPrice
      const customerTx = fakeHash(`sale:${orderNo}:${seq}`)
      settlements.push({ payTo: addresses.account, nonce, transaction: customerTx })
      return {
        orderNo,
        outcome: "SOLD",
        queryPriceCents: queryPrice,
        upstreamPriceCents: upstreamPrice,
        customerTx,
        customerNonce: nonce,
        sourcingTx: fakeHash(`upstream:${orderNo}:${seq}`),
        signedOffer: `sim-signed-order:${orderNo}:${queryPrice}`,
        delivered: {
          symbol: "ACME",
          price: opts.wrongData ? "0.00" : (101.25 + orderNo / 100).toFixed(2),
          asOf: opts.wrongData
            ? "2026-01-01T00:00:00Z"
            : new Date(Date.UTC(2026, 9, 23, 4, orderNo)).toISOString(),
          source: "upstream-sim",
        },
      }
    },
    async pull(role, p) {
      const m = mandateFor(role)
      const prior = paidIds.get(p.paymentId)
      if (prior) return { outcome: "PAID", alreadyPaid: true, transaction: prior }
      const reason = check(m, p.to, p.cents)
      if (reason) {
        return { outcome: "REFUSED", alreadyPaid: false, reason }
      }
      m.spentCents += p.cents
      m.payments += 1
      balance -= p.cents
      const tx = fakeHash(`pull:${p.paymentId}`)
      paidIds.set(p.paymentId, tx)
      landed.set(p.paymentId, (landed.get(p.paymentId) ?? 0) + 1)
      if (drop.delete(role)) return { outcome: "UNKNOWN", alreadyPaid: false }
      return { outcome: "PAID", alreadyPaid: false, transaction: tx }
    },
    async recordRefusal(role, p) {
      const m = mandateFor(role)
      const reason = check(m, p.to, p.cents) ?? "none"
      if (reason !== "none") m.refusals += 1
      return { transaction: fakeHash(`refusal:${p.paymentId}`), reason }
    },
    async replaceMandate(role, terms) {
      const old = mandateFor(role)
      if (terms.budgetCents <= old.spentCents)
        throw new Error("replacement budget must exceed spent")
      const next: SimMandate = {
        ...terms,
        id: old.id.replace(/-(\d+)$/, (_, n) => `-${Number(n) + 1}`),
        spentCents: old.spentCents,
        revoked: false,
        payments: 0,
        refusals: 0,
      }
      old.revoked = true
      mandates.set(role, next)
      return { transaction: fakeHash(`replace:${next.id}`), mandateId: next.id }
    },
    async mandateState(role) {
      const m = mandateFor(role)
      return {
        spentCents: m.spentCents,
        budgetCents: m.budgetCents,
        capCents: m.capCents,
        revoked: m.revoked,
        mandateId: m.id,
      }
    },
    async verifyMandate(role) {
      const m = mandateFor(role)
      return {
        verified: true,
        payments: m.payments,
        refusals: m.refusals,
        detail: `simulated: ${m.payments} payments and ${m.refusals} refusals within cap ${m.capCents} and budget ${m.budgetCents}`,
      }
    },
    async verifySignedOrder(sale) {
      const ok = Boolean(sale.signedOffer && sale.customerTx)
      return {
        ok,
        detail: ok ? "signed order matches the payment" : "no signed order for this sale",
      }
    },
    async findSettlement(payTo, nonce) {
      const s = settlements.find((x) => x.payTo === payTo && x.nonce === nonce)
      return s ? { found: true, transaction: s.transaction } : { found: false }
    },
  }
}

export const SIMULATED_EXPLORER_NOTE = `simulated hashes are not on ${METAL_TESTNET.explorer}`
