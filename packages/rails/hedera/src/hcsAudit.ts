/**
 * Hedera Consensus Service (HCS) audit log
 *
 * Each spend decision (ALLOW / DENY / UNKNOWN / CONFIRMED) is written to an HCS topic
 * as a hash-chained log entry. This provides a tamper-evident audit trail that anyone
 * can verify via the Hedera mirror node.
 *
 * Chain format: each message contains sha256(prevHash + timestamp + decision + details)
 */

import { createHash } from "node:crypto"
import {
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk"

export interface HcsAuditEntry {
  timestamp: string
  decision: "ALLOW" | "DENY" | "UNKNOWN" | "CONFIRMED" | "APPROVAL_REQUIRED"
  requestId: string
  amount: string
  asset: string
  recipient: string
  reason?: string
  transactionId?: string
  /** Previous entry hash for chain verification */
  prevHash: string
  /** Current entry hash */
  hash: string
}

export interface HcsAuditConfig {
  topicId: string
  /** Hedera account that submits messages */
  accountId: string
  /** Private key for signing (only needed when actually submitting) */
  privateKey?: string
}

export class HcsAuditLog {
  private lastHash = "genesis"

  constructor(private config: HcsAuditConfig) {}

  /**
   * Create an audit entry (does not submit to HCS yet)
   */
  createEntry(params: {
    decision: HcsAuditEntry["decision"]
    requestId: string
    amount: string
    asset: string
    recipient: string
    reason?: string
    transactionId?: string
  }): HcsAuditEntry {
    const timestamp = new Date().toISOString()
    const prevHash = this.lastHash

    // Create hash: sha256(prevHash + timestamp + decision + requestId + amount + recipient)
    const dataToHash = JSON.stringify({
      prevHash,
      timestamp,
      decision: params.decision,
      requestId: params.requestId,
      amount: params.amount,
      asset: params.asset,
      recipient: params.recipient,
      reason: params.reason,
      transactionId: params.transactionId,
    })

    const hash = createHash("sha256").update(dataToHash).digest("hex")
    this.lastHash = hash

    return {
      timestamp,
      decision: params.decision,
      requestId: params.requestId,
      amount: params.amount,
      asset: params.asset,
      recipient: params.recipient,
      reason: params.reason,
      transactionId: params.transactionId,
      prevHash,
      hash,
    }
  }

  /**
   * Submit entry to HCS topic (requires Hedera SDK and credentials)
   * Returns transaction ID on success
   */
  async submitEntry(entry: HcsAuditEntry): Promise<string> {
    if (!this.config.privateKey) {
      throw new Error("HCS submission requires HEDERA_TESTNET_PRIVATE_KEY environment variable")
    }

    const client = Client.forTestnet()
    const operatorKey = PrivateKey.fromStringED25519(this.config.privateKey)
    const operatorId = AccountId.fromString(this.config.accountId)
    client.setOperator(operatorId, operatorKey)

    try {
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(this.config.topicId)
        .setMessage(JSON.stringify(entry))

      const response = await transaction.execute(client)
      const receipt = await response.getReceipt(client)

      return response.transactionId.toString()
    } finally {
      client.close()
    }
  }

  /**
   * Verify audit chain integrity by checking hashes
   */
  verifyChain(entries: HcsAuditEntry[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const expectedPrev = i === 0 ? "genesis" : entries[i - 1].hash

      if (entry.prevHash !== expectedPrev) {
        errors.push(`Entry ${i} prevHash mismatch: expected ${expectedPrev}, got ${entry.prevHash}`)
      }

      // Recompute hash
      const dataToHash = JSON.stringify({
        prevHash: entry.prevHash,
        timestamp: entry.timestamp,
        decision: entry.decision,
        requestId: entry.requestId,
        amount: entry.amount,
        asset: entry.asset,
        recipient: entry.recipient,
        reason: entry.reason,
        transactionId: entry.transactionId,
      })

      const computedHash = createHash("sha256").update(dataToHash).digest("hex")
      if (computedHash !== entry.hash) {
        errors.push(`Entry ${i} hash mismatch: expected ${entry.hash}, computed ${computedHash}`)
      }
    }

    return { valid: errors.length === 0, errors }
  }
}

/**
 * Create HCS audit log for testnet (requires topic ID from env)
 */
export function createHcsAuditLog(): HcsAuditLog {
  const topicId = process.env.HEDERA_HCS_TOPIC_ID
  const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID
  const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY

  if (!topicId || !accountId) {
    throw new Error("HCS audit log requires HEDERA_HCS_TOPIC_ID and HEDERA_TESTNET_ACCOUNT_ID")
  }

  return new HcsAuditLog({ topicId, accountId, privateKey })
}
