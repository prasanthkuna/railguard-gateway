import { describe, expect, it } from "bun:test"
import { HederaPaymentGuard, type PaymentIntent } from "./guard"

describe("HederaPaymentGuard", () => {
  const policy = {
    totalBudget: 10_000_000n, // 10 USDC (6 decimals)
    perMerchantLimit: 3_000_000n, // 3 USDC per merchant
    recipientAllowlist: ["0.0.12345", "0.0.67890"],
    approvalThreshold: 5_000_000n, // 5 USDC
  }

  it("allows payment within budget and limits", () => {
    const guard = new HederaPaymentGuard(policy)
    const intent: PaymentIntent = {
      requestId: "req_001",
      recipient: "0.0.12345",
      amount: 1_000_000n, // 1 USDC
      asset: "USDC",
    }

    const result = guard.checkPayment(intent)
    expect(result.decision).toBe("ALLOW")
    expect(result.paymentId).toBe("pay_hedera_req_001")
  })

  it("denies payment to non-allowlisted recipient", () => {
    const guard = new HederaPaymentGuard(policy)
    const intent: PaymentIntent = {
      requestId: "req_002",
      recipient: "0.0.99999", // Not on allowlist
      amount: 1_000_000n,
      asset: "USDC",
    }

    const result = guard.checkPayment(intent)
    expect(result.decision).toBe("DENY")
    expect(result.reason).toBe("recipient_not_on_allowlist")
  })

  it("denies payment exceeding total budget", () => {
    const guard = new HederaPaymentGuard(policy)
    const intent: PaymentIntent = {
      requestId: "req_003",
      recipient: "0.0.12345",
      amount: 15_000_000n, // 15 USDC, exceeds 10 USDC total budget
      asset: "USDC",
    }

    const result = guard.checkPayment(intent)
    expect(result.decision).toBe("DENY")
    expect(result.reason).toBe("exceeds_total_budget")
  })

  it("denies payment exceeding per-merchant limit", () => {
    const guard = new HederaPaymentGuard(policy)

    // First payment: 2 USDC to merchant A
    const intent1: PaymentIntent = {
      requestId: "req_004",
      recipient: "0.0.12345",
      amount: 2_000_000n,
      asset: "USDC",
    }
    guard.checkPayment(intent1)

    // Second payment: 2 USDC to merchant A (total 4 USDC, exceeds 3 USDC limit)
    const intent2: PaymentIntent = {
      requestId: "req_005",
      recipient: "0.0.12345",
      amount: 2_000_000n,
      asset: "USDC",
    }

    const result = guard.checkPayment(intent2)
    expect(result.decision).toBe("DENY")
    expect(result.reason).toBe("exceeds_merchant_limit")
  })

  it("requires approval for amount above threshold", () => {
    const guard = new HederaPaymentGuard({
      ...policy,
      perMerchantLimit: 10_000_000n, // Increase limit so approval threshold triggers first
    })
    const intent: PaymentIntent = {
      requestId: "req_006",
      recipient: "0.0.12345",
      amount: 6_000_000n, // 6 USDC, exceeds 5 USDC approval threshold
      asset: "USDC",
    }

    const result = guard.checkPayment(intent)
    expect(result.decision).toBe("APPROVAL_REQUIRED")
    expect(result.reason).toBe("amount_exceeds_approval_threshold")
  })

  it("prevents duplicate request IDs", () => {
    const guard = new HederaPaymentGuard(policy)
    const intent: PaymentIntent = {
      requestId: "req_007",
      recipient: "0.0.12345",
      amount: 1_000_000n,
      asset: "USDC",
    }

    // First attempt: allowed
    const result1 = guard.checkPayment(intent)
    expect(result1.decision).toBe("ALLOW")

    // Second attempt with same request ID: denied
    const result2 = guard.checkPayment(intent)
    expect(result2.decision).toBe("DENY")
    expect(result2.reason).toBe("duplicate_request_id")
  })

  it("tracks budget across multiple payments", () => {
    const guard = new HederaPaymentGuard(policy)

    // Payment 1: 3 USDC to merchant A
    guard.checkPayment({
      requestId: "req_008",
      recipient: "0.0.12345",
      amount: 3_000_000n,
      asset: "USDC",
    })

    // Payment 2: 2.5 USDC to merchant B
    guard.checkPayment({
      requestId: "req_009",
      recipient: "0.0.67890",
      amount: 2_500_000n,
      asset: "USDC",
    })

    const status = guard.getStatus()
    expect(status.spentBudget).toBe(5_500_000n) // 5.5 USDC
    expect(status.remainingBudget).toBe(4_500_000n) // 4.5 USDC
  })

  it("supports rollback on failed execution", () => {
    const guard = new HederaPaymentGuard(policy)
    const intent: PaymentIntent = {
      requestId: "req_010",
      recipient: "0.0.12345",
      amount: 2_000_000n,
      asset: "USDC",
    }

    // Reserve budget
    guard.checkPayment(intent)
    expect(guard.getStatus().spentBudget).toBe(2_000_000n)

    // Rollback on failure
    guard.rollback(intent)
    expect(guard.getStatus().spentBudget).toBe(0n)
  })

  it("generates deterministic payment IDs", () => {
    const guard = new HederaPaymentGuard(policy)
    const intent: PaymentIntent = {
      requestId: "req_011",
      recipient: "0.0.12345",
      amount: 1_000_000n,
      asset: "USDC",
    }

    // Create guard again with same intent
    const guard2 = new HederaPaymentGuard(policy)

    const result1 = guard.checkPayment(intent)
    const result2 = guard2.checkPayment(intent)

    // Same request ID should produce same payment ID
    expect(result1.paymentId).toBe(result2.paymentId)
    expect(result1.paymentId).toBe("pay_hedera_req_011")
  })
})
