/**
 * Railguard spend guard for Solana agent payments. The model never decides: code checks the
 * intent against policy before any transaction is built.
 */
import { createHash } from "node:crypto"

export interface SolanaPaymentIntent {
  /** Stable business id (e.g. "vendor:invoice-42"). A retry of the same intent reuses it. */
  id: string
  agentId: string
  senderOwner: string
  recipientOwner: string
  mint: string
  /** Atomic units. */
  amount: bigint
  purpose: string
}

export interface SolanaSpendPolicy {
  version: string
  allowedMints: string[]
  /** Payees the agent may pay. Agents cannot add payees. */
  allowedRecipients: string[]
  perPaymentCap: bigint
  dailyBudget: bigint
  /** Above this amount a human must approve these exact terms. */
  approvalThreshold: bigint
}

export type GuardDecision =
  | { decision: "ALLOW"; requestId: string; termsHash: string }
  | {
      decision: "DENY"
      code:
        | "MINT_NOT_ALLOWED"
        | "RECIPIENT_NOT_ALLOWED"
        | "INVALID_AMOUNT"
        | "PER_PAYMENT_CAP"
        | "DAILY_BUDGET"
        | "APPROVAL_REQUIRED"
      requestId: string
      termsHash: string
      next: string
    }

/** Deterministic request id: the SPL memo and the idempotency key for this intent. */
export function solanaRequestId(intentId: string): string {
  return `rg_${createHash("sha256").update(`railguard:solana:${intentId}`).digest("hex").slice(0, 40)}`
}

/** Hash of the exact payment terms. A human approval is bound to this hash, not to the intent id. */
export function termsHash(intent: SolanaPaymentIntent): string {
  const canonical = JSON.stringify([
    intent.id,
    intent.senderOwner,
    intent.recipientOwner,
    intent.mint,
    intent.amount.toString(),
  ])
  return createHash("sha256").update(canonical).digest("hex")
}

export function checkSolanaPayment(input: {
  intent: SolanaPaymentIntent
  policy: SolanaSpendPolicy
  /** Atomic units already CONFIRMED or reserved (UNKNOWN counts: budget stays frozen) today. */
  spentOrReservedToday: bigint
  approvedTermsHashes?: ReadonlySet<string> | undefined
}): GuardDecision {
  const { intent, policy } = input
  const requestId = solanaRequestId(intent.id)
  const hash = termsHash(intent)
  const deny = (code: Extract<GuardDecision, { decision: "DENY" }>["code"], next: string) =>
    ({ decision: "DENY", code, requestId, termsHash: hash, next }) as const
  if (!policy.allowedMints.includes(intent.mint)) {
    return deny("MINT_NOT_ALLOWED", "only the policy's stablecoin mint can be paid")
  }
  if (!policy.allowedRecipients.includes(intent.recipientOwner)) {
    return deny("RECIPIENT_NOT_ALLOWED", "a human must add this payee; the agent cannot")
  }
  if (intent.amount <= 0n) return deny("INVALID_AMOUNT", "amount must be positive")
  if (intent.amount > policy.perPaymentCap) {
    return deny("PER_PAYMENT_CAP", "an approval cannot lift a cap; change policy instead")
  }
  if (input.spentOrReservedToday + intent.amount > policy.dailyBudget) {
    return deny("DAILY_BUDGET", "wait for tomorrow's budget or change policy")
  }
  if (intent.amount > policy.approvalThreshold && !input.approvedTermsHashes?.has(hash)) {
    return deny("APPROVAL_REQUIRED", "stop and ask a human to approve these exact terms")
  }
  return { decision: "ALLOW", requestId, termsHash: hash }
}

/** Parse "0.01" with `decimals` into atomic units without floating point. */
export function toAtomic(value: string, decimals: number): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(value.trim())
  if (!m) throw new Error("amount_format")
  const frac = m[2] ?? ""
  if (frac.length > decimals) throw new Error("amount_precision")
  return (
    BigInt(m[1] as string) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0")
  )
}
