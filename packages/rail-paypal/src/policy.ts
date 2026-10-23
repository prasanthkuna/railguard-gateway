/**
 * Accounts-payable policy. Limits, the payee directory and approvals live in code, not in the model.
 * The agent can only ask; it gets back a structured decision and has no tool to approve or raise a limit.
 *
 * Intent binding: one intent per (payee, invoice). Once bound, the amount, currency and PayPal receiver
 * of that intent cannot change. A changed payee (e.g. an invoice that says "our PayPal changed")
 * is refused, because Railguard pays the receiver in the verified directory, never one from the text.
 */
import { createHash } from "node:crypto"
import type { AuthorizationGrant } from "@railguard/kernel/authority"
import type { FinancialIntent } from "@railguard/kernel/intent"
import { type BudgetLedger, fromCents, toCents } from "./budget"

export interface PayPalPayee {
  id: string
  name: string
  /** Verified PayPal receiver (email). Resolved by Railguard, never supplied by the agent. */
  receiver: string
  aliases?: string[] | undefined
  verifiedAt?: string | undefined
}

export interface PayPalPolicyConfig {
  currency: string
  /** Above this amount a human must approve the exact terms. */
  approvalThreshold: number
  /** Hard cap for one payout; approval cannot override it. */
  perPayoutCap: number
  version: string
}

export const DEFAULT_PAYPAL_POLICY: PayPalPolicyConfig = {
  currency: "USD",
  approvalThreshold: 500,
  perPayoutCap: 2_000,
  version: "paypal-ap-policy-v1",
}

export type PayPalDenialCode =
  | "INVALID_AMOUNT"
  | "UNKNOWN_PAYEE"
  | "PAYEE_CHANGED"
  | "CURRENCY_NOT_ALLOWED"
  | "INTENT_CHANGED"
  | "PER_PAYOUT_CAP"
  | "DAILY_BUDGET"
  | "APPROVAL_REQUIRED"

export interface PayRequest {
  payee: string
  amount: string
  currency?: string | undefined
  invoice: string
  /** Receiver the invoice text asks for. Only compared, never used. */
  receiver?: string | undefined
}

export interface BoundIntent {
  intentId: string
  payeeId: string
  amountCents: number
  currency: string
  receiver: string
}

export type PayPalPolicyDecision =
  | {
      allow: true
      code: "ALLOW"
      payee: PayPalPayee
      intent: FinancialIntent
      grant: AuthorizationGrant
      approvedBy?: string | undefined
      policyVersion: string
    }
  | {
      allow: false
      code: PayPalDenialCode
      reason: string
      nextStep: string
      payeeId?: string | undefined
      approvalKey?: string | undefined
      limit?: string | undefined
      available?: string | undefined
      requested?: string | undefined
      policyVersion: string
    }

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9@.]+/g, " ")
    .trim()
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)

export function parseAmount(raw: string): number | null {
  const cleaned = String(raw)
    .replace(/[$,\s]/g, "")
    .replace(/usd$/i, "")
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function paypalIntentId(payeeId: string, invoice: string): string {
  return `intent_pp_${payeeId}_${slug(invoice)}`
}

/** Approval is bound to payee, receiver, amount, currency and invoice; change any term and it is void. */
export function paypalApprovalKey(
  payee: PayPalPayee,
  amountCents: number,
  currency: string,
  invoice: string,
) {
  const terms = `${payee.id}|${payee.receiver.toLowerCase()}|${amountCents}|${currency.toUpperCase()}|${slug(invoice)}`
  return `apr_${createHash("sha256").update(terms).digest("hex").slice(0, 20)}`
}

export function createPayPalPolicyGuard(options: {
  payees: PayPalPayee[]
  budget: BudgetLedger
  config?: Partial<PayPalPolicyConfig> | undefined
  now?: () => Date
}) {
  const config: PayPalPolicyConfig = { ...DEFAULT_PAYPAL_POLICY, ...options.config }
  const now = options.now ?? (() => new Date())
  const bound = new Map<string, BoundIntent>()
  const approvals = new Map<string, { by: string; at: string }>()

  function resolvePayee(name: string): PayPalPayee | undefined {
    const wanted = normalize(name)
    if (!wanted) return undefined
    return options.payees.find((p) => {
      const names = [p.name, p.id, ...(p.aliases ?? [])].map(normalize)
      return names.includes(wanted)
    })
  }

  function deny(
    code: PayPalDenialCode,
    reason: string,
    nextStep: string,
    extra: Partial<Extract<PayPalPolicyDecision, { allow: false }>> = {},
  ): PayPalPolicyDecision {
    return { allow: false, code, reason, nextStep, policyVersion: config.version, ...extra }
  }

  function evaluate(request: PayRequest): PayPalPolicyDecision {
    const amount = parseAmount(request.amount)
    if (amount === null) {
      return deny(
        "INVALID_AMOUNT",
        `"${request.amount}" is not a valid amount.`,
        "Ask the requester for a valid amount.",
      )
    }
    const cents = toCents(amount)
    const requested = fromCents(cents)
    const payee = resolvePayee(request.payee)
    if (!payee) {
      return deny(
        "UNKNOWN_PAYEE",
        `"${request.payee}" is not in the verified payee directory.`,
        "Ask finance to add and verify this payee. Agents cannot add payees or PayPal accounts.",
        { requested },
      )
    }
    if (request.receiver && normalize(request.receiver) !== normalize(payee.receiver)) {
      return deny(
        "PAYEE_CHANGED",
        `The invoice asks to pay ${request.receiver}, but the verified PayPal account for ${payee.name} is different. Changed payment details are a classic invoice-fraud pattern.`,
        "Do not pay. Ask finance to confirm the change with the payee through a known contact, then update the directory.",
        { payeeId: payee.id, requested },
      )
    }
    const currency = (request.currency || config.currency).toUpperCase()
    if (currency !== config.currency) {
      return deny(
        "CURRENCY_NOT_ALLOWED",
        `Only ${config.currency} payouts are allowed.`,
        "Escalate to a human.",
        {
          payeeId: payee.id,
          requested,
        },
      )
    }
    const intentId = paypalIntentId(payee.id, request.invoice)
    const prior = bound.get(intentId)
    if (prior && (prior.amountCents !== cents || prior.currency !== currency)) {
      return deny(
        "INTENT_CHANGED",
        `Invoice ${request.invoice} for ${payee.name} is already bound to ${fromCents(prior.amountCents)} ${prior.currency}. A different amount for the same invoice is refused.`,
        "If the invoice really changed, a human must cancel the first intent and approve the new one.",
        { payeeId: payee.id, requested },
      )
    }
    if (amount > config.perPayoutCap) {
      return deny(
        "PER_PAYOUT_CAP",
        `${requested} ${currency} is above the ${config.perPayoutCap.toFixed(2)} per-payout cap.`,
        "Approval cannot override a cap. Ask a human to change the policy.",
        { payeeId: payee.id, limit: config.perPayoutCap.toFixed(2), requested },
      )
    }
    const existing = options.budget.get(intentId)
    const alreadyHeld = existing && existing.state !== "RELEASED" ? existing.amountCents : 0
    const available = options.budget.availableCents() + alreadyHeld
    if (cents > available) {
      return deny(
        "DAILY_BUDGET",
        `${requested} ${currency} is more than the ${fromCents(Math.max(available, 0))} left in today's agent budget (${fromCents(options.budget.dailyLimitCents)}). Frozen (UNKNOWN) payouts count as spent.`,
        "Wait for tomorrow's budget, or ask a human to raise it.",
        {
          payeeId: payee.id,
          limit: fromCents(options.budget.dailyLimitCents),
          available: fromCents(Math.max(available, 0)),
          requested,
        },
      )
    }
    let approvedBy: string | undefined
    if (amount > config.approvalThreshold) {
      const key = paypalApprovalKey(payee, cents, currency, request.invoice)
      const approval = approvals.get(key)
      if (!approval) {
        return deny(
          "APPROVAL_REQUIRED",
          `${requested} ${currency} is above the ${config.approvalThreshold.toFixed(2)} approval threshold.`,
          "Stop and ask a human to approve these exact terms. Do not split or change the amount.",
          {
            payeeId: payee.id,
            approvalKey: key,
            limit: config.approvalThreshold.toFixed(2),
            requested,
          },
        )
      }
      approvedBy = approval.by
    }

    const value = requested
    const intent: FinancialIntent = {
      id: intentId,
      principal: {
        organizationId: "org_demo",
        actorId: "agent_accounts_payable",
        actorType: "agent",
      },
      action: { type: "pay", purpose: `Invoice ${request.invoice}` },
      counterparty: { id: payee.id, address: payee.receiver },
      value: { amount: value, asset: currency },
      constraints: {
        expiresAt: new Date(now().getTime() + 24 * 3_600_000).toISOString(),
        network: "paypal-sandbox",
      },
      context: { payeeId: payee.id, invoice: request.invoice, approvedBy },
      idempotencyKey: `idem_${intentId}`,
    }
    const evidence = JSON.stringify({
      intentId,
      payee: payee.id,
      receiver: payee.receiver,
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
      executionConstraints: { rails: ["paypal"], recipients: [payee.receiver] },
      evidenceHash: createHash("sha256").update(evidence).digest("hex"),
    }
    if (!prior)
      bound.set(intentId, {
        intentId,
        payeeId: payee.id,
        amountCents: cents,
        currency,
        receiver: payee.receiver,
      })
    options.budget.reserve(intentId, cents)
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
    /** Human channel only (CLI prompt / operator UI). Never exposed as an agent tool. */
    approve(key: string, by: string) {
      if (!/^apr_[0-9a-f]{20}$/.test(key)) throw new Error("policy: bad approval key")
      approvals.set(key, { by, at: now().toISOString() })
    },
    bound: () => [...bound.values()],
  }
}

export type PayPalPolicyGuard = ReturnType<typeof createPayPalPolicyGuard>
