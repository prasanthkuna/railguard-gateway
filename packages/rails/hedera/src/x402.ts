/**
 * Hedera x402 guarded client
 * Pays for x402-protected APIs using Hedera testnet with Railguard policy enforcement
 */

import {
  Client,
  PrivateKey,
  AccountId,
  TransferTransaction,
  TopicMessageSubmitTransaction,
  Hbar,
  Status,
} from "@hashgraph/sdk"
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
      return {
        status: "UNKNOWN",
        paymentId: guardResult.paymentId,
        reason: "missing_hedera_credentials",
      }
    }

    try {
      // Execute payment on Hedera testnet
      const transactionId = await this.executePayment(intent)

      // Log to HCS audit
      if (this.config.auditLog) {
        const auditEntry = this.config.auditLog.createEntry({
          decision: "CONFIRMED",
          requestId: intent.requestId,
          amount: intent.amount.toString(),
          asset: intent.asset,
          recipient: intent.recipient,
          transactionId,
        })
        try {
          await this.submitAuditEntry(auditEntry)
        } catch (error) {
          // Don't fail payment if audit submission fails
          console.warn("HCS audit submission failed:", error)
        }
      }

      // Return UNKNOWN - verification happens separately
      return {
        status: "UNKNOWN",
        paymentId: guardResult.paymentId,
        transactionId,
      }
    } catch (error) {
      // Rollback budget on failure
      this.config.guard.rollback(intent)
      return {
        status: "FAILED",
        paymentId: guardResult.paymentId,
        reason: error instanceof Error ? error.message : "execution_failed",
      }
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

  /**
   * Execute payment on Hedera testnet
   * @private
   */
  private async executePayment(intent: PaymentIntent): Promise<string> {
    if (!this.config.accountId || !this.config.privateKey) {
      throw new Error("Hedera credentials not configured")
    }

    const client = Client.forTestnet()
    const operatorKey = PrivateKey.fromStringED25519(this.config.privateKey)
    const operatorId = AccountId.fromString(this.config.accountId)
    client.setOperator(operatorId, operatorKey)

    try {
      let transaction: TransferTransaction

      if (intent.asset === "HBAR") {
        // HBAR transfer
        transaction = new TransferTransaction()
          .addHbarTransfer(operatorId, new Hbar(-Number(intent.amount) / 100_000_000))
          .addHbarTransfer(intent.recipient, new Hbar(Number(intent.amount) / 100_000_000))
      } else {
        // HTS token transfer (e.g., USDC)
        // Parse token ID from asset (could be "USDC" → "0.0.429274" or direct token ID)
        const tokenId = this.getTokenId(intent.asset)
        
        transaction = new TransferTransaction()
          .addTokenTransfer(tokenId, operatorId, -Number(intent.amount))
          .addTokenTransfer(tokenId, intent.recipient, Number(intent.amount))
      }

      // Add memo if provided
      if (intent.memo) {
        transaction.setTransactionMemo(intent.memo)
      }

      // Execute transaction
      const response = await transaction.execute(client)
      const receipt = await response.getReceipt(client)

      // Check status
      if (receipt.status !== Status.Success) {
        throw new Error(`Transaction failed with status: ${receipt.status.toString()}`)
      }

      return response.transactionId.toString()
    } finally {
      client.close()
    }
  }

  /**
   * Submit audit entry to HCS topic
   * @private
   */
  private async submitAuditEntry(entry: ReturnType<HcsAuditLog["createEntry"]>): Promise<void> {
    if (!this.config.auditLog || !this.config.accountId || !this.config.privateKey) {
      return
    }

    const client = Client.forTestnet()
    const operatorKey = PrivateKey.fromStringED25519(this.config.privateKey)
    const operatorId = AccountId.fromString(this.config.accountId)
    client.setOperator(operatorId, operatorKey)

    try {
      const topicId = this.config.auditLog["config"].topicId
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(JSON.stringify(entry))

      await transaction.execute(client)
    } finally {
      client.close()
    }
  }

  /**
   * Get Hedera token ID from asset name
   * @private
   */
  private getTokenId(asset: string): string {
    // If already a token ID format (0.0.xxxxx), return as-is
    if (/^0\.0\.\d+$/.test(asset)) {
      return asset
    }

    // Map common assets to testnet token IDs
    const tokenMap: Record<string, string> = {
      USDC: "0.0.429274", // Hedera testnet USDC
      // Add more mappings as needed
    }

    const tokenId = tokenMap[asset.toUpperCase()]
    if (!tokenId) {
      throw new Error(`Unknown asset: ${asset}. Provide Hedera token ID in format 0.0.xxxxx`)
    }

    return tokenId
  }
}
