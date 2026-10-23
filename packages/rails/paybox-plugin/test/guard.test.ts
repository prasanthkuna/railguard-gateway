import { describe, expect, test } from "bun:test"
import { BASE_USDC, checkQuote, parseChallenge, policyFromEnv } from "../src/guard"

const PAYTO = "0x1111111111111111111111111111111111111111"
const policy = policyFromEnv({
  RAILGUARD_ALLOWED_HOSTS: "api.example.com",
  RAILGUARD_PER_CALL_CAP_ATOMIC: "50000",
})
const v1 = (amount: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    x402Version: 1,
    accepts: [
      { scheme: "exact", network: "base", asset: BASE_USDC, payTo: PAYTO, maxAmountRequired: amount, ...extra },
    ],
  })

describe("PayBox Railguard guard", () => {
  test("parses x402 v1 body and v2 header challenges", () => {
    expect(parseChallenge({ status: 402, bodyText: v1("10000") })).toMatchObject({
      ok: true,
      quote: { amount: "10000", version: 1 },
    })
    const v2 = btoa(
      JSON.stringify({
        x402Version: 2,
        accepts: [{ scheme: "exact", network: "eip155:8453", asset: BASE_USDC, payTo: PAYTO, amount: "20000" }],
      }),
    )
    expect(parseChallenge({ status: 402, headerPaymentRequired: v2 })).toMatchObject({
      ok: true,
      quote: { amount: "20000", version: 2 },
    })
  })

  test("non-402, other chains and fake USDC are not quotes", () => {
    expect(parseChallenge({ status: 200, bodyText: "{}" })).toMatchObject({ code: "NOT_A_402" })
    expect(parseChallenge({ status: 402, bodyText: v1("1", { network: "base-sepolia" }) })).toMatchObject({
      code: "NO_BASE_USDC_OPTION",
    })
    expect(
      parseChallenge({ status: 402, bodyText: v1("1", { asset: "0x2222222222222222222222222222222222222222" }) }),
    ).toMatchObject({ code: "NO_BASE_USDC_OPTION" })
    expect(parseChallenge({ status: 402, bodyText: "not json" })).toMatchObject({ code: "QUOTE_INVALID" })
  })

  test("allow within cap; deny host, cap and payee mismatch", async () => {
    const q = parseChallenge({ status: 402, bodyText: v1("10000") })
    if (!q.ok) throw new Error("parse")
    const ok = await checkQuote({ url: "https://api.example.com/x", purpose: "p", policy, quote: q.quote })
    expect(ok.decision).toBe("ALLOW")
    expect(ok.requestId).toMatch(/^rg_[0-9a-f]{40}$/)
    expect(
      await checkQuote({ url: "https://evil.example.net/x", purpose: "p", policy, quote: q.quote }),
    ).toMatchObject({ code: "HOST_NOT_ALLOWED" })
    const big = parseChallenge({ status: 402, bodyText: v1("60000") })
    if (!big.ok) throw new Error("parse")
    expect(
      await checkQuote({ url: "https://api.example.com/x", purpose: "p", policy, quote: big.quote }),
    ).toMatchObject({ code: "OVER_PER_CALL_CAP" })
    expect(
      await checkQuote({
        url: "https://api.example.com/x",
        purpose: "p",
        policy,
        quote: q.quote,
        expectedPayTo: "0x3333333333333333333333333333333333333333",
      }),
    ).toMatchObject({ code: "PAYEE_MISMATCH" })
  })

  test("http endpoints are never allowed", async () => {
    const q = parseChallenge({ status: 402, bodyText: v1("10000") })
    if (!q.ok) throw new Error("parse")
    expect(
      await checkQuote({ url: "http://api.example.com/x", purpose: "p", policy, quote: q.quote }),
    ).toMatchObject({ code: "HOST_NOT_ALLOWED" })
  })

  test("cap env must be atomic digits", () => {
    expect(() => policyFromEnv({ RAILGUARD_PER_CALL_CAP_ATOMIC: "0.1" })).toThrow()
    expect(policyFromEnv({}).perCallCap).toBe(100000n)
  })
})
