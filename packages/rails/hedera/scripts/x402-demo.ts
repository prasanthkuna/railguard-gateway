/**
 * x402 demo with HBAR payments (100,000 tinybars = 0.001 HBAR)
 * 
 * Dry run (no credentials, mock key, verifies 402 format):
 *   X402_DEMO_DRY_RUN=1 bun run scripts/x402-demo.ts
 * 
 * Live testnet (requires real credentials - NOT IMPLEMENTED YET):
 *   HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx \
 *   HEDERA_TESTNET_PRIVATE_KEY=302e... \
 *   bun run scripts/x402-demo.ts
 */

import { createX402RealServer } from "../src/index.js"

const DRY_RUN = process.env.X402_DEMO_DRY_RUN === "1"
const MOCK_ACCOUNT_ID = "0.0.12345"

if (!DRY_RUN) {
  console.error("❌ Live testnet demo not implemented yet")
  console.error("   Run dry-run mode: X402_DEMO_DRY_RUN=1 bun run scripts/x402-demo.ts")
  process.exit(1)
}

console.log("🚀 x402 Demo (DRY RUN - MOCK)")
console.log(`   Account: ${MOCK_ACCOUNT_ID}`)
console.log(`   Network: hedera:testnet`)
console.log(`   Price: 100,000 tinybars (0.001 HBAR)`)
console.log()

// Create x402 server with HBAR payment route
// IMPORTANT: price must be object {amount, asset} for HBAR support
const server = createX402RealServer({
  payTo: MOCK_ACCOUNT_ID,
  routes: [
    {
      path: "/data",
      price: { amount: "100000", asset: "0.0.0" }, // 100,000 tinybars HBAR
      description: "Protected demo resource",
      handler: async () => ({
        message: "✅ Payment successful!",
        data: "This is the protected resource",
      }),
    },
  ],
})

// Start server
const PORT = 3000
console.log(`📡 Starting server on http://localhost:${PORT}/data`)

const httpServer = Bun.serve({
  port: PORT,
  fetch: async (request) => {
    try {
      return await server.handle(request)
    } catch (error) {
      console.error("Server error:", error)
      throw error
    }
  },
})

console.log(`✅ Server ready\n`)
await new Promise((resolve) => setTimeout(resolve, 100))

try {
  console.log("🔍 DRY RUN: Fetching /data to verify 402 response...")
  
  const response = await fetch(`http://localhost:${PORT}/data`)
  
  if (response.status !== 402) {
    console.error(`❌ Expected status 402, got ${response.status}`)
    process.exit(1)
  }
  
  // Parse PAYMENT-REQUIRED header (base64-encoded JSON)
  const paymentRequiredHeader = response.headers.get("payment-required")
  if (!paymentRequiredHeader) {
    console.error("❌ Missing PAYMENT-REQUIRED header")
    process.exit(1)
  }
  
  const paymentRequired = JSON.parse(Buffer.from(paymentRequiredHeader, "base64url").toString("utf8"))
  const accept = paymentRequired.accepts?.[0]
  
  if (!accept) {
    console.error("❌ No payment option in PAYMENT-REQUIRED header")
    console.error("Parsed header:", paymentRequired)
    process.exit(1)
  }
  
  console.log("✅ 402 Payment Required response:")
  console.log(`   Scheme: ${accept.scheme}`)
  console.log(`   Network: ${accept.network}`)
  console.log(`   Asset: ${accept.asset}`)
  console.log(`   Amount: ${accept.amount} tinybars`)
  console.log(`   PayTo: ${accept.payTo}`)
  
  // Verify exact values
  if (accept.asset !== "0.0.0") {
    console.error(`❌ Expected asset 0.0.0 (HBAR), got ${accept.asset}`)
    process.exit(1)
  }
  
  if (accept.amount !== "100000") {
    console.error(`❌ Expected amount 100000, got ${accept.amount}`)
    process.exit(1)
  }
  
  if (accept.network !== "hedera:testnet") {
    console.error(`❌ Expected network hedera:testnet, got ${accept.network}`)
    process.exit(1)
  }
  
  console.log()
  console.log("✅ DRY RUN PASSED")
  console.log("   - Server returns 402 with correct HBAR payment requirements")
  console.log("   - Asset: 0.0.0 (HBAR native token)")
  console.log("   - Amount: 100,000 tinybars (0.001 HBAR)")
  console.log("   - Network: hedera:testnet")
  
  process.exit(0)
} catch (error) {
  console.error()
  console.error("❌ Error:", error)
  process.exit(1)
} finally {
  httpServer.stop()
}
