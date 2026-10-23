import { describe, expect, test } from "bun:test"
import { DEVNET_USDC_MINT, GENESIS } from "./constants"
import { createFakeDevnet } from "./fakeDevnet"
import { DEFAULT_DEVNET_POLICY, createSolanaRail } from "./rail"
import { newTestSecretKey } from "./testKeys"
import { signerFromSecretKey } from "./tx"

const PAYEE = "SysvarRent111111111111111111111111111111111"

function setup() {
  const signer = signerFromSecretKey(newTestSecretKey())
  const net = createFakeDevnet({
    mint: DEVNET_USDC_MINT,
    balances: { [signer.publicKey]: 10_000_000n, [PAYEE]: 0n },
  })
  const rail = createSolanaRail({ rpc: net.rpc, signer, policy: DEFAULT_DEVNET_POLICY([PAYEE]) })
  const intent = {
    id: "vendor-acme:invoice-42",
    agentId: "agent_ap",
    senderOwner: signer.publicKey,
    recipientOwner: PAYEE,
    mint: DEVNET_USDC_MINT,
    amount: 10_000n,
    purpose: "invoice 42",
  }
  net.expectTransfer(signer.publicKey, PAYEE, intent.amount)
  return { signer, net, rail, intent }
}

describe("Solana guarded rail", () => {
  test("happy path: sent, then CONFIRMED only after finality", async () => {
    const { net, rail, intent } = setup()
    const r = await rail.pay(intent)
    expect(r.attempt.state).toBe("SUBMITTED")
    expect((await rail.reconcile(r.attempt.requestId)).state).toBe("SUBMITTED") // confirmed, not final
    net.finalizeAll()
    expect((await rail.reconcile(r.attempt.requestId)).state).toBe("CONFIRMED")
    expect(net.sends).toBe(1)
  })

  test("timeout after broadcast is UNKNOWN; agent retry and queue redelivery never send again", async () => {
    const { net, rail, intent } = setup()
    net.setFault("timeout_after_landing")
    const first = await rail.pay(intent)
    expect(first.attempt.state).toBe("UNKNOWN")
    net.setFault("none")
    await rail.pay(intent) // agent "pays again"
    await rail.pay({ ...intent }) // queue redelivers the same job
    expect(net.sends).toBe(1)
    net.finalizeAll()
    const done = await rail.reconcile(first.attempt.requestId)
    expect(done.state).toBe("CONFIRMED")
    expect(net.landed).toHaveLength(1)
  })

  test("UNKNOWN keeps the budget frozen until it resolves", async () => {
    const { signer, net, intent } = setup()
    const policy = { ...DEFAULT_DEVNET_POLICY([PAYEE]), dailyBudget: 1_000_000n }
    const rail = createSolanaRail({ rpc: net.rpc, signer, policy })
    net.setFault("timeout_not_landed")
    expect((await rail.pay({ ...intent, id: "a", amount: 400_000n })).attempt.state).toBe("UNKNOWN")
    expect((await rail.pay({ ...intent, id: "b", amount: 400_000n })).attempt.state).toBe("UNKNOWN")
    // 0.8 USDC is frozen in UNKNOWN attempts, so another 0.4 would break the 1.0 daily budget.
    const third = await rail.pay({ ...intent, id: "c", amount: 400_000n })
    expect(third.decision).toMatchObject({ code: "DAILY_BUDGET" })
    expect(net.sends).toBe(2)
  })

  test("not landed + blockhash expired => FAILED_SAFE; the resend reuses the same memo", async () => {
    const { net, rail, intent } = setup()
    net.setFault("timeout_not_landed")
    const first = await rail.pay(intent)
    expect(first.attempt.state).toBe("UNKNOWN")
    expect((await rail.reconcile(first.attempt.requestId)).state).toBe("UNKNOWN")
    net.advanceHeight(151)
    first.attempt.signature = undefined // the old signature was never seen on chain
    expect((await rail.reconcile(first.attempt.requestId)).state).toBe("FAILED_SAFE")
    net.setFault("none")
    const again = await rail.pay(intent)
    expect(again.attempt.requestId).toBe(first.attempt.requestId)
    expect(again.attempt.state).toBe("SUBMITTED")
    expect(net.landed).toHaveLength(1)
  })

  test("lost local ledger: a new process finds the earlier payment by memo and does not pay twice", async () => {
    const { signer, net, intent } = setup()
    const a = createSolanaRail({ rpc: net.rpc, signer, policy: DEFAULT_DEVNET_POLICY([PAYEE]) })
    await a.pay(intent)
    net.finalizeAll()
    const b = createSolanaRail({ rpc: net.rpc, signer, policy: DEFAULT_DEVNET_POLICY([PAYEE]) })
    const r = await b.pay(intent)
    expect(r.attempt.state).toBe("CONFIRMED")
    expect(net.sends).toBe(1)
  })

  test("preflight rejection is FAILED_SAFE (never broadcast) and releases the budget", async () => {
    const { net, rail, intent } = setup()
    net.setFault("preflight_reject")
    const r = await rail.pay(intent)
    expect(r.attempt.state).toBe("FAILED_SAFE")
    expect(net.landed).toHaveLength(0)
  })

  test("payee without a token account is refused before signing", async () => {
    const signer = signerFromSecretKey(newTestSecretKey())
    const net = createFakeDevnet({
      mint: DEVNET_USDC_MINT,
      balances: { [signer.publicKey]: 10_000_000n },
    })
    const rail = createSolanaRail({ rpc: net.rpc, signer, policy: DEFAULT_DEVNET_POLICY([PAYEE]) })
    const r = await rail.pay({
      id: "x",
      agentId: "a",
      senderOwner: signer.publicKey,
      recipientOwner: PAYEE,
      mint: DEVNET_USDC_MINT,
      amount: 1n,
      purpose: "p",
    })
    expect(r.attempt.reason).toBe("recipient_token_account_missing")
    expect(net.sends).toBe(0)
  })

  test("refuses mainnet and unknown clusters", async () => {
    const signer = signerFromSecretKey(newTestSecretKey())
    const net = createFakeDevnet({ mint: DEVNET_USDC_MINT, balances: {}, genesis: GENESIS.mainnet })
    const rail = createSolanaRail({ rpc: net.rpc, signer, policy: DEFAULT_DEVNET_POLICY([PAYEE]) })
    await expect(
      rail.pay({
        id: "x",
        agentId: "a",
        senderOwner: signer.publicKey,
        recipientOwner: PAYEE,
        mint: DEVNET_USDC_MINT,
        amount: 1n,
        purpose: "p",
      }),
    ).rejects.toThrow("refusing_non_devnet_cluster:mainnet")
  })
})
