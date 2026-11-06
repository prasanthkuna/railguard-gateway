/**
 * Tests for x402 v2 HTTP flow on Hedera.
 * Demonstrates complete challenge-payment-verification flow without live credentials.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { HederaExpectedPayment, HederaVerifyResult } from "./types.js"
import { HederaPaymentVerifier } from "./verifier.js"
import { createX402Client } from "./x402Client.js"
import { createX402Server } from "./x402Server.js"

// Mock verifier that simulates mirror node verification
class MockVerifier extends HederaPaymentVerifier {
  private validTransactions = new Set<string>()

  constructor() {
    super({ mirrorNode: { baseUrl: "http://mock" } })
  }

  addValidTransaction(txId: string) {
    this.validTransactions.add(txId)
  }

  async verifyPayment(
    transactionId: string,
    expected: HederaExpectedPayment,
  ): Promise<HederaVerifyResult> {
    if (this.validTransactions.has(transactionId)) {
      return {
        status: "CONFIRMED",
        facts: {
          transactionId,
          consensusTimestamp: new Date().toISOString(),
          result: "SUCCESS",
          transfers: [],
          hbarTransfers: [],
          chargedTxFee: 0n,
        },
      }
    }
    return { status: "NOT_FOUND", reason: "transaction_not_found" }
  }
}

// Mock guarded client that simulates payment execution
class MockGuardedClient {
  private executionCount = 0
  private verifier?: MockVerifier

  setVerifier(verifier: MockVerifier) {
    this.verifier = verifier
  }

  async requestPayment(intent: { requestId: string; recipient: string; amount: bigint; asset: string; memo?: string }) {
    this.executionCount++
    const txId = `0.0.12345@${Date.now()}.${this.executionCount}`
    // Auto-register transaction as valid for verification
    this.verifier?.addValidTransaction(txId)
    return {
      status: "CONFIRMED" as const,
      paymentId: `pay_hedera_${intent.requestId}`,
      transactionId: txId,
    }
  }
}

describe("x402 HTTP Flow", () => {
  let server: ReturnType<typeof createX402Server>
  let verifier: MockVerifier
  let guardedClient: MockGuardedClient
  let client: ReturnType<typeof createX402Client>

  beforeEach(() => {
    verifier = new MockVerifier()
    guardedClient = new MockGuardedClient()
    guardedClient.setVerifier(verifier)

    server = createX402Server({
      payTo: "0.0.12345",
      verifier,
      routes: [
        {
          path: "/premium-data",
          amount: "10000000", // 0.1 HBAR
          asset: "HBAR",
          description: "Premium API data",
          handler: (url) => ({
            data: "secret premium content",
            timestamp: Date.now(),
            query: url.searchParams.toString(),
          }),
        },
        {
          path: "/token-data",
          amount: "1000000", // 1 USDC (6 decimals)
          asset: "0.0.429274",
          description: "Token-gated content",
          handler: () => ({ restricted: true, value: 42 }),
        },
      ],
      serviceName: "Test x402 Service",
    })

    client = createX402Client({ guardedClient })
  })

  afterEach(() => {
    server.clearCache()
  })

  test("returns 402 when no payment provided", async () => {
    const request = new Request("http://localhost:3000/premium-data")
    const response = await server.handle(request)

    expect(response.status).toBe(402)
    expect(response.headers.get("PAYMENT-REQUIRED")).toBeTruthy()

    const body = await response.json()
    expect(body).toMatchObject({
      x402Version: 2,
      error: expect.stringContaining("PAYMENT-SIGNATURE"),
      resource: {
        url: "http://localhost:3000/premium-data",
        description: "Premium API data",
      },
      accepts: [
        {
          scheme: "hedera",
          network: "hedera-testnet",
          amount: "10000000",
          asset: "HBAR",
          payTo: "0.0.12345",
        },
      ],
    })
  })

  test("complete payment flow returns protected resource", async () => {
    // Mock fetch to use our server
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: string | URL, init?: RequestInit) => {
      const request = new Request(url, init)
      return server.handle(request)
    }

    try {
      const result = await client.fetch("http://localhost:3000/premium-data")

      // First request returned 402, client paid, got resource
      expect(result.paid).toBe(true)
      expect(result.status).toBe(200)
      expect(result.transactionId).toMatch(/^0\.0\.\d+@\d+\.\d+$/)
      expect(result.body).toMatchObject({
        data: "secret premium content",
      })

      // Verify server stats
      const stats = server.stats()
      expect(stats.paid).toBe(1)
      expect(stats.refused).toBe(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test("rejects mismatched payment requirements", async () => {
    const request = new Request("http://localhost:3000/premium-data", {
      headers: {
        "PAYMENT-SIGNATURE": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepted: {
              scheme: "hedera",
              network: "hedera-testnet",
              amount: "5000000", // Wrong amount
              asset: "HBAR",
              payTo: "0.0.12345",
            },
            payload: {
              transactionId: "0.0.12345@1234567890.1",
              requestId: "test",
            },
            extensions: {
              "payment-identifier": { info: { required: true, id: "pid_test" } },
            },
          }),
        ).toString("base64"),
      },
    })

    const response = await server.handle(request)
    expect(response.status).toBe(402)
    const body = await response.json()
    expect(body.error).toContain("do not match")

    const stats = server.stats()
    expect(stats.refused).toBe(1)
  })

  test("prevents replay attacks with payment-identifier", async () => {
    const paymentId = `pid_${Date.now()}`
    const txId1 = "0.0.12345@1000000000.1"
    verifier.addValidTransaction(txId1)

    const makeRequest = (txId: string) =>
      new Request("http://localhost:3000/premium-data", {
        headers: {
          "PAYMENT-SIGNATURE": Buffer.from(
            JSON.stringify({
              x402Version: 2,
              accepted: {
                scheme: "hedera",
                network: "hedera-testnet",
                amount: "10000000",
                asset: "HBAR",
                payTo: "0.0.12345",
              },
              payload: {
                transactionId: txId,
                requestId: "test",
              },
              extensions: {
                "payment-identifier": { info: { required: true, id: paymentId } },
              },
            }),
          ).toString("base64"),
        },
      })

    // First request succeeds
    const response1 = await server.handle(makeRequest(txId1))
    expect(response1.status).toBe(200)

    // Same payment-identifier with same tx: cached
    const response2 = await server.handle(makeRequest(txId1))
    expect(response2.status).toBe(200)
    expect(server.stats().cached).toBe(1)

    // Same payment-identifier with different tx: rejected
    const response3 = await server.handle(makeRequest("0.0.12345@2000000000.2"))
    expect(response3.status).toBe(409)
    const body = await response3.json()
    expect(body.error).toContain("payment-identifier reused")
  })

  test("verifies transaction via mirror node before accepting", async () => {
    const txId = "0.0.12345@1234567890.1"
    // Don't add to verifier's valid set - verification will fail

    const request = new Request("http://localhost:3000/premium-data", {
      headers: {
        "PAYMENT-SIGNATURE": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepted: {
              scheme: "hedera",
              network: "hedera-testnet",
              amount: "10000000",
              asset: "HBAR",
              payTo: "0.0.12345",
            },
            payload: {
              transactionId: txId,
              requestId: "test",
              memo: "x402:/premium-data",
            },
            extensions: {
              "payment-identifier": { info: { required: true, id: `pid_${Date.now()}` } },
            },
          }),
        ).toString("base64"),
      },
    })

    const response = await server.handle(request)
    expect(response.status).toBe(402)
    const body = await response.json()
    expect(body.error).toContain("verification failed")
  })

  test("supports HTS token payments", async () => {
    const txId = "0.0.12345@1234567890.1"
    verifier.addValidTransaction(txId)

    const request = new Request("http://localhost:3000/token-data", {
      headers: {
        "PAYMENT-SIGNATURE": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepted: {
              scheme: "hedera",
              network: "hedera-testnet",
              amount: "1000000",
              asset: "0.0.429274",
              payTo: "0.0.12345",
            },
            payload: {
              transactionId: txId,
              requestId: "token_test",
              memo: "x402:/token-data",
            },
            extensions: {
              "payment-identifier": { info: { required: true, id: `pid_token_${Date.now()}` } },
            },
          }),
        ).toString("base64"),
      },
    })

    const response = await server.handle(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ restricted: true, value: 42 })
  })

  test("requires payment-identifier for replay protection", async () => {
    const txId = "0.0.12345@1234567890.1"
    verifier.addValidTransaction(txId)

    const request = new Request("http://localhost:3000/premium-data", {
      headers: {
        "PAYMENT-SIGNATURE": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepted: {
              scheme: "hedera",
              network: "hedera-testnet",
              amount: "10000000",
              asset: "HBAR",
              payTo: "0.0.12345",
            },
            payload: {
              transactionId: txId,
              requestId: "test",
            },
            // No payment-identifier extension
          }),
        ).toString("base64"),
      },
    })

    const response = await server.handle(request)
    expect(response.status).toBe(402)
    const body = await response.json()
    expect(body.error).toContain("payment-identifier is required")
  })

  test("prevents transaction replay across different resources", async () => {
    const txId = "0.0.12345@1234567890.1"
    verifier.addValidTransaction(txId)

    const makeRequest = (path: string, pid: string) =>
      new Request(`http://localhost:3000${path}`, {
        headers: {
          "PAYMENT-SIGNATURE": Buffer.from(
            JSON.stringify({
              x402Version: 2,
              accepted: {
                scheme: "hedera",
                network: "hedera-testnet",
                amount: path === "/premium-data" ? "10000000" : "1000000",
                asset: path === "/premium-data" ? "HBAR" : "0.0.429274",
                payTo: "0.0.12345",
              },
              payload: {
                transactionId: txId,
                requestId: "test",
              },
              extensions: {
                "payment-identifier": { info: { required: true, id: pid } },
              },
            }),
          ).toString("base64"),
        },
      })

    // First resource succeeds
    const response1 = await server.handle(makeRequest("/premium-data", "pid_1"))
    expect(response1.status).toBe(200)

    // Same transaction, new payment-identifier, different resource: rejected
    const response2 = await server.handle(makeRequest("/token-data", "pid_2"))
    expect(response2.status).toBe(409)
    const body = await response2.json()
    expect(body.error).toContain("transaction already used")
  })
})
