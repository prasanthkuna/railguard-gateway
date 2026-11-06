/**
 * Hedera payment guard - budget tracking and policy enforcement
 */

export interface HederaGuardPolicy {
  /** Total budget in atomic units */
  totalBudget: bigint
  /** Per-merchant limit in atomic units */
  perMerchantLimit: bigint
  /** Allowed recipient accounts */
  recipientAllowlist: string[]
  /** Approval threshold - amounts above this require human approval */
  approvalThreshold?: bigint
}

export interface PaymentIntent {
  requestId: string
  recipient: string
  amount: bigint
  asset: string
  memo?: string
}

export type GuardDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED"

export interface GuardResult {
  decision: GuardDecision
  reason?: string
  /** Deterministic payment ID derived from intent */
  paymentId: string
}

export class HederaPaymentGuard {
  private spentBudget = 0n
  private merchantSpends = new Map<string, bigint>()
  private processedPayments = new Set<string>()

  constructor(private policy: HederaGuardPolicy) {}

  /**
   * Check if a payment is allowed before execution
   * Returns deterministic payment ID for idempotent retries
   */
  checkPayment(intent: PaymentIntent): GuardResult {
    // Generate deterministic payment ID from intent
    const paymentId = this.generatePaymentId(intent)

    // Idempotency check - same request ID gets same decision
    if (this.processedPayments.has(intent.requestId)) {
      return {
        decision: "DENY",
        reason: "duplicate_request_id",
        paymentId,
      }
    }

    // Check recipient allowlist
    if (!this.policy.recipientAllowlist.includes(intent.recipient)) {
      return {
        decision: "DENY",
        reason: "recipient_not_on_allowlist",
        paymentId,
      }
    }

    // Check total budget first (hard limit)
    if (this.spentBudget + intent.amount > this.policy.totalBudget) {
      return {
        decision: "DENY",
        reason: "exceeds_total_budget",
        paymentId,
      }
    }

    // Check per-merchant limit (hard limit)
    const merchantSpent = this.merchantSpends.get(intent.recipient) ?? 0n
    if (merchantSpent + intent.amount > this.policy.perMerchantLimit) {
      return {
        decision: "DENY",
        reason: "exceeds_merchant_limit",
        paymentId,
      }
    }

    // Check approval threshold (requires approval but not denied)
    if (this.policy.approvalThreshold && intent.amount > this.policy.approvalThreshold) {
      // Reserve budget for approval
      this.spentBudget += intent.amount
      this.merchantSpends.set(intent.recipient, merchantSpent + intent.amount)
      this.processedPayments.add(intent.requestId)

      return {
        decision: "APPROVAL_REQUIRED",
        reason: "amount_exceeds_approval_threshold",
        paymentId,
      }
    }

    // Reserve budget
    this.spentBudget += intent.amount
    this.merchantSpends.set(intent.recipient, merchantSpent + intent.amount)
    this.processedPayments.add(intent.requestId)

    return {
      decision: "ALLOW",
      paymentId,
    }
  }

  /**
   * Generate deterministic payment ID from intent
   * Same intent = same payment ID (critical for retry idempotency)
   */
  private generatePaymentId(intent: PaymentIntent): string {
    return `pay_hedera_${intent.requestId}`
  }

  /**
   * Rollback a payment (e.g., if execution failed)
   */
  rollback(intent: PaymentIntent): void {
    this.spentBudget -= intent.amount
    const merchantSpent = this.merchantSpends.get(intent.recipient) ?? 0n
    this.merchantSpends.set(intent.recipient, merchantSpent - intent.amount)
    this.processedPayments.delete(intent.requestId)
  }

  /**
   * Get current budget status
   */
  getStatus() {
    return {
      spentBudget: this.spentBudget,
      remainingBudget: this.policy.totalBudget - this.spentBudget,
      merchantSpends: Object.fromEntries(this.merchantSpends),
    }
  }
}
