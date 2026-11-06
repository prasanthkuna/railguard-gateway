/**
 * x402 v2 HTTP server for Hedera testnet.
 * Returns 402 Payment Required with PAYMENT-REQUIRED header per x402 v2 spec.
 * Verifies Hedera transactions via mirror node, prevents replay attacks.
 * Reference: https://github.com/Standard-Digital-Labs/x402
 */
import { createHash } from "node:crypto"
import type { HederaPaymentVerifier } from "./verifier.js"
import type { PaymentIntent } from "./types.js"

export const HEADER_PAYMENT_REQUIRED = "PAYMENT-REQUIRED"
export const HEADER_PAYMENT_SIGNATURE = "PAYMENT-SIGNATURE"
export const HEADER_X_PAYMENT = "X-PAYMENT"

export interface HederaPaymentRequirements {
  scheme: "hedera"
  network: "hedera-testnet" | "hedera-mainnet"
  amount: string // tinybars for HBAR, atomic units for HTS
  asset: string // "HBAR" or "0.0.xxxxx"
  payTo: string // recipient account ID
  maxTimeoutSeconds: number
  extra?: Record<string, unknown>
}

export interface ResourceInfo {
  url: string
  description?: string
  mimeType?: string
  serviceName?: string
}

export interface PaymentRequired {
  x402Version: 2
  error?: string
  resource: ResourceInfo
  accepts: HederaPaymentRequirements[]
  extensions?: Record<string, { info: Record<string, unknown>; schema?: Record<string, unknown> }>
}

export interface HederaPaymentPayload {
  x402Version: 2
  resource?: ResourceInfo
  accepted: HederaPaymentRequirements
  payload: {
    transactionId: string
    requestId: string
    memo?: string
  }
  extensions?: Record<string, unknown>
}

export interface X402Route {
  path: string
  amount: string // atomic units
  asset: string
  description: string
  handler: (url: URL) => Record<string, unknown> | Promise<Record<string, unknown>>
}

export function encodeX402Header(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64")
}

export function decodeX402Header<T>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as T
  } catch {
    return null
  }
}

/**
 * Creates an x402 v2 HTTP server for Hedera testnet.
 * Returns 402 with payment challenge, verifies transaction, returns protected resource.
 */
export function createX402Server(options: {
  payTo: string
  verifier: HederaPaymentVerifier
  routes: X402Route[]
  serviceName?: string
  network?: "hedera-testnet" | "hedera-mainnet"
}) {
  const cache = new Map<
    string,
    { fingerprint: string; status: number; body: string; headers: Record<string, string> }
  >()
  const stats = { paid: 0, refused: 0, cached: 0 }

  function requirementsFor(route: X402Route): HederaPaymentRequirements {
    return {
      scheme: "hedera",
      network: options.network ?? "hedera-testnet",
      amount: route.amount,
      asset: route.asset,
      payTo: options.payTo,
      maxTimeoutSeconds: 120,
    }
  }

  function paymentRequired(url: URL, route: X402Route, error: string): Response {
    const body: PaymentRequired = {
      x402Version: 2,
      error,
      resource: {
        url: url.toString(),
        description: route.description,
        mimeType: "application/json",
        serviceName: options.serviceName,
      },
      accepts: [requirementsFor(route)],
      extensions: {
        "payment-identifier": {
          info: { required: true },
          schema: {
            type: "object",
            properties: {
              required: { type: "boolean" },
              id: { type: "string", minLength: 16, maxLength: 128 },
            },
            required: ["required", "id"],
          },
        },
      },
    }
    return new Response(JSON.stringify(body), {
      status: 402,
      headers: {
        "content-type": "application/json",
        [HEADER_PAYMENT_REQUIRED]: encodeX402Header(body),
      },
    })
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const route = options.routes.find((r) => r.path === url.pathname)
    if (!route) return new Response(JSON.stringify({ error: "not found" }), { status: 404 })

    const header =
      request.headers.get(HEADER_PAYMENT_SIGNATURE) ?? request.headers.get(HEADER_X_PAYMENT)
    if (!header)
      return paymentRequired(url, route, `${HEADER_PAYMENT_SIGNATURE} header is required`)

    const payload = decodeX402Header<HederaPaymentPayload>(header)
    if (!payload?.payload?.transactionId)
      return paymentRequired(url, route, "malformed payment payload")

    const req = requirementsFor(route)
    const accepted = payload.accepted
    if (
      !accepted ||
      accepted.network !== req.network ||
      accepted.asset.toLowerCase() !== req.asset.toLowerCase() ||
      accepted.payTo.toLowerCase() !== req.payTo.toLowerCase() ||
      accepted.amount !== req.amount
    ) {
      stats.refused += 1
      return paymentRequired(url, route, "accepted requirements do not match this resource")
    }

    // Get payment-identifier from extensions (replay protection)
    const pid = (
      payload.extensions?.["payment-identifier"] as { info?: { id?: string } } | undefined
    )?.info?.id
    if (!pid) {
      stats.refused += 1
      return paymentRequired(url, route, "payment-identifier is required")
    }

    // Calculate fingerprint binding request to payment
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([req, url.pathname, payload.payload.transactionId]))
      .digest("hex")

    // Check cache for replay
    const hit = cache.get(pid)
    if (hit && hit.fingerprint !== fingerprint) {
      return new Response(
        JSON.stringify({ error: "payment-identifier reused with a different payload" }),
        { status: 409 },
      )
    }
    if (hit) {
      stats.cached += 1
      return new Response(hit.body, { status: hit.status, headers: hit.headers })
    }

    // Build intent for verification
    const intent: PaymentIntent = {
      requestId: payload.payload.requestId,
      recipient: req.payTo,
      amount: BigInt(req.amount),
      asset: req.asset,
      memo: payload.payload.memo ?? `x402:${url.pathname}`,
    }

    // Verify transaction on Hedera mirror node
    const verified = await options.verifier.verifyTransaction(
      payload.payload.transactionId,
      intent,
    )

    if (verified.status !== "SUCCESS") {
      stats.refused += 1
      return paymentRequired(
        url,
        route,
        `verification failed: ${verified.status} ${verified.error ?? ""}`,
      )
    }

    // Execute handler and return protected resource
    const data = await route.handler(url)
    const body = JSON.stringify(data)
    const headers = { "content-type": "application/json" }
    const status = 200

    // Cache successful response
    cache.set(pid, { fingerprint, status, body, headers })
    stats.paid += 1

    return new Response(body, { status, headers })
  }

  return {
    handle,
    stats: () => ({ ...stats }),
    clearCache: () => cache.clear(),
  }
}
