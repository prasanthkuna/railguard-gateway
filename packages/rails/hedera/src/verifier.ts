/**
 * Hedera payment verifier (testnet only)
 *
 * A payment is CONFIRMED only when the mirror node reports:
 * - result = "SUCCESS"
 * - token transfer matches exact recipient, amount, and tokenId
 * - (optional) sender matches
 * - (optional) memo contains Railguard request ID
 *
 * Anything else is NOT CONFIRMED. Unknown status after timeout is UNKNOWN in Railguard,
 * never "settled" or "failed" without independent evidence.
 */

import type {
  HederaExpectedPayment,
  HederaTransactionFacts,
  HederaVerifyResult,
} from "./types"
import { HederaMirrorNode, type MirrorNodeConfig } from "./mirrorNode"

export interface HederaVerifierConfig {
  mirrorNode: MirrorNodeConfig
}

export class HederaPaymentVerifier {
  private mirrorNode: HederaMirrorNode

  constructor(config: HederaVerifierConfig) {
    this.mirrorNode = new HederaMirrorNode(config.mirrorNode)
  }

  /**
   * Verify a Hedera payment against expected facts
   * @param transactionId Hedera transaction ID (format: "0.0.12345@1635360000.123456789")
   * @param expected Expected payment details
   * @returns Verification result with status and facts
   */
  async verifyPayment(
    transactionId: string,
    expected: HederaExpectedPayment,
  ): Promise<HederaVerifyResult> {
    const tx = await this.mirrorNode.getTransaction(transactionId)

    if (!tx) {
      return {
        status: "NOT_FOUND",
        reason: "transaction_not_found_in_mirror_node",
      }
    }

    // Extract facts from mirror node response
    const facts: HederaTransactionFacts = {
      transactionId: tx.transaction_id,
      consensusTimestamp: tx.consensus_timestamp,
      result: tx.result,
      transfers: (tx.token_transfers ?? []).map((t) => ({
        tokenId: t.token_id,
        account: t.account,
        amount: BigInt(t.amount),
      })),
      hbarTransfers: (tx.transfers ?? []).map((t) => ({
        account: t.account,
        amount: BigInt(t.amount),
      })),
      memo: this.mirrorNode.decodeMemo(tx.memo_base64),
      chargedTxFee: BigInt(tx.charged_tx_fee),
    }

    // Check result SUCCESS
    if (facts.result !== "SUCCESS") {
      return {
        status: "FAILED",
        reason: `transaction_result_${facts.result.toLowerCase()}`,
        facts,
      }
    }

    // For HTS tokens
    if (expected.tokenId !== "HBAR") {
      const recipientTransfer = facts.transfers.find(
        (t) => t.tokenId === expected.tokenId && t.account === expected.recipient,
      )

      if (!recipientTransfer) {
        return {
          status: "RECONCILIATION_REQUIRED",
          reason: "recipient_not_found_in_token_transfers",
          facts,
        }
      }

      if (recipientTransfer.amount !== expected.amount) {
        return {
          status: "RECONCILIATION_REQUIRED",
          reason: "recipient_amount_mismatch",
          facts,
        }
      }

      // Optional: verify sender
      if (expected.sender) {
        const senderTransfer = facts.transfers.find(
          (t) => t.tokenId === expected.tokenId && t.account === expected.sender,
        )
        if (!senderTransfer || senderTransfer.amount !== -expected.amount) {
          return {
            status: "RECONCILIATION_REQUIRED",
            reason: "sender_amount_mismatch",
            facts,
          }
        }
      }
    } else {
      // For HBAR transfers
      const recipientTransfer = facts.hbarTransfers.find(
        (t) => t.account === expected.recipient,
      )

      if (!recipientTransfer) {
        return {
          status: "RECONCILIATION_REQUIRED",
          reason: "recipient_not_found_in_hbar_transfers",
          facts,
        }
      }

      if (recipientTransfer.amount !== expected.amount) {
        return {
          status: "RECONCILIATION_REQUIRED",
          reason: "recipient_amount_mismatch",
          facts,
        }
      }
    }

    // Optional: verify memo
    if (expected.memo && facts.memo !== expected.memo) {
      return {
        status: "RECONCILIATION_REQUIRED",
        reason: "memo_mismatch",
        facts,
      }
    }

    // All checks passed
    return { status: "CONFIRMED", facts }
  }
}

/**
 * Create a verifier for Hedera testnet
 */
export function createHederaTestnetVerifier(): HederaPaymentVerifier {
  return new HederaPaymentVerifier({
    mirrorNode: {
      baseUrl: "https://testnet.mirrornode.hedera.com",
    },
  })
}
