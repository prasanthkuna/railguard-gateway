/**
 * Tests for real x402 implementation using official @x402/core and @x402/hedera libraries.
 * Tests use mock network calls but real encoding/decoding and protocol types.
 * Tests marked with LIVE require actual testnet credentials and are skipped by default.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { HederaPaymentGuard } from "./guard.js"
import { createUnguardedX402TestClient, fetchX402Resource } from "./x402RealClient.js"
import { createX402RealServer } from "./x402RealServer.js"

describe("x402 Real Implementation", () => {
  // Mock credentials (testnet only, not real keys)
  const MOCK_ACCOUNT_ID = "0.0.12345"
  // Valid ED25519 private key (32 bytes hex) - MOCK KEY FOR TESTING ONLY
  const MOCK_PRIVATE_KEY = "e0fdc9255a925ab15c04e291ae770d8faf983e94ed714fb5ce3532c057b89659"
  const FACILITATOR_FEE_PAYER = "0.0.9185802"

  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    // Save original fetch
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    // Always restore fetch
    globalThis.fetch = originalFetch
  })

  test("unguarded test client creation requires explicit flag", () => {
    expect(() => {
      createUnguardedX402TestClient({
        accountId: MOCK_ACCOUNT_ID,
        privateKey: MOCK_PRIVATE_KEY,
        // @ts-expect-error - testing missing flag
        allowWithoutGuardForTest: false,
      })
    }).toThrow("requires allowWithoutGuardForTest: true")
  })

  test("unguarded test client creation with explicit flag", () => {
    expect(() => {
      createUnguardedX402TestClient({
        accountId: MOCK_ACCOUNT_ID,
        privateKey: MOCK_PRIVATE_KEY,
        allowWithoutGuardForTest: true,
      })
    }).not.toThrow()
  })

  test("server creation with official library", () => {
    expect(() => {
      createX402RealServer({
        payTo: MOCK_ACCOUNT_ID,
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
            signers: {
              "hedera:*": [FACILITATOR_FEE_PAYER],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      return new Response("Not found", { status: 404 })
    }

    try {
      const request = new Request("http://localhost:3000/premium")
      const response = await server.handle(request)

      expect(response.status).toBe(402)
      expect(response.headers.has("PAYMENT-REQUIRED")).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test(
    "facilitator live check (real network call)",
    { skip: !process.env.LIVE_FACILITATOR },
    async () => {
      // Real network call to x402.org/facilitator/supported
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
          feePayer: expect.any(String),
        },
      })
    },
  )

  test("full payment flow with mocked facilitator", async () => {
    // Create unguarded test client
    const client = createUnguardedX402TestClient({
      accountId: MOCK_ACCOUNT_ID,
      privateKey: MOCK_PRIVATE_KEY,
      allowWithoutGuardForTest: true,
    })

    // Create server
    const server = createX402RealServer({
      payTo: MOCK_ACCOUNT_ID,
      routes: [
        {
          path: "/data",
          price: "10000000",
          description: "Protected data",
          handler: () => ({ content: "success", timestamp: Date.now() }),
        },
      ],
    })

    // Track facilitator calls
    const facilitatorCalls: string[] = []

    // Mock facilitator responses
    globalThis.fetch = async (url: string | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === "string" ? url : url.toString()

      // Mock facilitator endpoints
      if (urlStr.includes("/facilitator/supported")) {
        facilitatorCalls.push("supported")
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
        facilitatorCalls.push("verify")
        return new Response(
          JSON.stringify({
            isValid: true,
            payer: MOCK_ACCOUNT_ID,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      }

      if (urlStr.includes("/facilitator/settle")) {
        facilitatorCalls.push("settle")
        return new Response(
          JSON.stringify({
            success: true,
            transaction: "0.0.12345@1234567890.1",
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

      // Should have called facilitator for supported, verify, settle
      expect(facilitatorCalls).toContain("supported")
      expect(facilitatorCalls).toContain("verify")
      expect(facilitatorCalls).toContain("settle")

      // Payment should be settled by facilitator
      expect(result.paid).toBe(true)
      expect(result.paymentStatus).toBe("SETTLED_BY_FACILITATOR")
      expect(result.status).toBe(200)
      expect(result.transactionId).toBe("0.0.12345@1234567890.1")
      expect(result.body).toMatchObject({
        content: "success",
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("HTS token payment with mocked facilitator", async () => {
    const server = createX402RealServer({
      payTo: MOCK_ACCOUNT_ID,
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

      expect(response.status).toBe(402)
      expect(response.headers.has("PAYMENT-REQUIRED")).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("proper encoding of payment headers", async () => {
    const client = createUnguardedX402TestClient({
      accountId: MOCK_ACCOUNT_ID,
      privateKey: MOCK_PRIVATE_KEY,
      allowWithoutGuardForTest: true,
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
          extra: {
            feePayer: FACILITATOR_FEE_PAYER,
          },
        },
      ],
    }

    // Mock facilitator
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

  test("402 after retry returns paid:false and failed status", async () => {
    const client = createUnguardedX402TestClient({
      accountId: MOCK_ACCOUNT_ID,
      privateKey: MOCK_PRIVATE_KEY,
      allowWithoutGuardForTest: true,
    })

    const server = createX402RealServer({
      payTo: MOCK_ACCOUNT_ID,
      routes: [
        {
          path: "/fail",
          price: "10000000",
          description: "Always fails",
          handler: () => ({ data: "should not see" }),
        },
      ],
    })

    // Mock facilitator that fails settlement
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

      if (urlStr.includes("/facilitator/verify")) {
        return new Response(JSON.stringify({ isValid: true, payer: MOCK_ACCOUNT_ID }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }

      if (urlStr.includes("/facilitator/settle")) {
        // Settlement fails
        return new Response(
          JSON.stringify({
            success: false,
            errorReason: "insufficient_balance",
            network: "hedera:testnet",
            transaction: "",
            payer: MOCK_ACCOUNT_ID,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      if (urlStr.includes("/fail")) {
        return server.handle(new Request(urlStr, init))
      }

      return new Response("Not found", { status: 404 })
    }

    try {
      const result = await fetchX402Resource(client, "http://localhost:3000/fail")

      // Should NOT be marked as paid since we got 402 back
      expect(result.paid).toBe(false)
      expect(result.paymentStatus).toBe("failed")
      expect(result.status).toBe(402)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
