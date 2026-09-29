import { describe, expect, test } from "bun:test"
import {
  IdempotencyConflictError,
  assertIdempotentReplay,
  hashCanonicalPayload,
  hashFinancialIntentInput,
  hashStoredFinancialIntent,
  normalizeIdempotencyKey,
  stableStringify,
} from "./idempotency"
import { createFinancialIntent } from "./intent"

describe("idempotency", () => {
  test("stableStringify is key-order independent", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
  })

  test("normalizeIdempotencyKey trims and validates length", () => {
    expect(normalizeIdempotencyKey("  idem-key-1  ")).toBe("idem-key-1")
    expect(() => normalizeIdempotencyKey("short")).toThrow()
  })

  test("financial intent hash ignores id and idempotency key", () => {
    const input = {
      principal: { organizationId: "org_1", actorId: "a1", actorType: "agent" as const },
      action: { type: "pay" as const },
      counterparty: { address: "0xabc" },
      value: { amount: "100", asset: "USDC" },
      constraints: { expiresAt: "2099-01-01T00:00:00.000Z" },
      idempotencyKey: "idem-key-aaaaaaa",
    }
    const stored = createFinancialIntent(input, "fin_other_id")
    expect(hashFinancialIntentInput(input)).toBe(hashStoredFinancialIntent(stored))
  })

  test("payload mismatch throws conflict", () => {
    const a = hashCanonicalPayload({ amount: "1" })
    const b = hashCanonicalPayload({ amount: "2" })
    expect(() => assertIdempotentReplay("payment intent", a, b)).toThrow(IdempotencyConflictError)
    assertIdempotentReplay("payment intent", a, a)
  })
})
