#!/usr/bin/env node
/**
 * Hedera testnet setup script
 * Creates HCS audit topic and displays account info
 *
 * Usage:
 *   export HEDERA_TESTNET_ACCOUNT_ID=0.0.12345
 *   export HEDERA_TESTNET_PRIVATE_KEY=302e...
 *   bun run scripts/setup-testnet.ts
 */

import { createAuditTopic, getAccountBalance } from "../src/index"

async function main() {
  console.log("🔧 Hedera Testnet Setup\n")

  const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID
  const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY

  if (!accountId || !privateKey) {
    console.error("❌ Missing required environment variables:")
    if (!accountId) console.error("   - HEDERA_TESTNET_ACCOUNT_ID")
    if (!privateKey) console.error("   - HEDERA_TESTNET_PRIVATE_KEY")
    console.error("\nGet a free testnet account at: https://portal.hedera.com")
    console.error("Then run:")
    console.error('  export HEDERA_TESTNET_ACCOUNT_ID="your-account-id"')
    console.error('  export HEDERA_TESTNET_PRIVATE_KEY="your-private-key"')
    process.exit(1)
  }

  console.log(`✅ Account ID: ${accountId}\n`)

  // Check balance
  console.log("📊 Checking account balance...")
  const balance = await getAccountBalance({ accountId, privateKey })
  console.log(`   HBAR: ${balance.hbar}`)
  if (Object.keys(balance.tokens).length > 0) {
    console.log("   Tokens:")
    for (const [tokenId, amount] of Object.entries(balance.tokens)) {
      console.log(`     ${tokenId}: ${amount}`)
    }
  } else {
    console.log("   No tokens found")
  }
  console.log()

  // Create HCS topic
  console.log("📝 Creating HCS audit topic...")
  const topic = await createAuditTopic({
    accountId,
    privateKey,
    memo: "Railguard Testnet Audit Log",
  })
  console.log(`✅ Topic created: ${topic.topicId}`)
  console.log(`   Memo: ${topic.memo}`)
  console.log()

  // Display next steps
  console.log("✨ Setup complete!\n")
  console.log("Add this to your environment:")
  console.log(`export HEDERA_HCS_TOPIC_ID="${topic.topicId}"`)
  console.log()
  console.log("View your topic on HashScan:")
  console.log(`https://hashscan.io/testnet/topic/${topic.topicId}`)
  console.log()
  console.log("Next steps:")
  console.log("1. Run integration tests:")
  console.log("   export RUN_HEDERA_INTEGRATION=1")
  console.log("   bun test packages/rails/hedera/src/integration.test.ts")
  console.log()
  console.log("2. Run the demo:")
  console.log("   bun run packages/rails/hedera/scripts/testnet-demo.ts")
  console.log()
}

main().catch((error) => {
  console.error("❌ Error:", error.message)
  process.exit(1)
})
