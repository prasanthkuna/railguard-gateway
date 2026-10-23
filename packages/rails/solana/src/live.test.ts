import { describe, expect, test } from "bun:test"
import { DEVNET_RPC_URL, DEVNET_USDC_MINT } from "./constants"
import { createSolanaRpc, detectCluster } from "./rpc"
import { verifySolanaSplPayment } from "./verifier"

const RUN_LIVE = process.env.TESTNET_INTEGRATION === "1"
const url = process.env.SOLANA_DEVNET_RPC_URL?.trim() || DEVNET_RPC_URL

type Bal = { accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } }

describe("Solana devnet (live, read-only)", () => {
  test.skipIf(!RUN_LIVE)("RPC is devnet by genesis hash", async () => {
    expect(await detectCluster(createSolanaRpc({ url }))).toBe("devnet")
  })

  test.skipIf(!RUN_LIVE)(
    "verifies a recent real devnet USDC transfer and rejects a wrong amount",
    async () => {
      const rpc = createSolanaRpc({ url })
      const sigs = await rpc.call<Array<{ signature: string; err: unknown }>>(
        "getSignaturesForAddress",
        [DEVNET_USDC_MINT, { limit: 25, commitment: "finalized" }],
      )
      for (const s of sigs) {
        if (s.err) continue
        const tx = await rpc.call<{
          meta: { preTokenBalances?: Bal[]; postTokenBalances?: Bal[] } | null
        } | null>("getTransaction", [
          s.signature,
          { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
        ])
        // Net change per owner (an owner can hold several USDC accounts in one transaction).
        const net = new Map<string, bigint>()
        const add = (rows: Bal[] | undefined, sign: bigint) => {
          for (const b of rows ?? []) {
            if (b.mint !== DEVNET_USDC_MINT || !b.owner) continue
            net.set(b.owner, (net.get(b.owner) ?? 0n) + sign * BigInt(b.uiTokenAmount.amount))
          }
        }
        add(tx?.meta?.postTokenBalances, 1n)
        add(tx?.meta?.preTokenBalances, -1n)
        const gain = [...net].map(([owner, d]) => ({ owner, d })).find((x) => x.d > 0n)
        if (!gain) continue
        const expected = { mint: DEVNET_USDC_MINT, recipientOwner: gain.owner, amount: gain.d }
        const ok = await verifySolanaSplPayment({ rpc, signature: s.signature, expected })
        expect(`${ok.status}:${ok.reason ?? ""}`).toBe("CONFIRMED:")
        const bad = await verifySolanaSplPayment({
          rpc,
          signature: s.signature,
          expected: { ...expected, amount: gain.d + 1n },
        })
        expect(bad.reason).toBe("recipient_amount_mismatch")
        return
      }
      throw new Error("no recent devnet USDC transfer found")
    },
    60_000,
  )
})
