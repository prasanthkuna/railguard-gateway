/**
 * Real x402 client implementation using official @x402/core and @x402/hedera libraries.
 * Connects to x402.org/facilitator for Hedera testnet payments.
 */
import { x402Client, x402HTTPClient } from "@x402/core/client"
import { ExactHederaScheme, PrivateKey, createClientHederaSigner } from "@x402/hedera"
import type { HederaPaymentGuard } from "./guard.js"

export interface X402RealClientConfig {
  /** Hedera account ID for the payer */
  accountId: string
  /** Private key for signing transactions (ED25519 or ECDSA, testnet only) */
  privateKey: string
  /** Optional payment guard for policy enforcement (REQUIRED for production) */
  guard?: HederaPaymentGuard
  /** Optional network (defaults to hedera:testnet) */
  network?: string
  /** Optional spend controls (defaults to false for testnet ONLY, configure for production) */
  spendControls?: Parameters<typeof x402Client.prototype.setSpendControls>[0]
}

/**
 * Creates a real x402 HTTP client that handles 402 payment challenges.
 * Uses the official x402 libraries with Hedera Exact scheme.
 *
 * IMPORTANT: For production use, always provide a HederaPaymentGuard.
 * spendControls: false is only acceptable for explicit test/demo scenarios.
 */
export function createX402RealClient(config: X402RealClientConfig): x402HTTPClient {
  // Parse private key - use fromStringED25519 for known ED25519 keys, or fromString for auto-detect
  let privateKey: ReturnType<typeof PrivateKey.fromString>
  try {
    // Try ED25519 first (32 bytes hex = 64 chars)
    if (config.privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(config.privateKey)) {
      privateKey = PrivateKey.fromStringED25519(config.privateKey)
    } else {
      // Auto-detect for DER or other formats
      privateKey = PrivateKey.fromString(config.privateKey)
    }
  } catch {
    // Fallback to auto-detect
    privateKey = PrivateKey.fromString(config.privateKey)
  }

  // Create official Hedera signer with proper key handling
  const signer = createClientHederaSigner(config.accountId, privateKey, {
    network: config.network ?? "hedera:testnet",
  })

  // Create Hedera scheme client
  const hederaScheme = new ExactHederaScheme(signer)

  // Create base x402 client with Hedera scheme
  const baseClient = new x402Client()
    .register(config.network ?? "hedera:testnet", hederaScheme)
    .setSpendControls(config.spendControls ?? false)

  // Create HTTP client wrapper
  const httpClient = new x402HTTPClient(baseClient)

  // Add guard hook if provided (MUST check BEFORE createPaymentPayload)
  if (config.guard) {
    httpClient.onPaymentRequired(async (context) => {
      // Find hedera exact payment option
      const hederaOption = context.paymentRequired.accepts.find(
        (opt) => opt.scheme === "exact" && opt.network === (config.network ?? "hedera:testnet"),
      )

      if (!hederaOption) {
        return // No Hedera option available
      }

      // Check with guard BEFORE proceeding to payment
      const guardResult = config.guard!.checkPayment({
        requestId: context.requestUrl,
        recipient: hederaOption.payTo,
        amount: BigInt(hederaOption.amount),
        asset: hederaOption.asset,
      })

      if (guardResult.decision === "DENY") {
        throw new Error(`Payment denied by guard: ${guardResult.reason}`)
      }

      if (guardResult.decision === "APPROVAL_REQUIRED") {
        throw new Error("Payment requires approval (not implemented in client flow)")
      }

      // ALLOW - continue to payment
      return
    })
  }

  return httpClient
}

/**
 * Fetches a protected resource using x402 payment flow.
 * Properly handles 402 challenge, payment creation, and settlement verification.
 */
export async function fetchX402Resource(
  client: x402HTTPClient,
  url: string,
  init?: RequestInit,
): Promise<{
  status: number
  body: unknown
  paid: boolean
  /** Transaction ID from PAYMENT-RESPONSE header (SETTLED) or UNKNOWN */
  paymentStatus: "none" | "paid" | "settled" | "failed"
  transactionId?: string
}> {
  // Initial fetch - may return 402
  let response = await fetch(url, init)

  // If not 402, return directly
  if (response.status !== 402) {
    return {
      status: response.status,
      body: await parseBody(response),
      paid: false,
      paymentStatus: "none",
    }
  }

  // Parse payment required from 402 response
  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => response.headers.get(name),
    await response.clone().json(),
  )

  // Create payment payload (calls signer to create signed transaction)
  const paymentPayload = await client.createPaymentPayload(paymentRequired)

  // Encode payment signature header
  const paymentHeaders = client.encodePaymentSignatureHeader(paymentPayload)

  // Retry with payment
  response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...paymentHeaders,
    },
  })

  // Process payment result (parses PAYMENT-RESPONSE header if present)
  const paymentResult = await client.processPaymentResult(
    paymentPayload,
    (name) => response.headers.get(name),
    response.status,
  )

  // Extract settlement status and transaction ID from PAYMENT-RESPONSE header
  let paymentStatus: "paid" | "settled" | "failed" = "paid"
  let transactionId: string | undefined

  if (paymentResult.settleResponse) {
    // PAYMENT-RESPONSE header was present (server settled the payment)
    if (paymentResult.settleResponse.success) {
      paymentStatus = "settled"
      // Transaction ID comes from the settlement response "transaction" field
      transactionId = paymentResult.settleResponse.transaction
    } else {
      paymentStatus = "failed"
    }
  } else if (response.status === 402) {
    // Still 402 after payment - settlement failed or not completed
    paymentStatus = "failed"
  }

  // Return result
  return {
    status: response.status,
    body: await parseBody(response),
    paid: true,
    paymentStatus,
    transactionId,
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return response.json()
  }
  return response.text()
}
