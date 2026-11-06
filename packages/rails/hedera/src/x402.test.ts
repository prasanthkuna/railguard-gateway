import { describe, expect, it } from "bun:test"
import { HederaPaymentGuard } from "./guard"
import { X402GuardedClient } from "./x402"

describe("X402GuardedClient", () => {
  const policy = {
    totalBudget: 10_000_000n,
    perMerchantLimit: 7_000_000n, // Allow 7 USDC per merchant
    recipientAllowlist: ["0.0.12345"],
    approvalThreshold: 5_000_000n,
  }

  it("allows payment within policy", async () => {
    const guard = new HederaPaymentGuard(policy)
    const client = new X402GuardedClient({ guard })

    const result = await client.requestPayment({
      requestId: "req_001",
      recipient: "0.0.12345",
      amount: 1_000_000n,
      asset: "USDC",
    })

    // Without credentials, returns UNKNOWN (would execute with credentials)
    expect(result.status).toBe("UNKNOWN")
    expect(result.paymentId).toBe("pay_hedera_req_001")
  })

  it("denies payment to non-allowlisted recipient", async () => {
    const guard = new HederaPaymentGuard(policy)
    const client = new X402GuardedClient({ guard })

    const result = await client.requestPayment({
      requestId: "req_002",
      recipient: "0.0.99999",
      amount: 1_000_000n,
      asset: "USDC",
    })

    expect(result.status).toBe("DENIED")
    expect(result.reason).toBe("recipient_not_on_allowlist")
  })

  it("requires approval for large payments", async () => {
    const guard = new HederaPaymentGuard(policy)
    const client = new X402GuardedClient({ guard })

    const result = await client.requestPayment({
      requestId: "req_003",
      recipient: "0.0.12345",
      amount: 6_000_000n, // Exceeds 5 USDC approval threshold
      asset: "USDC",
    })

    expect(result.status).toBe("DENIED")
    expect(result.reason).toBe("approval_required")
  })

  it("allows approved payment after approval", async () => {
    const guard = new HederaPaymentGuard(policy)
    const client = new X402GuardedClient({ guard })

    // Request large payment
    const result1 = await client.requestPayment({
      requestId: "req_004",
      recipient: "0.0.12345",
      amount: 6_000_000n,
      asset: "USDC",
    })
    expect(result1.status).toBe("DENIED")
    expect(result1.reason).toBe("approval_required")

    // Approve it
    const result2 = await client.approvePayment(result1.paymentId)
    expect(result2.status).toBe("UNKNOWN") // Would execute with credentials
  })

  it("denies payment after denial", async () => {
    const guard = new HederaPaymentGuard(policy)
    const client = new X402GuardedClient({ guard })

    // Request large payment
    const result1 = await client.requestPayment({
      requestId: "req_005",
      recipient: "0.0.12345",
      amount: 6_000_000n,
      asset: "USDC",
    })
    expect(result1.status).toBe("DENIED")

    // Deny it
    const result2 = client.denyPayment(result1.paymentId)
    expect(result2.status).toBe("DENIED")
    expect(result2.reason).toBe("approval_denied")

    // Budget should be rolled back
    const status = guard.getStatus()
    expect(status.spentBudget).toBe(0n)
  })
})
