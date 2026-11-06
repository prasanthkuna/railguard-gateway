/**
 * Real x402 server implementation using official @x402/core and @x402/hedera libraries.
 * Returns 402 Payment Required and verifies payments through facilitator.
 */
import { HTTPFacilitatorClient, x402HTTPResourceServer } from "@x402/core/http"
import { x402ResourceServer } from "@x402/core/server"
import { ExactHederaScheme } from "@x402/hedera/exact/server"

export interface X402RealServerRoute {
  path: string
  /** Price in appropriate units (tinybars for HBAR, token smallest units for HTS) */
  price: string | { amount: string; asset: string }
  description: string
  handler: (request: Request) => Promise<unknown> | unknown
}

export interface X402RealServerConfig {
  /** Recipient account ID for payments */
  payTo: string
  /** Protected routes */
  routes: X402RealServerRoute[]
  /** Facilitator URL (defaults to x402.org) */
  facilitatorUrl?: string
  /** Service name for metadata */
  serviceName?: string
}

/**
 * Creates a real x402 HTTP resource server.
 * Network is enforced to hedera:testnet only (no mainnet support).
 */
export function createX402RealServer(config: X402RealServerConfig) {
  // Enforce testnet only - no mainnet support
  const network = "hedera:testnet"

  // Create facilitator client
  const facilitator = new HTTPFacilitatorClient({
    url: config.facilitatorUrl ?? "https://x402.org/facilitator",
    timeoutMs: 90000,
  })

  // Create Hedera server scheme with default assets
  // Register HTS tokens that will be used
  const defaultAssets: Record<string, { asset: string; decimals: number }> = {
    HBAR: { asset: "0.0.0", decimals: 8 },
    USDC: { asset: "0.0.429274", decimals: 6 },
  }

  const hederaScheme = new ExactHederaScheme({ defaultAssets })

  // Create base resource server
  const resourceServer = new x402ResourceServer(facilitator).register(network, hederaScheme)

  // Map routes to x402 format
  // Route format: Record<path, RouteConfig>
  // RouteConfig has: accepts (PaymentOption[]), handler, resource, description, etc.
  const x402Routes: Record<
    string,
    {
      accepts: {
        scheme: string
        payTo: string
        price: string
        network: string
        maxTimeoutSeconds?: number
      }
      description?: string
      handler: (context: { request: Request }) => Promise<unknown> | unknown
    }
  > = {}

  for (const route of config.routes) {
    // Format price according to x402 spec
    // Can be: "$1.50", "10 HBAR", "100 USDC", or atomic like "10000000" (tinybars)
    let priceStr: string
    if (typeof route.price === "string") {
      // Simple string price - pass through as atomic amount (assumes HBAR)
      priceStr = route.price
    } else {
      // Asset-specific price
      // Map token IDs to symbols for known assets
      let assetSymbol: string
      if (route.price.asset === "HBAR" || route.price.asset === "0.0.0") {
        assetSymbol = "HBAR"
      } else if (route.price.asset === "0.0.429274") {
        assetSymbol = "USDC"
      } else {
        // Unknown asset - use the ID as-is
        assetSymbol = route.price.asset
      }
      // Format as "amount asset"
      priceStr = `${route.price.amount} ${assetSymbol}`
    }

    // Create payment option
    const paymentOption = {
      scheme: "exact",
      payTo: config.payTo,
      price: priceStr,
      network,
      maxTimeoutSeconds: 120,
    }

    x402Routes[route.path] = {
      accepts: paymentOption,
      description: route.description,
      handler: async (context) => {
        // Pass the Request object to the handler
        return route.handler(context.request)
      },
    }
  }

  // Create HTTP resource server with routes
  const server = new x402HTTPResourceServer(resourceServer, x402Routes)

  // Initialize server (fetches facilitator support)
  let initialized = false

  return {
    async handle(request: Request): Promise<Response> {
      // Initialize on first request
      if (!initialized) {
        await server.initialize()
        initialized = true
      }

      // Extract request details
      const url = new URL(request.url)
      const path = url.pathname
      const method = request.method

      // Create HTTP adapter from Request
      const adapter = {
        getHeader(name: string): string | undefined {
          return request.headers.get(name) ?? undefined
        },
        getMethod(): string {
          return method
        },
        getPath(): string {
          return path
        },
        getUrl(): string {
          return url.toString()
        },
        getAcceptHeader(): string {
          return request.headers.get("accept") ?? "*/*"
        },
        getUserAgent(): string {
          return request.headers.get("user-agent") ?? "unknown"
        },
      }

      // Get payment header if present
      const paymentHeader =
        request.headers.get("PAYMENT-SIGNATURE") ?? request.headers.get("X-PAYMENT") ?? undefined

      // Create request context
      const context = {
        adapter,
        path,
        method,
        paymentHeader,
      }

      // Process request
      try {
        const result = await server.processHTTPRequest(context)

        // Handle different result types based on HTTPProcessResult
        if (result.type === "payment-error") {
          // Payment error - return the response from the error
          const body =
            typeof result.response.body === "string"
              ? result.response.body
              : JSON.stringify(result.response.body ?? {})
          return new Response(body, {
            status: result.response.status,
            headers: result.response.headers,
          })
        }

        if (result.type === "no-payment-required") {
          // No payment required - route allows access without payment
          // This shouldn't happen in our setup, but handle it anyway
          return new Response(JSON.stringify({ error: "Route misconfigured" }), {
            status: 500,
          })
        }

        if (result.type === "payment-verified") {
          // Payment verified - now settle it before calling handler
          const routePath = path
          const routeConfig = x402Routes[routePath]
          if (!routeConfig) {
            return new Response(JSON.stringify({ error: "Route not found" }), {
              status: 404,
            })
          }

          // Settle the payment before calling the handler
          const settlementResult = await server.processSettlement(
            result.paymentPayload,
            result.paymentRequirements,
            result.declaredExtensions,
            undefined, // transportContext
            undefined, // settlementOverrides
            result.beforeHandlerSettlement, // beforeHandlerSettlement from processHTTPRequest
          )

          // Check settlement result (settlementResult IS a SettleResponse with success field)
          if (!settlementResult.success) {
            // Settlement failed - return 402 with error
            const body = JSON.stringify({
              error: "Payment settlement failed",
              reason: settlementResult.errorReason,
              message: settlementResult.errorMessage,
            })
            return new Response(body, {
              status: 402,
              headers: settlementResult.headers ?? {},
            })
          }

          // Settlement successful - call the handler
          const handlerResult = await routeConfig.handler({ request })

          // Serialize the result
          const body =
            typeof handlerResult === "string" ? handlerResult : JSON.stringify(handlerResult)

          // Return resource with PAYMENT-RESPONSE settlement headers
          return new Response(body, {
            status: 200,
            headers: {
              "content-type": "application/json",
              ...(settlementResult.headers ?? {}),
            },
          })
        }

        // Unknown result type
        return new Response(JSON.stringify({ error: "Unexpected result type" }), { status: 500 })
      } catch (error) {
        console.error("Error processing HTTP request:", error)
        return new Response(
          JSON.stringify({
            error: "Internal error processing payment",
            message: error instanceof Error ? error.message : String(error),
          }),
          { status: 500 },
        )
      }
    },
    clearCache() {
      // x402HTTPResourceServer manages its own cache
    },
    stats() {
      // Stats would need to be tracked separately
      return { paid: 0, refused: 0, cached: 0 }
    },
  }
}
