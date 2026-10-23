import { describe, expect, test } from "bun:test"
import {
  STELLAR_TESTNET_EVIDENCE_TX,
  STELLAR_TESTNET_USDC_ASSET,
  parseStellarAsset,
  verifyStellarTestnetPayment,
} from "./stellar-testnet"

const RUN_LIVE = process.env.TESTNET_INTEGRATION === "1"

describe("Stellar testnet (Horizon)", () => {
  test.skipIf(!RUN_LIVE)("verifies grant evidence payment on testnet", async () => {
    const result = await verifyStellarTestnetPayment({
      txHash: STELLAR_TESTNET_EVIDENCE_TX,
      expectedDestination: "GB2VOBJNNP4ZC3LNJBDJ6CMD3PC2FJFI24MOCE4W6LDMVPSCMYYN6NIG",
      expectedAmount: "1.0000000",
      expectedMemo: "PI:pi-testnet-evidence",
    })
    expect(result.status).toBe("CONFIRMED")
  })
})

describe("Stellar payment asset binding (offline)", () => {
  const usdcPayment = {
    type: "payment",
    from: "GDX7EBCAC4NVLPBE4TGDNEUEA2TAGOYCKELCQP245YMHA66GV6PIDLP5",
    to: "GATQQK34YWBIHF3KTSFL4EFEPTIFH5UJK347CLKAJGYO437KRKTU22VO",
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: STELLAR_TESTNET_USDC_ASSET.issuer,
    amount: "1.2500000",
  }
  const stub = (record: Record<string, unknown>) =>
    (async (url: string | URL | Request) => {
      const body = String(url).includes("/operations")
        ? { _embedded: { records: [record] } }
        : { successful: true, memo: "rg_req" }
      return new Response(JSON.stringify(body), { status: 200 })
    }) as typeof fetch

  test("Circle testnet USDC payment is CONFIRMED when asset matches", async () => {
    const r = await verifyStellarTestnetPayment({
      txHash: "t",
      expectedAsset: STELLAR_TESTNET_USDC_ASSET,
      expectedAmount: "1.2500000",
      expectedDestination: usdcPayment.to,
      fetchImpl: stub(usdcPayment),
    })
    expect(r.status).toBe("CONFIRMED")
    expect(r.facts?.assetIssuer).toBe(STELLAR_TESTNET_USDC_ASSET.issuer)
  })

  test("same code from a different issuer is not CONFIRMED", async () => {
    const fake = { ...usdcPayment, asset_issuer: usdcPayment.from }
    const r = await verifyStellarTestnetPayment({
      txHash: "t",
      expectedAsset: STELLAR_TESTNET_USDC_ASSET,
      fetchImpl: stub(fake),
    })
    expect(r.status).toBe("RECONCILIATION_REQUIRED")
    expect(r.reason).toBe("asset_mismatch")
  })

  test("XLM payment does not satisfy a USDC intent, and vice versa", async () => {
    const xlm = {
      ...usdcPayment,
      asset_type: "native",
      asset_code: undefined,
      asset_issuer: undefined,
    }
    const a = await verifyStellarTestnetPayment({
      txHash: "t",
      expectedAsset: STELLAR_TESTNET_USDC_ASSET,
      fetchImpl: stub(xlm),
    })
    expect(a.reason).toBe("asset_mismatch")
    const b = await verifyStellarTestnetPayment({
      txHash: "t",
      expectedAsset: "native",
      fetchImpl: stub(usdcPayment),
    })
    expect(b.reason).toBe("asset_mismatch")
  })

  test("parseStellarAsset handles native and CODE:ISSUER", () => {
    expect(parseStellarAsset("native")).toBe("native")
    expect(parseStellarAsset("XLM")).toBe("native")
    expect(parseStellarAsset(`USDC:${STELLAR_TESTNET_USDC_ASSET.issuer}`)).toEqual(
      STELLAR_TESTNET_USDC_ASSET,
    )
    expect(parseStellarAsset(undefined)).toBeUndefined()
    expect(() => parseStellarAsset("USDC")).toThrow()
  })
})
