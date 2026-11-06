#!/usr/bin/env node
/**
 * Hedera testnet demo script
 * Demonstrates guard → execute → verify flow
 *
 * REQUIRES:
 * - HEDERA_TESTNET_ACCOUNT_ID
 * - HEDERA_TESTNET_PRIVATE_KEY
 * - HEDERA_HCS_TOPIC_ID
 *
 * This script shows the flow but cannot execute without credentials.
 * Prasanth must implement actual transaction execution.
 */

import {
  HederaPaymentGuard,
  HcsAuditLog,
  createHederaTestnetVerifier,
  X402GuardedClient,
} from "../src/index"

async function main() {
  console.log("🚀 Hedera Testnet Demo\n")

  // Check for required credentials
  const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID
  const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY
  const topicId = process.env.HEDERA_HCS_TOPIC_ID

  if (!accountId || !privateKey || !topicId) {
    console.error("❌ Missing required environment variables:")
    if (!accountId) console.error("   - HEDERA_TESTNET_ACCOUNT_ID")
    if (!privateKey) console.error("   - HEDERA_TESTNET_PRIVATE_KEY")
    if (!topicId) console.error("   - HEDERA_HCS_TOPIC_ID")
    console.error("\nSee packages/rails/hedera/README.md for setup instructions.\n")
    process.exit(1)
  }

  console.log("✅ Credentials found\n")

  // Initialize guard with policy
  const guard = new HederaPaymentGuard({
    totalBudget: 10_000_000n, // 10 USDC
    perMerchantLimit: 3_000_000n, // 3 USDC per merchant
    recipientAllowlist: [
      "0.0.12345", // Example merchant A
      "0.0.67890", // Example merchant B
    ],
    approvalThreshold: 5_000_000n, // 5 USDC
  })

  // Initialize audit log
  const auditLog = new HcsAuditLog({
    topicId,
    accountId,
    privateKey,
  })

  // Initialize verifier
  const verifier = createHederaTestnetVerifier()

  // Initialize client
  const client = new X402GuardedClient({
    guard,
    auditLog,
    verifier,
    accountId,
    privateKey,
  })

  console.log("📋 Policy:")
  console.log(`   Total budget: 10 USDC`)
  console.log(`   Per-merchant limit: 3 USDC`)
  console.log(`   Approval threshold: 5 USDC`)
  console.log(`   Allowed merchants: ${guard["policy"].recipientAllowlist.join(", ")}\n`)

  // Demo 1: Small payment (allowed)
  console.log("💳 Demo 1: Small payment within policy")
  const payment1 = await client.requestPayment({
    requestId: "req_demo_001",
    recipient: "0.0.12345",
    amount: 1_000_000n, // 1 USDC
    asset: "USDC",
    memo: "railguard_demo_001",
  })
  console.log(`   Result: ${payment1.status}`)
  console.log(`   Payment ID: ${payment1.paymentId}`)
  if (payment1.reason) console.log(`   Reason: ${payment1.reason}`)
  console.log()

  // Demo 2: Payment to non-allowlisted recipient (denied)
  console.log("❌ Demo 2: Payment to non-allowlisted recipient")
  const payment2 = await client.requestPayment({
    requestId: "req_demo_002",
    recipient: "0.0.99999", // Not on allowlist
    amount: 1_000_000n,
    asset: "USDC",
  })
  console.log(`   Result: ${payment2.status}`)
  console.log(`   Reason: ${payment2.reason}`)
  console.log()

  // Demo 3: Large payment (requires approval)
  console.log("⚠️  Demo 3: Large payment requiring approval")
  const payment3 = await client.requestPayment({
    requestId: "req_demo_003",
    recipient: "0.0.12345",
    amount: 6_000_000n, // 6 USDC, exceeds 5 USDC threshold
    asset: "USDC",
  })
  console.log(`   Result: ${payment3.status}`)
  console.log(`   Reason: ${payment3.reason}`)
  console.log()

  console.log("📊 Budget status:")
  const status = guard.getStatus()
  console.log(`   Spent: ${status.spentBudget} (${Number(status.spentBudget) / 1_000_000} USDC)`)
  console.log(`   Remaining: ${status.remainingBudget} (${Number(status.remainingBudget) / 1_000_000} USDC)`)
  console.log()

  console.log("✨ Demo complete!")
  console.log("\n⚠️  NOTE: Actual transaction execution not implemented.")
  console.log("Status is UNKNOWN because @hashgraph/sdk integration is needed.")
  console.log("See README.md for implementation steps.\n")
}

main().catch(console.error)
