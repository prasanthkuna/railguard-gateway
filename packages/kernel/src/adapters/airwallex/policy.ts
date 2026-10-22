/**
 * Payout policy guard. Amounts, caps, holds and approvals live in code, not in the model.
 * The agent only ever receives a structured decision; it has no tool that can approve or raise a limit.
 */
import { createHash } from "node:crypto"
import type { AuthorizationGrant } from "../../authority"
import type { FinancialIntent } from "../../intent"

export interface Payee {
  /** Stable Railguard payee id (used in intent ids). */
  id: string
  name: string
  /** Airwallex beneficiary_id. Resolved by Railguard, never supplied by the agent. */
  beneficiaryId: string
  /** When finance verified this payee. Missing or recent means NEW_PAYEE_HOLD. */
  verifiedAt?: string | undefined
  aliases?: string[] | undefined
}

export interface PayoutPolicyConfig {
  currency: string
  /** Above this amount a human must approve the exact terms. */
  approvalThreshold: number
  /** Max paid to one payee per UTC day. */
  perPayeeDailyCap: number
  /** Max paid across all payees per UTC day. */
  dailyCap: number
  /** Payees verified less than this long ago are held. */
  newPayeeHoldMs: number
  version: string
}

export const DEFAULT_PAYOUT_POLICY: PayoutPolicyConfig = {
  currency: "USD",
  approvalThreshold: 1_000,
  perPayeeDailyCap: 2_500,
  dailyCap: 5_000,
  newPayeeHoldMs: 24 * 60 * 60_000,
  version: "awx-payout-policy-v1",
}

export type PolicyDenialCode =
  | "INVALID_AMOUNT"
  | "UNKNOWN_PAYEE"
  | "CURRENCY_NOT_ALLOWED"
  | "NEW_PAYEE_HOLD"
  | "PER_PAYEE_CAP"
  | "DAILY_CAP"
  | "APPROVAL_REQUIRED"

export interface PayoutRequest {
  payee: string
  amount: string
  currency: string
  invoice: string
}

export type PolicyDecision =
  | {
      allow: true
      code: "ALLOW"
      payee: Payee
      intent: FinancialIntent
      grant: AuthorizationGrant
      approvedBy?: string | undefined
      policyVersion: string
    }
  | {
      allow: false
      code: PolicyDenialCode
      reason: string
      /** What the agent may do next. It can never approve or raise limits itself. */
      nextStep: string
      payeeId?: string | undefined
      approvalKey?: string | undefined
      limit?: number | undefined
      used?: number | undefined
      requested?: number | undefined
      policyVersion: string
    }

interface Reservation {
  intentId: string
  payeeId: string
  amount: number
  day: string
}

export interface PolicyState {
  reservations: Reservation[]
  approvals: Array<{ key: string; by: string; at: string }>
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
}

export function parseAmount(raw: string): number | null {
  const cleaned = String(raw).replace(/[$,\s]/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Approval is bound to payee, amount, currency and invoice; changing any term needs a new approval. */
export function approvalKeyFor(payeeId: string, amount: number, currency: string, invoice: string) {
  const terms = `${payeeId}|${amount.toFixed(2)}|${currency.toUpperCase()}|${slug(invoice)}`
  return `apr_${createHash("sha256").update(terms).digest("hex").slice(0, 20)}`
}

/** One intent per payee + invoice, so a retried or rephrased request maps to the same request_id. */
export function payoutIntentId(payeeId: string, invoice: string): string {
  return `intent_${payeeId}_inv_${slug(invoice)}`
}

export function createPayoutPolicyGuard(options: {
  payees: Payee[]
  config?: Partial<PayoutPolicyConfig> | undefined
  now?: () => Date
  state?: PolicyState | undefined
}) {
  const config: PayoutPolicyConfig = { ...DEFAULT_PAYOUT_POLICY, ...options.config }
  const now = options.now ?? (() => new Date())
  const reservations = new Map<string, Reservation>(
    (options.state?.reservations ?? []).map((r) => [r.intentId, r]),
  )
  const approvals = new Map<string, { by: string; at: string }>(
    (options.state?.approvals ?? []).map((a) => [a.key, { by: a.by, at: a.at }]),
  )

  const day = () => now().toISOString().slice(0, 10)

  function resolvePayee(name: string): Payee | undefined {
    const wanted = normalize(name)
    if (!wanted) return undefined
    return options.payees.find((p) => {
      const names = [p.name, p.id, ...(p.aliases ?? [])].map(normalize)
      return names.includes(wanted) || names.some((n) => n.split(" ")[0] === wanted)
    })
  }

  function spent(filter: (r: Reservation) => boolean): number {
    let total = 0
    for (const r of reservations.values()) if (r.day === day() && filter(r)) total += r.amount
    return Math.round(total * 100) / 100
  }

  function deny(
    code: PolicyDenialCode,
    reason: string,
    nextStep: string,
    extra: Partial<Extract<PolicyDecision, { allow: false }>> = {},
  ): PolicyDecision {
    return { allow: false, code, reason, nextStep, policyVersion: config.version, ...extra }
  }

  function evaluate(request: PayoutRequest): PolicyDecision {
    const amount = parseAmount(request.amount)
    if (amount === null) {
      return deny(
        "INVALID_AMOUNT",
        `Amount "${request.amount}" is not a valid payout amount.`,
        "Ask the requester for a valid amount.",
      )
    }
    const payee = resolvePayee(request.payee)
    if (!payee) {
      return deny(
        "UNKNOWN_PAYEE",
        `"${request.payee}" is not in the verified payee directory.`,
        "Ask finance to add and verify the payee. Agents cannot add bank details.",
        { requested: amount },
      )
    }
    const currency = (request.currency || config.currency).toUpperCase()
    if (currency !== config.currency) {
      return deny(
        "CURRENCY_NOT_ALLOWED",
        `Only ${config.currency} payouts are allowed by this policy.`,
        "Escalate to a human.",
        { payeeId: payee.id, requested: amount },
      )
    }
    const intentId = payoutIntentId(payee.id, request.invoice)
    const existing = reservations.get(intentId)
    const verifiedMs = payee.verifiedAt ? Date.parse(payee.verifiedAt) : Number.NaN
    if (!Number.isFinite(verifiedMs) || now().getTime() - verifiedMs < config.newPayeeHoldMs) {
      return deny(
        "NEW_PAYEE_HOLD",
        `${payee.name} was added less than ${Math.round(config.newPayeeHoldMs / 3_600_000)}h ago. New payees are held.`,
        "Wait for the hold to clear or ask finance to verify the payee.",
        { payeeId: payee.id, requested: amount },
      )
    }
    // A retry of the same intent is not new spend; the rail decides whether it is a duplicate.
    const already = existing?.day === day() ? existing.amount : 0
    const payeeUsed = spent((r) => r.payeeId === payee.id) - already
    if (payeeUsed + amount > config.perPayeeDailyCap) {
      return deny(
        "PER_PAYEE_CAP",
        `${payee.name} would reach ${(payeeUsed + amount).toFixed(2)} ${currency} today; the per-payee cap is ${config.perPayeeDailyCap.toFixed(2)}.`,
        "Split across days or ask a human to change the policy. Approval cannot override a cap.",
        { payeeId: payee.id, limit: config.perPayeeDailyCap, used: payeeUsed, requested: amount },
      )
    }
    const dayUsed = spent(() => true) - already
    if (dayUsed + amount > config.dailyCap) {
      return deny(
        "DAILY_CAP",
        `Today's payouts would reach ${(dayUsed + amount).toFixed(2)} ${currency}; the daily cap is ${config.dailyCap.toFixed(2)}.`,
        "Wait until tomorrow or ask a human to change the policy.",
        { payeeId: payee.id, limit: config.dailyCap, used: dayUsed, requested: amount },
      )
    }
    let approvedBy: string | undefined
    if (amount > config.approvalThreshold) {
      const key = approvalKeyFor(payee.id, amount, currency, request.invoice)
      const approval = approvals.get(key)
      if (!approval) {
        return deny(
          "APPROVAL_REQUIRED",
          `${amount.toFixed(2)} ${currency} is above the ${config.approvalThreshold.toFixed(2)} approval threshold.`,
          "Stop and ask a human to approve these exact terms. Do not change the amount to get under the threshold.",
          {
            payeeId: payee.id,
            approvalKey: key,
            limit: config.approvalThreshold,
            requested: amount,
          },
        )
      }
      approvedBy = approval.by
    }
    const value = amount.toFixed(2)
    const intent: FinancialIntent = {
      id: intentId,
      principal: { organizationId: "org_demo", actorId: "agent_payment_ops", actorType: "agent" },
      action: { type: "pay", purpose: `Invoice ${request.invoice}` },
      counterparty: { id: payee.beneficiaryId },
      value: { amount: value, asset: currency },
      constraints: { expiresAt: new Date(now().getTime() + 24 * 3_600_000).toISOString() },
      context: { payeeId: payee.id, invoice: request.invoice, approvedBy },
      idempotencyKey: `idem_${intentId}`,
    }
    const evidence = JSON.stringify({
      intentId,
      payee: payee.id,
      value,
      currency,
      approvedBy,
      v: config.version,
    })
    const grant: AuthorizationGrant = {
      grantId: `grant_${intentId}`,
      intentId,
      decision: "allow",
      limits: { reservedAmount: value, asset: currency },
      policyVersion: config.version,
      validUntil: intent.constraints.expiresAt,
      executionConstraints: { rails: ["airwallex"], recipients: [payee.beneficiaryId] },
      evidenceHash: createHash("sha256").update(evidence).digest("hex"),
    }
    if (!existing) reservations.set(intentId, { intentId, payeeId: payee.id, amount, day: day() })
    return {
      allow: true,
      code: "ALLOW",
      payee,
      intent,
      grant,
      approvedBy,
      policyVersion: config.version,
    }
  }

  return {
    config,
    evaluate,
    resolvePayee,
    /** Human channel only (operator UI / API). Not exposed as an agent tool. */
    approve(key: string, by: string) {
      if (!/^apr_[0-9a-f]{20}$/.test(key)) throw new Error("policy: bad approval key")
      approvals.set(key, { by, at: now().toISOString() })
    },
    /** Release a reservation when the payout definitely failed (no funds moved). */
    release(intentId: string) {
      reservations.delete(intentId)
    },
    usage() {
      return { day: day(), total: spent(() => true), dailyCap: config.dailyCap }
    },
    snapshot(): PolicyState {
      return {
        reservations: [...reservations.values()],
        approvals: [...approvals.entries()].map(([key, v]) => ({ key, ...v })),
      }
    },
  }
}

export type PayoutPolicyGuard = ReturnType<typeof createPayoutPolicyGuard>
