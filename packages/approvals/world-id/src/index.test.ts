import { describe, expect, it } from "bun:test"
import { WorldIdApprovalService } from "./index"

describe("WorldIdApprovalService", () => {
  const service = new WorldIdApprovalService({
    appId: "app_test",
    action: "payment-approval",
  })

  it("creates verification request with signal", () => {
    const request = service.createVerificationRequest({
      paymentId: "pay_001",
      amount: "6000000",
      asset: "USDC",
      recipient: "0.0.12345",
    })

    expect(request.appId).toBe("app_test")
    expect(request.action).toBe("payment-approval")
    expect(request.signal).toContain("pay_001")
    expect(request.signal).toContain("6000000")
  })

  it("requires API key for verification", async () => {
    const result = await service.verifyProof({
      paymentId: "pay_002",
      amount: "6000000",
      asset: "USDC",
      recipient: "0.0.12345",
      proof: {
        merkle_root: "0x123",
        nullifier_hash: "0x456",
        proof: "0x789",
        credential_type: "orb",
        verification_level: "orb",
      },
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toContain("credentials_missing")
  })

  it("validates proof structure", async () => {
    const serviceWithKey = new WorldIdApprovalService({
      appId: "app_test",
      action: "payment-approval",
      apiKey: "test_key",
    })

    const result = await serviceWithKey.verifyProof({
      paymentId: "pay_003",
      amount: "6000000",
      asset: "USDC",
      recipient: "0.0.12345",
      proof: {
        merkle_root: "0x123",
        nullifier_hash: "0x456",
        proof: "0x789",
        credential_type: "orb",
        verification_level: "orb",
      },
    })

    // Without real API, returns not implemented
    expect(result.verified).toBe(false)
    expect(result.reason).toContain("not_implemented")
  })
})
