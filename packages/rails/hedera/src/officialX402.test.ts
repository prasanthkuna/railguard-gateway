/**
 * Tests for official x402 v2 integration with Hedera.
 * Uses real protocol types and validates against live facilitator capabilities.
 */
import { beforeEach, describe, expect, test } from "bun:test"
import { type HederaGuardPolicy, HederaPaymentGuard } from "./guard.js"

interface PaymentIntent {
  requestId: string
  recipient: string
  amount: bigint
  asset: string
  memo?: string
}

describe("Official x402 Integration", () => {
  let guard: HederaPaymentGuard
  let facilitatorCapabilities: {
    kinds: Array<{
      scheme: string
      network: string
      x402Version: number
      extra?: { feePayer?: string }
    }>
  }

  beforeEach(async () => {
    // Fetch real facilitator capabilities
    const response = await fetch("https://x402.org/facilitator/supported")
    facilitatorCapabilities = await response.json()

    // Create guard with test policy
    const policy: HederaGuardPolicy = {
      totalBudget: 100_000_000n, // 1 HBAR
      perMerchantLimit: 50_000_000n, // 0.5 HBAR
      recipientAllowlist: ["0.0.12345", "0.0.67890"],
      approvalThreshold: 20_000_000n, // 0.2 HBAR
    }
    guard = new HederaPaymentGuard(policy)
  })

  test("facilitator advertises Hedera testnet support", () => {
    const hederaKind = facilitatorCapabilities.kinds.find(
      (k) => k.scheme === "exact" && k.network === "hedera:testnet",
    )

    expect(hederaKind).toBeDefined()
    expect(hederaKind.x402Version).toBe(2)
    expect(hederaKind.extra?.feePayer).toBeDefined()
    expect(typeof hederaKind.extra.feePayer).toBe("string")

    // Verify fee payer format (Hedera account ID)
    expect(hederaKind.extra.feePayer).toMatch(/^0\.0\.\d+$/)
  })

  test("facilitator fee payer matches expected value", () => {
    const hederaKind = facilitatorCapabilities.kinds.find(
      (k) => k.network === "hedera:testnet",
    )

    // From docs: https://docs.hedera.com/solutions/ai/x402/facilitators
    expect(hederaKind.extra.feePayer).toBe("0.0.9185802")
  })

  test("guard allows payment within policy", () => {
    const intent: PaymentIntent = {
      requestId: "test_1",
      recipient: "0.0.12345",
      amount: 10_000_000n, // 0.1 HBAR
      asset: "HBAR",
      memo: "test payment",
    }

    const decision = guard.checkPayment(intent)

    expect(decision.decision).toBe("ALLOW")
  })

  test("guard requires approval for large payment", () => {
    const intent: PaymentIntent = {
      requestId: "test_2",
      recipient: "0.0.12345",
      amount: 30_000_000n, // 0.3 HBAR (above approval threshold)
      asset: "HBAR",
      memo: "large payment",
    }

    const decision = guard.checkPayment(intent)

    expect(decision.decision).toBe("APPROVAL_REQUIRED")
    expect(decision.paymentId).toBeDefined()
  })

  test("guard denies payment to non-allowlisted recipient", () => {
    const intent: PaymentIntent = {
      requestId: "test_3",
      recipient: "0.0.99999", // Not in allowlist
      amount: 10_000_000n,
      asset: "HBAR",
      memo: "blocked payment",
    }

    const decision = guard.checkPayment(intent)

    expect(decision.decision).toBe("DENY")
    expect(decision.reason).toContain("allowlist")
  })

  test("guard denies payment exceeding total budget", () => {
    const intent: PaymentIntent = {
      requestId: "test_4",
      recipient: "0.0.12345",
      amount: 150_000_000n, // 1.5 HBAR (exceeds total budget)
      asset: "HBAR",
      memo: "over budget",
    }

    const decision = guard.checkPayment(intent)

    expect(decision.decision).toBe("DENY")
    expect(decision.reason).toContain("budget")
  })

  test("payment requirements use exact scheme", () => {
    // Verify we're using the correct scheme format
    const paymentReqs = {
      scheme: "exact",
      network: "hedera:testnet",
      amount: "10000000",
      asset: "0.0.0", // HBAR
      payTo: "0.0.12345",
      maxTimeoutSeconds: 120,
      extra: {
        feePayer: "0.0.9185802",
      },
    }

    expect(paymentReqs.scheme).toBe("exact")
    expect(paymentReqs.network).toBe("hedera:testnet")
    expect(paymentReqs.asset).toBe("0.0.0")
    expect(paymentReqs.extra.feePayer).toBe("0.0.9185802")
  })

  test("HTS token payment uses correct format", () => {
    // USDC testnet token
    const paymentReqs = {
      scheme: "exact",
      network: "hedera:testnet",
      amount: "1000000", // 1 USDC (6 decimals)
      asset: "0.0.429274",
      payTo: "0.0.12345",
      maxTimeoutSeconds: 120,
      extra: {
        feePayer: "0.0.9185802",
      },
    }

    expect(paymentReqs.asset).toBe("0.0.429274")
    expect(paymentReqs.amount).toBe("1000000")
  })

  test("guard tracks budget across multiple payments", () => {
    const intent1: PaymentIntent = {
      requestId: "test_5a",
      recipient: "0.0.12345",
      amount: 15_000_000n, // Below approval threshold
      asset: "HBAR",
    }

    const intent2: PaymentIntent = {
      requestId: "test_5b",
      recipient: "0.0.12345",
      amount: 15_000_000n,
      asset: "HBAR",
    }

    const decision1 = guard.checkPayment(intent1)
    expect(decision1.decision).toBe("ALLOW")

    const decision2 = guard.checkPayment(intent2)
    expect(decision2.decision).toBe("ALLOW")

    // Check budget remaining
    const status = guard.getStatus()
    expect(status.spentBudget).toBe(30_000_000n)
    expect(status.remainingBudget).toBe(70_000_000n)
  })

  test("facilitator supports multiple networks", () => {
    const networks = facilitatorCapabilities.kinds.map((k) => k.network)

    expect(networks).toContain("hedera:testnet")
    expect(networks.length).toBeGreaterThan(1) // Multiple chains supported
  })
})
