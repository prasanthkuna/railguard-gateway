#!/usr/bin/env node
/**
 * Verify a Hedera testnet transaction
 *
 * Usage:
 *   bun run scripts/testnet-verify.ts <transaction-id> <recipient> <amount>
 *
 * Example:
 *   bun run scripts/testnet-verify.ts "0.0.12345@1635360000.123456789" "0.0.67890" "1000000"
 */

import { createHederaTestnetVerifier } from "../src/index"

async function main() {
  const [transactionId, recipient, amountStr] = process.argv.slice(2)

  if (!transactionId || !recipient || !amountStr) {
    console.error("Usage: testnet-verify.ts <transaction-id> <recipient> <amount>")
    console.error('\nExample: testnet-verify.ts "0.0.12345@1635360000.123456789" "0.0.67890" "1000000"')
    process.exit(1)
  }

  const amount = BigInt(amountStr)
  const verifier = createHederaTestnetVerifier()

  console.log("🔍 Verifying Hedera testnet transaction\n")
  console.log(`Transaction ID: ${transactionId}`)
  console.log(`Expected recipient: ${recipient}`)
  console.log(`Expected amount: ${amount} (${Number(amount) / 1_000_000} USDC)\n`)

  const result = await verifier.verifyPayment(transactionId, {
    tokenId: "0.0.429274", // Testnet USDC
    recipient,
    amount,
  })

  console.log(`Status: ${result.status}`)
  if (result.reason) {
    console.log(`Reason: ${result.reason}`)
  }

  if (result.facts) {
    console.log("\n📋 Transaction Facts:")
    console.log(`   Consensus timestamp: ${result.facts.consensusTimestamp}`)
    console.log(`   Result: ${result.facts.result}`)
    console.log(`   Charged fee: ${result.facts.chargedTxFee} tinybars`)

    if (result.facts.transfers.length > 0) {
      console.log("\n   Token Transfers:")
      for (const transfer of result.facts.transfers) {
        console.log(`     ${transfer.account}: ${transfer.amount} of ${transfer.tokenId}`)
      }
    }

    if (result.facts.memo) {
      console.log(`\n   Memo: ${result.facts.memo}`)
    }
  }

  console.log()
  if (result.status === "CONFIRMED") {
    console.log("✅ Payment CONFIRMED: all facts match")
  } else {
    console.log("❌ Payment NOT CONFIRMED")
  }
}

main().catch(console.error)
