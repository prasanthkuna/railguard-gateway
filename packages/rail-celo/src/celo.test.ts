import { describe, expect, test } from "bun:test"
import { type Address, keccak256, toHex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createScriptedCeloModel } from "./agent"
import {
  CELO_SEPOLIA,
  MainnetDisabledError,
  assertCeloTestnet,
  atomicToUsdc,
  usdcToAtomic,
} from "./chain"
import { runCeloDemo } from "./demo"
import { paymentIdentifierFor, railguardNonce } from "./eip3009"
import { erc8021Schema0Suffix, erc8021Schema2Suffix, parseSchema0Codes } from "./erc8021"
import { createCeloPaymentGuard } from "./guard"
import { createStaticResolver, registerCalldata } from "./identity"
import { createCeloX402Rail } from "./rail"
import { createX402Seller } from "./seller"
import { createHttpFacilitator, createSimulatedCelo } from "./simulator"
import { verifyCeloUsdcSettlement } from "./verifier"

const acct = (l: string) => privateKeyToAccount(keccak256(toHex(`test-${l}`)))
const buyer = acct("buyer")
const seller = acct("seller").address
const attacker = acct("attacker").address
const ORIGIN = "http://desk.test"

function stack(opts: { now?: () => Date; daily?: bigint } = {}) {
  let clock = opts.now ? opts.now().getTime() : Date.parse("2026-10-24T10:00:00Z")
  const now = () => new Date(clock)
  const chain = createSimulatedCelo({ now })
  chain.fund(buyer.address, 1_000_000n)
  const sellerSrv = createX402Seller({
    payTo: seller,
    facilitator: chain.facilitator,
    routes: [
      { path: "/fx", amount: "10000", description: "fx", handler: () => ({ rate: 5.42 }) },
      {
        path: "/spoof",
        amount: "10000",
        description: "spoof",
        handler: () => ({}),
        payToOverride: attacker,
      },
      {
        path: "/main",
        amount: "10000",
        description: "main",
        handler: () => ({}),
        networkOverride: "eip155:42220",
      },
    ],
  })
  let drop = false
  let dropBefore = false
  const fetcher = async (url: string, init?: RequestInit) => {
    const paid = new Headers(init?.headers).has("PAYMENT-SIGNATURE")
    if (paid && dropBefore) {
      dropBefore = false
      throw new Error("network down before the seller")
    }
    const res = await sellerSrv.fetch(new Request(url, init))
    if (paid && drop) {
      drop = false
      throw new Error("response lost")
    }
    return res
  }
  const guard = createCeloPaymentGuard({
    agentId: "test-agent",
    payer: buyer.address,
    perCallMaxAtomic: 50_000n,
    dailyMaxAtomic: opts.daily ?? 100_000n,
    sellers: [{ origin: ORIGIN, agentId: 7n, name: "Desk" }],
    resolver: createStaticResolver([{ agentId: 7n, wallet: seller }]),
  })
  const rail = createCeloX402Rail({
    account: buyer,
    guard,
    reader: chain.reader,
    fetch: fetcher,
    now,
  })
  return {
    chain,
    rail,
    sellerSrv,
    dropNext: () => {
      drop = true
    },
    dropBeforeNext: () => {
      dropBefore = true
    },
    advance: (s: number) => {
      clock += s * 1000
    },
  }
}

describe("celo basics", () => {
  test("testnet only: Celo mainnet is refused", () => {
    expect(() => assertCeloTestnet("eip155:42220")).toThrow(MainnetDisabledError)
    expect(() => assertCeloTestnet(CELO_SEPOLIA.caip2)).not.toThrow()
    expect(() => createHttpFacilitator({ url: "https://api.x402.celo.org" })).toThrow(
      /mainnet facilitator/,
    )
  })

  test("USDC 6-decimal conversions", () => {
    expect(usdcToAtomic("0.01")).toBe(10_000n)
    expect(atomicToUsdc(2_500_000n)).toBe("2.500000")
  })

  test("nonce and payment-identifier are deterministic per intent", () => {
    expect(railguardNonce("a")).toBe(railguardNonce("a"))
    expect(railguardNonce("a")).not.toBe(railguardNonce("b"))
    expect(railguardNonce("a")).toMatch(/^0x[0-9a-f]{64}$/)
    const id = paymentIdentifierFor("a")
    expect(id.length).toBeGreaterThanOrEqual(16)
    expect(id.length).toBeLessThanOrEqual(128)
  })

  test("ERC-8021 schema 0 matches the spec vector and round-trips", () => {
    expect(erc8021Schema0Suffix("baseapp")).toBe(
      "0x62617365617070070080218021802180218021802180218021",
    )
    expect(erc8021Schema0Suffix(["baseapp", "morpho"])).toBe(
      "0x626173656170702c6d6f7270686f0e0080218021802180218021802180218021",
    )
    const data = registerCalldata("data:application/json;base64,e30=", "railguard")
    expect(parseSchema0Codes(data)).toEqual(["railguard"])
    expect(erc8021Schema2Suffix({ a: "my_app" })).toBe(
      "0xa16161666d795f617070000a0280218021802180218021802180218021",
    )
  })
})

describe("celo x402 rail", () => {
  test("happy path: pays once, verifier checks Transfer + AuthorizationUsed, receipt carries tx", async () => {
    const s = stack()
    const out = await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t1" })
    expect(out.status).toBe("CONFIRMED")
    if (!("attempt" in out)) throw new Error("no attempt")
    expect(out.attempt.verify?.checks).toMatchObject({ receipt: true, transfer: true, nonce: true })
    expect(s.chain.settlements()).toBe(1)
  })

  test("response lost after settle: UNKNOWN, retry blocked, reconcile finds the nonce on-chain", async () => {
    const s = stack()
    s.dropNext()
    const out = await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t2" })
    expect(out.status).toBe("UNKNOWN")
    expect((await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t2" })).status).toBe(
      "BLOCKED_DUPLICATE",
    )
    const a = await s.rail.reconcile("exec_t2")
    expect(a.state).toBe("CONFIRMED")
    expect(a.replays).toBe(0)
    expect(s.chain.settlements()).toBe(1)
  })

  test("request never reached the seller: replay of the SAME signed payload pays exactly once", async () => {
    const s = stack()
    s.dropBeforeNext()
    expect((await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t3" })).status).toBe("UNKNOWN")
    expect(s.chain.settlements()).toBe(0)
    const a = await s.rail.reconcile("exec_t3")
    expect(a.state).toBe("CONFIRMED")
    expect(a.replays).toBe(1)
    await s.rail.reconcile("exec_t3")
    expect(s.chain.settlements()).toBe(1)
  })

  test("UNKNOWN freezes the budget; an expired unused authorization is FAILED_SAFE and releases it", async () => {
    const s = stack({ daily: 15_000n })
    s.dropBeforeNext()
    await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t4" })
    const second = await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t5" })
    expect(second).toMatchObject({ status: "DENIED", code: "DAILY_BUDGET" })
    s.advance(400) // past validBefore
    const a = await s.rail.reconcile("exec_t4", { replay: false })
    expect(a.state).toBe("FAILED_SAFE")
    expect((await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t6" })).status).toBe("CONFIRMED")
  })

  test("payTo different from the seller's ERC-8004 wallet is refused before signing", async () => {
    const s = stack()
    expect(await s.rail.pay({ url: `${ORIGIN}/spoof`, intentId: "t7" })).toMatchObject({
      status: "DENIED",
      code: "PAYEE_IDENTITY_MISMATCH",
    })
    expect(s.rail.listAttempts()).toHaveLength(0)
  })

  test("a 402 asking for Celo mainnet is refused", async () => {
    const s = stack()
    expect(await s.rail.pay({ url: `${ORIGIN}/main`, intentId: "t8" })).toMatchObject({
      status: "DENIED",
      code: "MAINNET_DISABLED",
    })
  })

  test("unbound seller and per-call cap", async () => {
    const s = stack()
    expect(await s.rail.pay({ url: "http://other.test/fx", intentId: "t9" })).toMatchObject({
      status: "DENIED",
      code: "UNVERIFIED_SELLER",
    })
    const g = createCeloPaymentGuard({
      agentId: "a",
      payer: buyer.address,
      perCallMaxAtomic: 5_000n,
      dailyMaxAtomic: 100_000n,
      sellers: [{ origin: ORIGIN, agentId: 7n, name: "Desk" }],
      resolver: createStaticResolver([{ agentId: 7n, wallet: seller }]),
    })
    const req = s.sellerSrv.requirementsFor({
      path: "/fx",
      amount: "10000",
      description: "fx",
      handler: () => ({}),
    })
    const d = await g.evaluate({
      required: { x402Version: 2, resource: { url: `${ORIGIN}/fx` }, accepts: [req] },
      url: `${ORIGIN}/fx`,
      intentId: "x",
    })
    expect(d).toMatchObject({ allow: false, code: "PER_CALL_CAP" })
    const u = await g.evaluate({
      required: { x402Version: 2, resource: { url: "http://x.test/fx" }, accepts: [req] },
      url: "http://x.test/fx",
      intentId: "y",
    })
    expect(u).toMatchObject({ allow: false, code: "UNVERIFIED_SELLER" })
  })

  test("verifier flags a transfer to the wrong address as MISMATCH", async () => {
    const s = stack()
    const out = await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t10" })
    if (!("attempt" in out) || !out.attempt.txHash) throw new Error("no tx")
    const v = await verifyCeloUsdcSettlement(s.chain.reader, {
      txHash: out.attempt.txHash,
      token: CELO_SEPOLIA.usdc.address,
      from: buyer.address,
      to: attacker as Address,
      value: 10_000n,
      nonce: out.attempt.nonce,
    })
    expect(v.status).toBe("MISMATCH")
    expect(v.mismatch).toContain("payTo")
  })

  test("seller payment-identifier: same id + same payload returns the cached response", async () => {
    const s = stack()
    s.dropNext()
    await s.rail.pay({ url: `${ORIGIN}/fx`, intentId: "t11" })
    // Force a replay path: reconcile first sees the nonce used, so no replay is needed.
    expect((await s.rail.reconcile("exec_t11")).state).toBe("CONFIRMED")
    expect(s.sellerSrv.stats.paid).toBe(1)
  })
})

describe("celo demo", () => {
  test("offline story: 2 paid, 3 refused, retry blocked and reconciled, one payment per intent", async () => {
    const r = await runCeloDemo({ model: createScriptedCeloModel(), volume: 2 })
    expect(r.invariantOnePaymentPerIntent).toBe(true)
    expect(r.volume.confirmedPayments).toBe(4)
    const codes = r.steps.flatMap((s) => s.outcomes.map((o) => o.code ?? o.status))
    expect(codes).toEqual(
      expect.arrayContaining([
        "UNKNOWN",
        "PER_CALL_CAP",
        "PAYEE_IDENTITY_MISMATCH",
        "MAINNET_DISABLED",
        "BLOCKED_DUPLICATE",
        "CONFIRMED",
      ]),
    )
  })
})
