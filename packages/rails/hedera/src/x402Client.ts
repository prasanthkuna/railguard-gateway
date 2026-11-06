/**
 * x402 v2 HTTP client for Hedera testnet.
 * Parses 402 Payment Required challenges and submits Hedera payment proof.
 * Reference: https://github.com/Standard-Digital-Labs/x402
 */
import type { X402GuardedClient } from "./x402.js"
import {
  HEADER_PAYMENT_REQUIRED,
  HEADER_PAYMENT_SIGNATURE,
  type HederaPaymentPayload,
  type HederaPaymentRequirements,
  type PaymentRequired,
  decodeX402Header,
  encodeX402Header,
} from "./x402Server.js"

export interface X402ClientOptions {
  guardedClient: X402GuardedClient
  maxRetries?: number
  retryDelayMs?: number
}

export interface FetchResult {
  status: number
  headers: Headers
  body: unknown
  paid: boolean
  transactionId?: string
}

/**
 * HTTP client that automatically handles 402 Payment Required challenges.
 * Parses payment requirements, executes payment via guarded client, submits proof.
 */
export class X402Client {
  constructor(private options: X402ClientOptions) {}

  /**
   * Fetch a resource, automatically handling 402 payment challenges.
   * Returns the final response after payment (if required).
   */
  async fetch(url: string | URL, init?: RequestInit): Promise<FetchResult> {
    const urlString = url.toString()
    let response = await fetch(urlString, init)

    // If not 402, return immediately
    if (response.status !== 402) {
      return {
        status: response.status,
        headers: response.headers,
        body: await this.parseBody(response),
        paid: false,
      }
    }

    // Parse 402 challenge
    const paymentRequired = this.parsePaymentRequired(response)
    if (!paymentRequired) {
      throw new Error("Malformed 402 response: missing or invalid PAYMENT-REQUIRED header")
    }

    // Find Hedera payment option
    const hederaOption = paymentRequired.accepts.find(
      (opt) => opt.scheme === "hedera" && opt.network.startsWith("hedera-"),
    )
    if (!hederaOption) {
      throw new Error("No Hedera payment option available")
    }

    // Generate request ID from URL + requirements
    const requestId = this.generateRequestId(urlString, hederaOption)

    // Generate payment-identifier (idempotency key)
    const paymentId = `x402_${requestId}_${Date.now()}`

    // Execute payment via guarded client
    const paymentResult = await this.options.guardedClient.requestPayment({
      requestId,
      recipient: hederaOption.payTo,
      amount: BigInt(hederaOption.amount),
      asset: hederaOption.asset,
      memo: `x402:${new URL(urlString).pathname}`,
    })

    if (paymentResult.status === "DENIED") {
      throw new Error(`Payment denied: ${paymentResult.reason ?? "policy violation"}`)
    }

    if (!paymentResult.transactionId) {
      throw new Error(
        `Payment execution failed: status=${paymentResult.status}`,
      )
    }

    // Build payment proof payload
    const payload: HederaPaymentPayload = {
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted: hederaOption,
      payload: {
        transactionId: paymentResult.transactionId,
        requestId,
        memo: `x402:${new URL(urlString).pathname}`,
      },
      extensions: {
        "payment-identifier": {
          info: { required: true, id: paymentId },
        },
      },
    }

    // Retry with payment proof
    const headers = new Headers(init?.headers ?? {})
    headers.set(HEADER_PAYMENT_SIGNATURE, encodeX402Header(payload))

    response = await fetch(urlString, {
      ...init,
      headers,
    })

    return {
      status: response.status,
      headers: response.headers,
      body: await this.parseBody(response),
      paid: true,
      transactionId: paymentResult.transactionId,
    }
  }

  private parsePaymentRequired(response: Response): PaymentRequired | null {
    const header = response.headers.get(HEADER_PAYMENT_REQUIRED)
    return decodeX402Header<PaymentRequired>(header)
  }

  private generateRequestId(url: string, requirements: HederaPaymentRequirements): string {
    const parsed = new URL(url)
    const canonical = `${parsed.pathname}:${requirements.amount}:${requirements.asset}:${requirements.payTo}`
    return Buffer.from(canonical).toString("base64url").slice(0, 32)
  }

  private async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return response.json()
    }
    return response.text()
  }
}

/**
 * Create an x402 client that automatically handles 402 payment challenges.
 */
export function createX402Client(options: X402ClientOptions): X402Client {
  return new X402Client(options)
}
