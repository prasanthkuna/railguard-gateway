import { describe, expect, test } from "bun:test"
import {
  assertIdempotentReplay,
  hashFinancialIntentInput,
  hashPaymentIntentCreateRequest,
  hashStoredFinancialIntent,
} from "../../packages/kernel/src/idempotency"
import { createFinancialIntent } from "../../packages/kernel/src/intent"

describe("v5 idempotency contracts", () => {
  test("payment intent create hash is invoice-scoped", () => {
    const a = hashPaymentIntentCreateRequest("inv_1")
    const b = hashPaymentIntentCreateRequest("inv_2")
    expect(a).not.toBe(b)
    assertIdempotentReplay("payment intent", a, a)
  })

  test("financial intent replay requires matching body", () => {
    const base = {
      principal: { organizationId: "org", actorId: "agent", actorType: "agent" as const },
      action: { type: "pay" as const },
      counterparty: { address: "0x1" },
      value: { amount: "10", asset: "USDC" },
      constraints: { expiresAt: "2099-01-01T00:00:00.000Z" },
      idempotencyKey: "idem-12345678",
    }
    const stored = createFinancialIntent(base, "fin_1")
    const mutated = { ...base, value: { amount: "11", asset: "USDC" } }
    expect(hashFinancialIntentInput(base)).toBe(hashStoredFinancialIntent(stored))
    expect(() =>
      assertIdempotentReplay(
        "financial intent",
        hashStoredFinancialIntent(stored),
        hashFinancialIntentInput(mutated),
      ),
    ).toThrow()
  })
})
