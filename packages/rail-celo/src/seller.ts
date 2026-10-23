/**
 * Minimal x402 v2 resource server (seller) for Celo Sepolia, used by the demo's paid data services.
 * Flow per the spec's default `authorization` flow: verify -> run handler -> settle -> respond.
 * Advertises `payment-identifier` (idempotency: same id + same payload => cached response, different
 * payload => 409) and, when configured, the ERC-8021 `builder-code` extension.
 */
import { createHash } from "node:crypto"
import type { Address } from "viem"
import { CELO_SEPOLIA } from "./chain"
import { isBuilderCode } from "./erc8021"
import type { FacilitatorClient } from "./simulator"
import {
  HEADER_PAYMENT_REQUIRED,
  HEADER_PAYMENT_RESPONSE,
  HEADER_PAYMENT_SIGNATURE,
  HEADER_X_PAYMENT,
  PAYMENT_IDENTIFIER_SCHEMA,
  type PaymentPayload,
  type PaymentRequired,
  type PaymentRequirements,
  decodeX402Header,
  encodeX402Header,
} from "./x402"

export interface SellerRoute {
  path: string
  /** USDC atomic units (6 decimals). */
  amount: string
  description: string
  handler: (url: URL) => Record<string, unknown>
  /** Demo-only overrides used to model a spoofed payee or a mainnet ask. */
  payToOverride?: Address | undefined
  networkOverride?: string | undefined
}

export function createX402Seller(options: {
  payTo: Address
  facilitator: FacilitatorClient
  routes: SellerRoute[]
  serviceName?: string | undefined
  builderCode?: string | undefined
}) {
  const cache = new Map<
    string,
    { fingerprint: string; status: number; body: string; headers: Record<string, string> }
  >()
  const stats = { paid: 0, refused: 0, cached: 0 }

  function requirementsFor(route: SellerRoute): PaymentRequirements {
    return {
      scheme: "exact",
      network: route.networkOverride ?? CELO_SEPOLIA.caip2,
      amount: route.amount,
      asset: CELO_SEPOLIA.usdc.address,
      payTo: route.payToOverride ?? options.payTo,
      maxTimeoutSeconds: 120,
      extra: { name: CELO_SEPOLIA.usdc.name, version: CELO_SEPOLIA.usdc.version },
    }
  }

  function paymentRequired(url: URL, route: SellerRoute, error: string): Response {
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
          info: { required: false },
          schema: PAYMENT_IDENTIFIER_SCHEMA as unknown as Record<string, unknown>,
        },
        ...(isBuilderCode(options.builderCode)
          ? { "builder-code": { info: { a: options.builderCode } } }
          : {}),
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
    const payload = decodeX402Header<PaymentPayload>(header)
    if (!payload?.payload?.authorization)
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
    const pid = (
      payload.extensions?.["payment-identifier"] as { info?: { id?: string } } | undefined
    )?.info?.id
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([req, url.pathname, payload.payload.authorization]))
      .digest("hex")
    if (pid) {
      const hit = cache.get(pid)
      if (hit && hit.fingerprint !== fingerprint)
        return new Response(
          JSON.stringify({ error: "payment-identifier reused with a different payload" }),
          { status: 409 },
        )
      if (hit) {
        stats.cached += 1
        return new Response(hit.body, { status: hit.status, headers: hit.headers })
      }
    }
    const verified = await options.facilitator.verify(payload, req)
    if (!verified.isValid) {
      stats.refused += 1
      const res = paymentRequired(
        url,
        route,
        `verify failed: ${verified.invalidReason ?? "invalid"}`,
      )
      res.headers.set("x-railguard-stage", "verify")
      return res
    }
    const data = route.handler(url)
    const settlement = await options.facilitator.settle(payload, req)
    if (!settlement.success) {
      stats.refused += 1
      const res = paymentRequired(url, route, `settle failed: ${settlement.errorReason ?? "error"}`)
      res.headers.set("x-railguard-stage", "settle")
      return res
    }
    stats.paid += 1
    const headers = {
      "content-type": "application/json",
      [HEADER_PAYMENT_RESPONSE]: encodeX402Header(settlement),
    }
    const body = JSON.stringify({
      ...data,
      paid: { tx: settlement.transaction, network: settlement.network },
    })
    if (pid) cache.set(pid, { fingerprint, status: 200, body, headers })
    return new Response(body, { status: 200, headers })
  }

  return { fetch: handle, stats, requirementsFor }
}
