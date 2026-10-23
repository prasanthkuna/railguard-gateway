/** In-memory devnet double for unit tests: token accounts, signatures, finality and send faults. */
import { createHash } from "node:crypto"
import bs58 from "bs58"
import { GENESIS } from "./constants"
import type { SolanaRpc } from "./rpc"
import { SolanaRpcError } from "./rpc"

export type SendFault = "none" | "timeout_after_landing" | "timeout_not_landed" | "preflight_reject"

interface Landed {
  signature: string
  memo: string
  from: string
  to: string
  mint: string
  amount: bigint
  finalized: boolean
  slot: number
}

export function createFakeDevnet(input: {
  mint: string
  balances: Record<string, bigint>
  genesis?: string
}) {
  const landed: Landed[] = []
  let fault: SendFault = "none"
  let height = 1000
  let sends = 0
  const tokenAccount = (owner: string) =>
    bs58.encode(createHash("sha256").update(`ata:${owner}`).digest())

  function decode(wire: Uint8Array) {
    const signature = bs58.encode(wire.subarray(1, 65))
    const text = Buffer.from(wire).toString("latin1")
    const memo = /rg_[0-9a-f]{40}/.exec(text)?.[0] ?? ""
    return { signature, memo }
  }

  const rpc: SolanaRpc = {
    async call<T>(method: string, params: unknown[]): Promise<T> {
      const p = params as [unknown, unknown?, unknown?]
      switch (method) {
        case "getGenesisHash":
          return (input.genesis ?? GENESIS.devnet) as T
        case "getLatestBlockhash":
          return {
            value: {
              blockhash: "11111111111111111111111111111111",
              lastValidBlockHeight: height + 150,
            },
          } as T
        case "getBlockHeight":
          return height as T
        case "getTokenAccountsByOwner": {
          const owner = p[0] as string
          if (!(owner in input.balances)) return { value: [] } as T
          return {
            value: [
              {
                pubkey: tokenAccount(owner),
                account: {
                  data: {
                    parsed: {
                      info: {
                        owner,
                        mint: input.mint,
                        tokenAmount: { amount: String(input.balances[owner]), decimals: 6 },
                      },
                    },
                  },
                },
              },
            ],
          } as T
        }
        case "getSignaturesForAddress": {
          const owner = p[0] as string
          return landed
            .filter((l) => l.from === owner)
            .map((l) => ({
              signature: l.signature,
              memo: `[${l.memo.length}] ${l.memo}`,
              err: null,
              confirmationStatus: l.finalized ? "finalized" : "confirmed",
            })) as T
        }
        case "getSignatureStatuses": {
          const [sig] = p[0] as string[]
          const l = landed.find((x) => x.signature === sig)
          return {
            value: [
              l ? { confirmationStatus: l.finalized ? "finalized" : "confirmed", err: null } : null,
            ],
          } as T
        }
        case "getTransaction": {
          const l = landed.find((x) => x.signature === p[0])
          if (!l) return null as T
          const bal = (owner: string, amount: bigint, index: number) => ({
            accountIndex: index,
            mint: l.mint,
            owner,
            uiTokenAmount: { amount: String(amount), decimals: 6 },
          })
          return {
            slot: l.slot,
            blockTime: 1_800_000_000,
            meta: {
              err: null,
              preTokenBalances: [bal(l.from, 10_000_000n, 1), bal(l.to, 0n, 2)],
              postTokenBalances: [bal(l.from, 10_000_000n - l.amount, 1), bal(l.to, l.amount, 2)],
            },
            transaction: { message: { instructions: [{ program: "spl-memo", parsed: l.memo }] } },
          } as T
        }
        case "sendTransaction": {
          sends += 1
          const wire = Buffer.from(p[0] as string, "base64")
          const { signature, memo } = decode(wire)
          if (fault === "preflight_reject") {
            throw new SolanaRpcError("rpc_error_sendTransaction: simulation failed", false)
          }
          if (fault !== "timeout_not_landed") {
            landed.push({
              signature,
              memo,
              from: pending.from,
              to: pending.to,
              mint: input.mint,
              amount: pending.amount,
              finalized: false,
              slot: height,
            })
          }
          if (fault === "timeout_after_landing" || fault === "timeout_not_landed") {
            throw new SolanaRpcError("rpc_network_sendTransaction: TimeoutError", true)
          }
          return signature as T
        }
        default:
          throw new Error(`fake_devnet_unsupported_${method}`)
      }
    },
  }
  const pending = { from: "", to: "", amount: 0n }
  return {
    rpc,
    landed,
    get sends() {
      return sends
    },
    setFault: (f: SendFault) => {
      fault = f
    },
    expectTransfer: (from: string, to: string, amount: bigint) => {
      pending.from = from
      pending.to = to
      pending.amount = amount
    },
    finalizeAll: () => {
      for (const l of landed) l.finalized = true
    },
    advanceHeight: (n: number) => {
      height += n
    },
  }
}
