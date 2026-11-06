#!/usr/bin/env node
/**
 * Check Hedera testnet account balance
 *
 * Usage:
 *   export HEDERA_TESTNET_ACCOUNT_ID=0.0.12345
 *   export HEDERA_TESTNET_PRIVATE_KEY=302e...
 *   bun run scripts/check-balance.ts
 */

import { getAccountBalance } from "../src/index"

async function main() {
  const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID
  const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY

  if (!accountId || !privateKey) {
    console.error("❌ Missing required environment variables:")
    if (!accountId) console.error("   - HEDERA_TESTNET_ACCOUNT_ID")
    if (!privateKey) console.error("   - HEDERA_TESTNET_PRIVATE_KEY")
    console.error("\nSee TESTNET_SETUP.md for instructions.")
    process.exit(1)
  }

  console.log("🔍 Checking Hedera testnet balance\n")
  console.log(`Account ID: ${accountId}`)

  try {
    const balance = await getAccountBalance({ accountId, privateKey })

    console.log(`\n💰 Balance:`)
    console.log(`   HBAR: ${balance.hbar}`)

    if (Object.keys(balance.tokens).length > 0) {
      console.log(`\n🪙  Tokens:`)
      for (const [tokenId, amount] of Object.entries(balance.tokens)) {
        console.log(`   ${tokenId}: ${amount}`)
      }
    } else {
      console.log(`\n🪙  No HTS tokens`)
    }

    console.log(`\n📊 View on HashScan:`)
    console.log(`   https://hashscan.io/testnet/account/${accountId}`)
    console.log()
  } catch (error) {
    console.error(`\n❌ Error:`, error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
