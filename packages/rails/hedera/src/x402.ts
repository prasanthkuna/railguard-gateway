/**
 * Hedera x402 guarded client
 * Pays for x402-protected APIs using Hedera testnet with Railguard policy enforcement
 */

import type { HederaPaymentGuard, PaymentIntent } from "./guard"
import type { HcsAuditLog } from "./hcsAudit"
import type { HederaPaymentVerifier } from "./verifier"

export interface X402PaymentStatus {
  status: "ALLOWED" | "DENIED" | "EXECUTING" | "CONFIRMED" | "UNKNOWN" | "FAILED"
  paymentId: string
  reason?: string
  transactionId?: string
}

export interface X402GuardedClientConfig {
  guard: HederaPaymentGuard
  auditLog?: HcsAuditLog
  verifier?: HederaPaymentVerifier
  /** Hedera account ID for executing payments */
  accountId?: string
  /** Private key for signing transactions (testnet only) */
  privateKey?: string
}

export class X402GuardedClient {
  private pendingPayments = new Map<string, PaymentIntent>()

  constructor(private config: X402GuardedClientConfig) {}

  /**
   * Request to pay for an x402-protected resource
   * Returns payment status immediately without waiting for settlement
   */
  async requestPayment(intent: PaymentIntent): Promise<X402PaymentStatus> {
    // Step 1: Check with guard
    const guardResult = this.config.guard.checkPayment(intent)

    // Log decision to HCS audit
    if (this.config.auditLog) {
      const auditEntry = this.config.auditLog.createEntry({
        decision: guardResult.decision === "ALLOW" ? "ALLOW" : "DENY",
        requestId: intent.requestId,
        amount: intent.amount.toString(),
        asset: intent.asset,
        recipient: intent.recipient,
        reason: guardResult.reason,
      })
      // In real implementation, would submit to HCS:
      // await this.config.auditLog.submitEntry(auditEntry)
    }

    if (guardResult.decision === "DENY") {
      return {
        status: "DENIED",
        paymentId: guardResult.paymentId,
        reason: guardResult.reason,
      }
    }

    if (guardResult.decision === "APPROVAL_REQUIRED") {
      // Store for later approval
      this.pendingPayments.set(guardResult.paymentId, intent)
      return {
        status: "DENIED",
        paymentId: guardResult.paymentId,
        reason: "approval_required",
      }
    }

    // Step 2: Execute payment (requires credentials)
    if (!this.config.accountId || !this.config.privateKey) {
      // Mark as UNKNOWN if we can't execute
      return {
        status: "UNKNOWN",
        paymentId: guardResult.paymentId,
        reason: "missing_hedera_credentials",
      }
    }

    // In real implementation, would execute with Hedera SDK:
    // const transactionId = await this.executePayment(intent)

    // For now, return UNKNOWN to indicate execution would happen here
    return {
      status: "UNKNOWN",
      paymentId: guardResult.paymentId,
      reason: "execution_not_implemented_requires_credentials",
    }
  }

  /**
   * Verify a payment after timeout or on retry
   * Returns CONFIRMED only when mirror node shows the exact payment
   */
  async verifyPayment(
    paymentId: string,
    transactionId: string,
  ): Promise<X402PaymentStatus> {
    if (!this.config.verifier) {
      return {
        status: "UNKNOWN",
        paymentId,
        reason: "verifier_not_configured",
      }
    }

    // Get intent from pending payments
    const intent = this.pendingPayments.get(paymentId)
    if (!intent) {
      return {
        status: "UNKNOWN",
        paymentId,
        reason: "payment_intent_not_found",
      }
    }

    // Verify with mirror node
    const result = await this.config.verifier.verifyPayment(transactionId, {
      tokenId: intent.asset === "HBAR" ? "HBAR" : "0.0.429274", // USDC token ID
      recipient: intent.recipient,
      amount: intent.amount,
      memo: intent.memo,
    })

    // Log verification result to HCS
    if (this.config.auditLog && result.status === "CONFIRMED") {
      const auditEntry = this.config.auditLog.createEntry({
        decision: "CONFIRMED",
        requestId: intent.requestId,
        amount: intent.amount.toString(),
        asset: intent.asset,
        recipient: intent.recipient,
        transactionId,
      })
      // Would submit to HCS in real implementation
    }

    if (result.status === "CONFIRMED") {
      return {
        status: "CONFIRMED",
        paymentId,
        transactionId,
      }
    }

    return {
      status: result.status === "FAILED" ? "FAILED" : "UNKNOWN",
      paymentId,
      reason: result.reason,
      transactionId,
    }
  }

  /**
   * Approve a pending payment (e.g., after World ID verification)
   */
  async approvePayment(paymentId: string): Promise<X402PaymentStatus> {
    const intent = this.pendingPayments.get(paymentId)
    if (!intent) {
      return {
        status: "UNKNOWN",
        paymentId,
        reason: "payment_not_found",
      }
    }

    // Remove approval requirement and execute
    this.pendingPayments.delete(paymentId)
    return this.requestPayment(intent)
  }

  /**
   * Deny a pending payment
   */
  denyPayment(paymentId: string): X402PaymentStatus {
    const intent = this.pendingPayments.get(paymentId)
    if (intent) {
      this.config.guard.rollback(intent)
      this.pendingPayments.delete(paymentId)
    }

    return {
      status: "DENIED",
      paymentId,
      reason: "approval_denied",
    }
  }
}
