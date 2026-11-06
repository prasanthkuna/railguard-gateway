/**
 * Integration tests for Hedera testnet rail
 * These tests require actual Hedera testnet credentials
 *
 * To run:
 *   export HEDERA_TESTNET_ACCOUNT_ID=0.0.12345
 *   export HEDERA_TESTNET_PRIVATE_KEY=302e...
 *   export HEDERA_HCS_TOPIC_ID=0.0.67890  (optional, will create if missing)
 *   export RUN_HEDERA_INTEGRATION=1
 *   bun test src/integration.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test"
import {
  HederaPaymentGuard,
  HcsAuditLog,
  X402GuardedClient,
  createHederaTestnetVerifier,
  createAuditTopic,
  getAccountBalance,
} from "./index"

const shouldRun = process.env.RUN_HEDERA_INTEGRATION === "1"
const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID
const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY
let topicId = process.env.HEDERA_HCS_TOPIC_ID

describe.skipIf(!shouldRun || !accountId || !privateKey)("Hedera Integration Tests", () => {
  beforeAll(async () => {
    if (!accountId || !privateKey) return

    // Create topic if not provided
    if (!topicId) {
      console.log("Creating HCS audit topic...")
      const topic = await createAuditTopic({
        accountId,
        privateKey,
        memo: "Railguard Integration Test Audit Log",
      })
      topicId = topic.topicId
      console.log(`Created topic: ${topicId}`)
    }

    // Check account balance
    const balance = await getAccountBalance({ accountId, privateKey })
    console.log(`Account balance: ${balance.hbar} HBAR`)
    console.log("Tokens:", balance.tokens)
  })

  it("executes HBAR payment and verifies on chain", async () => {
    if (!accountId || !privateKey || !topicId) {
      throw new Error("Missing credentials")
    }

    const guard = new HederaPaymentGuard({
      totalBudget: 100_000_000n, // 1 HBAR in tinybars
      perMerchantLimit: 50_000_000n,
      recipientAllowlist: [accountId], // Send to self for testing
      approvalThreshold: 80_000_000n,
    })

    const auditLog = new HcsAuditLog({
      topicId,
      accountId,
      privateKey,
    })

    const verifier = createHederaTestnetVerifier()

    const client = new X402GuardedClient({
      guard,
      auditLog,
      verifier,
      accountId,
      privateKey,
    })

    // Request small HBAR payment
    const requestId = `integration_test_${Date.now()}`
    const result = await client.requestPayment({
      requestId,
      recipient: accountId, // Send to self
      amount: 10_000_000n, // 0.1 HBAR
      asset: "HBAR",
      memo: `railguard_test_${requestId}`,
    })

    expect(result.status).toBe("UNKNOWN") // UNKNOWN until verified
    expect(result.transactionId).toBeTruthy()
    console.log(`Transaction ID: ${result.transactionId}`)

    // Wait for consensus
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Verify payment
    if (!result.transactionId) {
      throw new Error("Transaction ID missing")
    }
    const verifyResult = await client.verifyPayment(result.paymentId, result.transactionId)

    expect(verifyResult.status).toBe("CONFIRMED")
    console.log(`Payment CONFIRMED: ${result.transactionId}`)
  }, 30000)

  it("denies payment to non-allowlisted recipient", async () => {
    if (!accountId || !privateKey || !topicId) {
      throw new Error("Missing credentials")
    }

    const guard = new HederaPaymentGuard({
      totalBudget: 100_000_000n,
      perMerchantLimit: 50_000_000n,
      recipientAllowlist: [accountId],
    })

    const client = new X402GuardedClient({
      guard,
      accountId,
      privateKey,
    })

    const result = await client.requestPayment({
      requestId: `deny_test_${Date.now()}`,
      recipient: "0.0.99999", // Not on allowlist
      amount: 10_000_000n,
      asset: "HBAR",
    })

    expect(result.status).toBe("DENIED")
    expect(result.reason).toBe("recipient_not_on_allowlist")
    expect(result.transactionId).toBeUndefined()
  })

  it("prevents duplicate payment with same request ID", async () => {
    if (!accountId || !privateKey || !topicId) {
      throw new Error("Missing credentials")
    }

    const guard = new HederaPaymentGuard({
      totalBudget: 100_000_000n,
      perMerchantLimit: 50_000_000n,
      recipientAllowlist: [accountId],
    })

    const client = new X402GuardedClient({
      guard,
      accountId,
      privateKey,
    })

    const requestId = `duplicate_test_${Date.now()}`

    // First payment: should execute
    const result1 = await client.requestPayment({
      requestId,
      recipient: accountId,
      amount: 10_000_000n,
      asset: "HBAR",
    })
    expect(result1.status).toBe("UNKNOWN")
    expect(result1.transactionId).toBeTruthy()

    // Second payment with same request ID: should be denied
    const result2 = await client.requestPayment({
      requestId, // Same request ID
      recipient: accountId,
      amount: 10_000_000n,
      asset: "HBAR",
    })
    expect(result2.status).toBe("DENIED")
    expect(result2.reason).toBe("duplicate_request_id")
    expect(result2.transactionId).toBeUndefined()
  }, 30000)

  it("handles over-budget payment", async () => {
    if (!accountId || !privateKey) {
      throw new Error("Missing credentials")
    }

    const guard = new HederaPaymentGuard({
      totalBudget: 10_000_000n, // Only 0.1 HBAR total
      perMerchantLimit: 10_000_000n,
      recipientAllowlist: [accountId],
    })

    const client = new X402GuardedClient({
      guard,
      accountId,
      privateKey,
    })

    const result = await client.requestPayment({
      requestId: `overbudget_test_${Date.now()}`,
      recipient: accountId,
      amount: 50_000_000n, // 0.5 HBAR, exceeds budget
      asset: "HBAR",
    })

    expect(result.status).toBe("DENIED")
    expect(result.reason).toBe("exceeds_total_budget")
  })
})

describe.skipIf(!shouldRun || !accountId || !privateKey)("HCS Audit Integration", () => {
  it("submits and retrieves audit entries", async () => {
    if (!accountId || !privateKey || !topicId) {
      throw new Error("Missing credentials")
    }

    const auditLog = new HcsAuditLog({
      topicId,
      accountId,
      privateKey,
    })

    const entry = auditLog.createEntry({
      decision: "ALLOW",
      requestId: `audit_test_${Date.now()}`,
      amount: "10000000",
      asset: "HBAR",
      recipient: accountId,
    })

    const transactionId = await auditLog.submitEntry(entry)
    expect(transactionId).toBeTruthy()
    console.log(`Audit entry submitted: ${transactionId}`)

    // Wait for consensus
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log(`View on HashScan: https://hashscan.io/testnet/topic/${topicId}`)
  }, 30000)
})
