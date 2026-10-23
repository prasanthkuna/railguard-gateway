import { describe, expect, test } from "bun:test"
import { DEVNET_USDC_MINT } from "./constants"
import { createFakeDevnet } from "./fakeDevnet"
import { DEFAULT_DEVNET_POLICY, createSolanaRail } from "./rail"
import { newTestSecretKey } from "./testKeys"
import { signerFromSecretKey } from "./tx"
import { createSolanaX402Seller, encodePaymentHeader, quoteRequirements } from "./x402"

const SELLER = "SysvarRent111111111111111111111111111111111"

describe("x402-style exact payment on Solana devnet", () => {
  test("402 quote -> guarded pay with bound memo -> seller verifies once, replay refused", async () => {
    const buyer = signerFromSecretKey(newTestSecretKey())
    const net = createFakeDevnet({
      mint: DEVNET_USDC_MINT,
      balances: { [buyer.publicKey]: 10_000_000n, [SELLER]: 0n },
    })
    const seller = createSolanaX402Seller({ rpc: net.rpc })
    const q = seller.quote(
      quoteRequirements({
        resource: "/v1/fx-report",
        payTo: SELLER,
        amountAtomic: 10_000n,
        nonce: "n1",
        description: "FX report",
      }),
    )
    net.expectTransfer(buyer.publicKey, SELLER, 10_000n)
    const rail = createSolanaRail({
      rpc: net.rpc,
      signer: buyer,
      policy: DEFAULT_DEVNET_POLICY([SELLER]),
    })
    const paid = await rail.pay({
      id: `x402:${q.extra.nonce}`,
      agentId: "buyer",
      senderOwner: buyer.publicKey,
      recipientOwner: q.payTo,
      mint: q.asset,
      amount: BigInt(q.maxAmountRequired),
      purpose: q.description,
    })
    expect(paid.attempt.requestId).toBe(q.extra.memo)
    const header = encodePaymentHeader(paid.attempt.signature as string, "n1")
    expect(await seller.settle(header)).toEqual({ ok: true })
    expect(await seller.settle(header)).toMatchObject({ ok: false })
  })

  test("payment to a seller outside the allowlist is never made", async () => {
    const buyer = signerFromSecretKey(newTestSecretKey())
    const net = createFakeDevnet({
      mint: DEVNET_USDC_MINT,
      balances: { [buyer.publicKey]: 10_000_000n },
    })
    const rail = createSolanaRail({
      rpc: net.rpc,
      signer: buyer,
      policy: DEFAULT_DEVNET_POLICY([]),
    })
    const r = await rail.pay({
      id: "x402:n2",
      agentId: "buyer",
      senderOwner: buyer.publicKey,
      recipientOwner: SELLER,
      mint: DEVNET_USDC_MINT,
      amount: 10_000n,
      purpose: "p",
    })
    expect(r.decision).toMatchObject({ code: "RECIPIENT_NOT_ALLOWED" })
    expect(net.sends).toBe(0)
  })
})
