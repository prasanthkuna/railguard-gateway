/**
 * End-to-end x402 demo using real testnet credentials.
 * Requires HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY env vars.
 * 
 * Flow:
 * 1. Start local x402 server (port 3000)
 * 2. Client fetches protected resource
 * 3. Server returns 402 with Hedera exact scheme (100,000 tinybars / 0.001 HBAR)
 * 4. Client creates payment with guard check
 * 5. Facilitator verifies and settles
 * 6. Server returns resource with PAYMENT-RESPONSE header
 * 7. Mirror node verification
 * 8. Output HashScan URL
 */

import { createX402RealClient, createX402RealServer, fetchX402Resource, HederaPaymentGuard } from "../src/index.js"

const ACCOUNT_ID = process.env.HEDERA_TESTNET_ACCOUNT_ID
const PRIVATE_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY

if (!ACCOUNT_ID || !PRIVATE_KEY) {
  console.error("❌ Missing required environment variables:")
  console.error("   HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx")
  console.error("   HEDERA_TESTNET_PRIVATE_KEY=302e...")
  process.exit(1)
}

console.log("🚀 Starting x402 Demo...")
console.log(`   Account: ${ACCOUNT_ID}`)
console.log(`   Network: hedera:testnet`)
console.log()

// Create guard with reasonable testnet limits
const guard = new HederaPaymentGuard({
  totalBudget: 100_000_000n, // 1 HBAR total
  perMerchantLimit: 10_000_000n, // 0.1 HBAR per merchant
  recipientAllowlist: [
    "0.0.9185802", // Facilitator
    ACCOUNT_ID, // Self (for testing)
  ],
  approvalThreshold: 50_000_000n, // 0.5 HBAR requires approval
})

// Create x402 client
const client = createX402RealClient({
  accountId: ACCOUNT_ID,
  privateKey: PRIVATE_KEY,
  guard,
})

// Create x402 server
const server = createX402RealServer({
  facilitatorUrl: "https://x402.org/facilitator",
  facilitatorAccountId: "0.0.9185802",
})

// Define protected route
const protectedRoute = {
  accepts: {
    scheme: "exact",
    network: "hedera:testnet",
    asset: "0.0.0", // HBAR
    amount: "100000", // 0.001 HBAR in tinybars
    payTo: ACCOUNT_ID, // Pay to self for demo
  },
  description: "Protected demo resource",
  handler: async () => {
    return new Response(
      JSON.stringify({
        message: "✅ Payment successful!",
        data: "This is the protected resource",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    )
  },
}

// Start server
const PORT = 3000
console.log(`📡 Starting server on http://localhost:${PORT}/data`)

const httpServer = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)
    
    if (url.pathname !== "/data") {
      return new Response("Not found", { status: 404 })
    }

    // Process x402 request
    const result = await server.handle(request)
    
    if (result.type === "payment-required") {
      // Return 402 challenge
      return result.response
    }
    
    if (result.type === "payment-verified") {
      // Payment verified, settle and return resource
      const settlementResult = await server.processSettlement(
        result.paymentPayload,
        result.paymentRequirements,
        result.paymentOption,
      )

      if (settlementResult.success) {
        // Call the protected route handler
        const resourceResponse = await protectedRoute.handler()
        const body = await resourceResponse.json()

        // Add PAYMENT-RESPONSE header
        const headers = new Headers(resourceResponse.headers)
        if (settlementResult.settleResponse) {
          const paymentResponse = {
            success: true,
            transaction: settlementResult.settleResponse.transaction,
            network: settlementResult.settleResponse.network,
            payer: settlementResult.settleResponse.payer,
          }
          headers.set("PAYMENT-RESPONSE", Buffer.from(JSON.stringify(paymentResponse)).toString("base64url"))
        }

        return new Response(JSON.stringify(body), {
          status: 200,
          headers,
        })
      }
      
      // Settlement failed
      return new Response("Settlement failed", { status: 402 })
    }
    
    return new Response("Invalid request", { status: 400 })
  },
})

console.log(`✅ Server ready\n`)

// Wait for server to be ready
await new Promise((resolve) => setTimeout(resolve, 100))

try {
  console.log("🔐 Client: Fetching protected resource...")
  
  const result = await fetchX402Resource(
    client,
    `http://localhost:${PORT}/data`,
    {
      requestId: `demo-${Date.now()}`,
      guard,
    },
  )

  console.log()
  console.log("📊 Result:")
  console.log(`   Status: ${result.status}`)
  console.log(`   Paid: ${result.paid}`)
  console.log(`   Payment Status: ${result.paymentStatus}`)
  
  if (result.transactionId) {
    console.log(`   Transaction ID: ${result.transactionId}`)
    console.log(`   HashScan: https://hashscan.io/testnet/transaction/${result.transactionId}`)
  }
  
  if (result.body) {
    console.log(`   Response:`, result.body)
  }

  if (result.paymentStatus === "SETTLED_BY_FACILITATOR") {
    console.log()
    console.log("✅ Demo complete! Payment settled by facilitator.")
    console.log("   Verify transaction on HashScan (may take ~5 seconds to appear)")
    console.log()
    console.log("🔍 Mirror node verification:")
    
    // Optional: Verify via mirror node
    if (result.transactionId) {
      const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions/${result.transactionId}`
      console.log(`   Polling ${mirrorUrl}...`)
      
      // Poll for up to 10 seconds
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        try {
          const mirrorResponse = await fetch(mirrorUrl)
          if (mirrorResponse.ok) {
            const mirrorData = await mirrorResponse.json()
            const tx = mirrorData.transactions?.[0]
            
            if (tx) {
              console.log(`   ✅ Mirror node confirmed: ${tx.result}`)
              console.log(`   Consensus timestamp: ${tx.consensus_timestamp}`)
              break
            }
          }
        } catch (err) {
          // Ignore polling errors
        }
        
        if (i === 9) {
          console.log(`   ⏳ Transaction not yet visible on mirror node (may take longer)`)
        }
      }
    }
  } else {
    console.log()
    console.log("❌ Payment failed or was denied")
  }
} catch (error) {
  console.error()
  console.error("❌ Error:", error)
} finally {
  httpServer.stop()
  console.log()
  console.log("👋 Demo complete")
  process.exit(0)
}
