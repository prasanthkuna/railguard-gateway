import { describe, expect, test } from "bun:test"
import { DEVNET_USDC_MINT } from "./constants"
import { checkSolanaPayment, solanaRequestId, termsHash, toAtomic } from "./guard"
import { DEFAULT_DEVNET_POLICY } from "./rail"

const PAYEE = "SysvarRent111111111111111111111111111111111"
const intent = (amount: bigint, over: Record<string, unknown> = {}) => ({
  id: "vendor-acme:invoice-42",
  agentId: "agent_ap",
  senderOwner: "SysvarC1ock11111111111111111111111111111111",
  recipientOwner: PAYEE,
  mint: DEVNET_USDC_MINT,
  amount,
  purpose: "invoice 42",
  ...over,
})
const policy = DEFAULT_DEVNET_POLICY([PAYEE])

describe("Solana spend guard", () => {
  test("request id is deterministic per intent (the memo and idempotency key)", () => {
    expect(solanaRequestId("a")).toBe(solanaRequestId("a"))
    expect(solanaRequestId("a")).not.toBe(solanaRequestId("b"))
    expect(solanaRequestId("a")).toMatch(/^rg_[0-9a-f]{40}$/)
  })

  test("small payment to an allowed payee is allowed", () => {
    const d = checkSolanaPayment({ intent: intent(100_000n), policy, spentOrReservedToday: 0n })
    expect(d.decision).toBe("ALLOW")
  })

  test("unknown payee, wrong mint, caps and budget are denied with a next step", () => {
    const deny = (i: ReturnType<typeof intent>, spent = 0n) =>
      checkSolanaPayment({ intent: i, policy, spentOrReservedToday: spent })
    expect(
      deny(intent(1n, { recipientOwner: "So11111111111111111111111111111111111111112" })),
    ).toMatchObject({ code: "RECIPIENT_NOT_ALLOWED" })
    expect(deny(intent(1n, { mint: PAYEE }))).toMatchObject({ code: "MINT_NOT_ALLOWED" })
    expect(deny(intent(2_000_000n))).toMatchObject({ code: "PER_PAYMENT_CAP" })
    expect(deny(intent(400_000n), 2_800_000n)).toMatchObject({ code: "DAILY_BUDGET" })
    expect(deny(intent(0n))).toMatchObject({ code: "INVALID_AMOUNT" })
  })

  test("above the threshold needs a human approval bound to the exact terms", () => {
    const big = intent(800_000n)
    expect(checkSolanaPayment({ intent: big, policy, spentOrReservedToday: 0n })).toMatchObject({
      code: "APPROVAL_REQUIRED",
    })
    const approved = new Set([termsHash(big)])
    expect(
      checkSolanaPayment({
        intent: big,
        policy,
        spentOrReservedToday: 0n,
        approvedTermsHashes: approved,
      }).decision,
    ).toBe("ALLOW")
    // Same intent id, changed payee or amount: the approval no longer applies.
    expect(
      checkSolanaPayment({
        intent: intent(900_000n),
        policy,
        spentOrReservedToday: 0n,
        approvedTermsHashes: approved,
      }),
    ).toMatchObject({ code: "APPROVAL_REQUIRED" })
  })

  test("toAtomic parses decimal strings without floating point", () => {
    expect(toAtomic("0.01", 6)).toBe(10_000n)
    expect(toAtomic("1.25", 6)).toBe(1_250_000n)
    expect(toAtomic("3", 6)).toBe(3_000_000n)
    expect(() => toAtomic("0.0000001", 6)).toThrow()
    expect(() => toAtomic("-1", 6)).toThrow()
  })
})
