import { describe, it, expect } from "bun:test"
import { HcsAuditLog } from "./hcsAudit"

describe("HcsAuditLog", () => {
  it("creates hash-chained entries", () => {
    const log = new HcsAuditLog({
      topicId: "0.0.12345",
      accountId: "0.0.67890",
    })

    const entry1 = log.createEntry({
      decision: "ALLOW",
      requestId: "req_001",
      amount: "1000000",
      asset: "USDC",
      recipient: "0.0.11111",
    })

    const entry2 = log.createEntry({
      decision: "CONFIRMED",
      requestId: "req_001",
      amount: "1000000",
      asset: "USDC",
      recipient: "0.0.11111",
      transactionId: "0.0.67890@1635360000.123456789",
    })

    // First entry chains from genesis
    expect(entry1.prevHash).toBe("genesis")
    expect(entry1.hash).toBeTruthy()
    expect(entry1.hash.length).toBe(64) // SHA-256 hex

    // Second entry chains from first
    expect(entry2.prevHash).toBe(entry1.hash)
    expect(entry2.hash).toBeTruthy()
    expect(entry2.hash).not.toBe(entry1.hash)
  })

  it("verifies chain integrity", () => {
    const log = new HcsAuditLog({
      topicId: "0.0.12345",
      accountId: "0.0.67890",
    })

    const entry1 = log.createEntry({
      decision: "DENY",
      requestId: "req_002",
      amount: "5000000",
      asset: "USDC",
      recipient: "0.0.99999",
      reason: "recipient_not_on_allowlist",
    })

    const entry2 = log.createEntry({
      decision: "ALLOW",
      requestId: "req_003",
      amount: "2000000",
      asset: "USDC",
      recipient: "0.0.22222",
    })

    const result = log.verifyChain([entry1, entry2])
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("detects tampered entries", () => {
    const log = new HcsAuditLog({
      topicId: "0.0.12345",
      accountId: "0.0.67890",
    })

    const entry1 = log.createEntry({
      decision: "ALLOW",
      requestId: "req_004",
      amount: "1000000",
      asset: "USDC",
      recipient: "0.0.33333",
    })

    const entry2 = log.createEntry({
      decision: "CONFIRMED",
      requestId: "req_004",
      amount: "1000000",
      asset: "USDC",
      recipient: "0.0.33333",
    })

    // Tamper with entry2's amount
    const tamperedEntry2 = { ...entry2, amount: "9999999" }

    const result = log.verifyChain([entry1, tamperedEntry2])
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain("hash mismatch")
  })

  it("detects broken chain", () => {
    const log = new HcsAuditLog({
      topicId: "0.0.12345",
      accountId: "0.0.67890",
    })

    const entry1 = log.createEntry({
      decision: "ALLOW",
      requestId: "req_005",
      amount: "1000000",
      asset: "USDC",
      recipient: "0.0.44444",
    })

    const entry2 = log.createEntry({
      decision: "CONFIRMED",
      requestId: "req_005",
      amount: "1000000",
      asset: "USDC",
      recipient: "0.0.44444",
    })

    // Break the chain by modifying prevHash
    const brokenEntry2 = { ...entry2, prevHash: "invalid" }

    const result = log.verifyChain([entry1, brokenEntry2])
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("prevHash mismatch")
  })
})
