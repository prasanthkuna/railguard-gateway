/**
 * Tests for real x402 implementation using official @x402/core and @x402/hedera libraries.
 * Tests use mock network calls but real encoding/decoding and protocol types.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test"
import { createX402RealClient, fetchX402Resource } from "./x402RealClient.js"
import { createX402RealServer } from "./x402RealServer.js"

describe("x402 Real Implementation", () => {
  // Mock credentials (testnet only, not real keys)
  const MOCK_ACCOUNT_ID = "0.0.12345"
  // Valid ED25519 private key (32 bytes hex) - MOCK KEY FOR TESTING ONLY
  const MOCK_PRIVATE_KEY = "e0fdc9255a925ab15c04e291ae770d8faf983e94ed714fb5ce3532c057b89659"
  const FACILITATOR_FEE_PAYER = "0.0.9185802"

  beforeEach(() => {
    // Reset mocks
    mock.restore()
  })

  test("client creation with official library", () => {
    expect(() => {
      createX402RealClient({
        accountId: MOCK_ACCOUNT_ID,
        privateKey: MOCK_PRIVATE_KEY,
        network: "hedera:testnet",
      })
    }).not.toThrow()
  })

  test("server creation with official library", () => {
    expect(() => {
      createX402RealServer({
        payTo: MOCK_ACCOUNT_ID,
        network: "hedera:testnet",
        routes: [
          {
            path: "/test",
            price: "10000000",
            description: "Test endpoint",
            handler: () => ({ test: true }),
          },
        ],
      })
    }).not.toThrow()
  })

  test("server returns 402 without payment", async () => {
    const server = createX402RealServer({
      payTo: MOCK_ACCOUNT_ID,
      network: "hedera:testnet",
      routes: [
        {
          path: "/premium",
          price: "10000000",
          description: "Premium data",
          handler: () => ({ data: "secret" }),
        },
      ],
    })

    // Mock facilitator supported response
    mock.module("@x402/core/http", () => ({
      HTTPFacilitatorClient: class {
        async getSupported() {
          return {
            kinds: [
              {
                x402Version: 2,
                scheme: "exact",
                network: "hedera:testnet",
                extra: { feePayer: FACILITATOR_FEE_PAYER },
              },
            ],
            extensions: [],
            signers: {
              "hedera:*": [FACILITATOR_FEE_PAYER],
            },
          }
        }
        async verify() {
          return { success: true }
        }
        async settle() {
          return {
            success: true,
            transactionId: "0.0.12345@1234567890.1",
            network: "hedera:testnet",
          }
        }
      },
    }))

    const request = new Request("http://localhost:3000/premium")
    const response = await server.handle(request)

    if (response.status !== 402) {
      const body = await response.text()
      console.log("Response status:", response.status)
      console.log("Response body:", body)
    }

    expect(response.status).toBe(402)
    expect(response.headers.has("PAYMENT-REQUIRED")).toBe(true)
  })

  test("full payment flow with mocked facilitator", async () => {
    // Create client
    const client = createX402RealClient({
      accountId: MOCK_ACCOUNT_ID,
      privateKey: MOCK_PRIVATE_KEY,
      network: "hedera:testnet",
    })

    // Create server
    const server = createX402RealServer({
      payTo: MOCK_ACCOUNT_ID,
      network: "hedera:testnet",
      routes: [
        {
          path: "/data",
          price: "10000000",
          description: "Protected data",
          handler: () => ({ content: "success", timestamp: Date.now() }),
        },
      ],
    })

    // Mock facilitator responses
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: string | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === "string" ? url : url.toString()

      // Mock facilitator endpoints
      if (urlStr.includes("/facilitator/supported")) {
        return new Response(
          JSON.stringify({
            kinds: [
              {
                x402Version: 2,
                scheme: "exact",
                network: "hedera:testnet",
                extra: { feePayer: FACILITATOR_FEE_PAYER },
              },
            ],
            extensions: [],
            signers: {
              "hedera:*": [FACILITATOR_FEE_PAYER],
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      if (urlStr.includes("/facilitator/verify")) {
        return new Response(
          JSON.stringify({
            success: true,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      if (urlStr.includes("/facilitator/settle")) {
        return new Response(
          JSON.stringify({
            success: true,
            transactionId: "0.0.12345@1234567890.1",
            network: "hedera:testnet",
            payer: MOCK_ACCOUNT_ID,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      // Mock server requests
      if (urlStr.includes("/data")) {
        const request = new Request(urlStr, init)
        return server.handle(request)
      }

      return new Response("Not found", { status: 404 })
    }

    try {
      const result = await fetchX402Resource(client, "http://localhost:3000/data")

      // Verify the payment flow completed
      expect(result.paid).toBe(true)
      expect(result.status).toBe(200)
      expect(result.body).toMatchObject({
        content: "success",
      })
      expect(result.transactionId).toBeDefined()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("HTS token payment flow", async () => {
    const server = createX402RealServer({
      payTo: MOCK_ACCOUNT_ID,
      network: "hedera:testnet",
      routes: [
        {
          path: "/token-gate",
          price: { amount: "1000000", asset: "0.0.429274" },
          description: "Token-gated content",
          handler: () => ({ tokenGated: true, value: 42 }),
        },
      ],
    })

    // Mock facilitator
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: string | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === "string" ? url : url.toString()

      if (urlStr.includes("/facilitator/supported")) {
        return new Response(
          JSON.stringify({
            kinds: [
              {
                x402Version: 2,
                scheme: "exact",
                network: "hedera:testnet",
                extra: { feePayer: FACILITATOR_FEE_PAYER },
              },
            ],
            extensions: [],
            signers: { "hedera:*": [FACILITATOR_FEE_PAYER] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      if (urlStr.includes("/token-gate")) {
        return server.handle(new Request(urlStr, init))
      }

      return new Response("Not found", { status: 404 })
    }

    try {
      const request = new Request("http://localhost:3000/token-gate")
      const response = await server.handle(request)

      if (response.status !== 402) {
        const text = await response.text()
        console.log("Response status:", response.status)
        console.log("Response body:", text)
      }

      expect(response.status).toBe(402)

      // Verify the payment requirements include the correct token
      const body = await response.json()
      // The body should be a PaymentRequired object
      expect(body).toHaveProperty("resource")
      expect(body).toHaveProperty("accepts")
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("facilitator live check (mocked)", async () => {
    // Mock the facilitator check
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: string | URL): Promise<Response> => {
      const urlStr = typeof url === "string" ? url : url.toString()

      if (urlStr.includes("x402.org/facilitator/supported")) {
        // Return realistic response based on actual x402.org/facilitator
        return new Response(
          JSON.stringify({
            kinds: [
              {
                x402Version: 2,
                scheme: "exact",
                network: "hedera:testnet",
                extra: { feePayer: "0.0.9185802" },
              },
            ],
            extensions: ["builder-code"],
            signers: {
              "hedera:*": ["0.0.9185802"],
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      return new Response("Not found", { status: 404 })
    }

    try {
      const response = await fetch("https://x402.org/facilitator/supported")
      expect(response.status).toBe(200)

      const data = (await response.json()) as { kinds: unknown[] }
      expect(data.kinds).toBeDefined()

      // Find Hedera testnet support
      const hederaKind = data.kinds.find(
        (k: unknown) =>
          typeof k === "object" &&
          k !== null &&
          "network" in k &&
          k.network === "hedera:testnet" &&
          "scheme" in k &&
          k.scheme === "exact",
      )

      expect(hederaKind).toBeDefined()
      expect(hederaKind).toMatchObject({
        x402Version: 2,
        scheme: "exact",
        network: "hedera:testnet",
        extra: {
          feePayer: "0.0.9185802",
        },
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("proper encoding of payment headers", async () => {
    const client = createX402RealClient({
      accountId: MOCK_ACCOUNT_ID,
      privateKey: MOCK_PRIVATE_KEY,
      network: "hedera:testnet",
    })

    // Create a mock 402 response
    const paymentRequired = {
      x402Version: 2,
      error: "Payment required",
      resource: {
        url: "http://localhost/test",
        description: "Test resource",
      },
      accepts: [
        {
          scheme: "exact",
          network: "hedera:testnet",
          amount: "10000000",
          asset: "0.0.0",
          payTo: MOCK_ACCOUNT_ID,
          maxTimeoutSeconds: 120,
        },
      ],
    }

    // Mock facilitator
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: string | URL): Promise<Response> => {
      const urlStr = typeof url === "string" ? url : url.toString()

      if (urlStr.includes("/facilitator/supported")) {
        return new Response(
          JSON.stringify({
            kinds: [
              {
                x402Version: 2,
                scheme: "exact",
                network: "hedera:testnet",
                extra: { feePayer: FACILITATOR_FEE_PAYER },
              },
            ],
            extensions: [],
            signers: { "hedera:*": [FACILITATOR_FEE_PAYER] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      return new Response("Not found", { status: 404 })
    }

    try {
      // Create payment payload
      const paymentPayload = await client.createPaymentPayload(paymentRequired)

      expect(paymentPayload).toBeDefined()
      expect(paymentPayload.x402Version).toBe(2)
      expect(paymentPayload.accepted).toMatchObject({
        scheme: "exact",
        network: "hedera:testnet",
      })

      // Encode the payment signature header
      const headers = client.encodePaymentSignatureHeader(paymentPayload)
      expect(headers).toBeDefined()
      expect(headers["PAYMENT-SIGNATURE"]).toBeDefined()

      // Verify it's base64 encoded
      const decoded = Buffer.from(headers["PAYMENT-SIGNATURE"], "base64").toString("utf8")
      const parsed = JSON.parse(decoded)
      expect(parsed.x402Version).toBe(2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
