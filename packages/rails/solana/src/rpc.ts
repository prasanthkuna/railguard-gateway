/** Tiny JSON-RPC client for the Solana calls the rail needs. URLs with API keys are never logged. */
import { GENESIS, type SolanaCluster } from "./constants"

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export class SolanaRpcError extends Error {
  constructor(
    message: string,
    /** true when the outcome of a send is unknown (timeout, 5xx, network): never treat as failed. */
    readonly ambiguous: boolean,
  ) {
    super(message)
  }
}

export interface SolanaRpc {
  call<T>(method: string, params: unknown[]): Promise<T>
}

export function createSolanaRpc(options: {
  url: string
  fetch?: FetchLike
  timeoutMs?: number
}): SolanaRpc {
  const f = options.fetch ?? (fetch as FetchLike)
  let id = 0
  return {
    async call<T>(method: string, params: unknown[]): Promise<T> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000)
      let res: Response
      try {
        res = await f(options.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
          signal: controller.signal,
        })
      } catch (err) {
        throw new SolanaRpcError(`rpc_network_${method}: ${(err as Error).name}`, true)
      } finally {
        clearTimeout(timer)
      }
      if (res.status >= 500 || res.status === 429) {
        throw new SolanaRpcError(`rpc_http_${res.status}_${method}`, true)
      }
      if (!res.ok) throw new SolanaRpcError(`rpc_http_${res.status}_${method}`, false)
      const body = (await res.json()) as { result?: T; error?: { code: number; message: string } }
      if (body.error) {
        throw new SolanaRpcError(`rpc_error_${method}: ${body.error.message}`, false)
      }
      return body.result as T
    },
  }
}

/** Ask the endpoint which cluster it serves. The rail refuses anything that is not devnet. */
export async function detectCluster(rpc: SolanaRpc): Promise<SolanaCluster | "unknown"> {
  const hash = await rpc.call<string>("getGenesisHash", [])
  for (const [cluster, genesis] of Object.entries(GENESIS)) {
    if (genesis === hash) return cluster as SolanaCluster
  }
  return "unknown"
}

export async function assertDevnet(rpc: SolanaRpc): Promise<void> {
  const cluster = await detectCluster(rpc)
  if (cluster !== "devnet") throw new Error(`refusing_non_devnet_cluster:${cluster}`)
}

export interface ParsedTokenAccount {
  pubkey: string
  owner: string
  mint: string
  amount: bigint
  decimals: number
}

export async function getTokenAccountsByOwner(
  rpc: SolanaRpc,
  owner: string,
  mint: string,
): Promise<ParsedTokenAccount[]> {
  type Row = {
    pubkey: string
    account: {
      data: {
        parsed: {
          info: { owner: string; mint: string; tokenAmount: { amount: string; decimals: number } }
        }
      }
    }
  }
  const res = await rpc.call<{ value: Row[] }>("getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ])
  return res.value.map((r) => {
    const info = r.account.data.parsed.info
    return {
      pubkey: r.pubkey,
      owner: info.owner,
      mint: info.mint,
      amount: BigInt(info.tokenAmount.amount),
      decimals: info.tokenAmount.decimals,
    }
  })
}

export interface SignatureInfo {
  signature: string
  memo: string | null
  err: unknown
  confirmationStatus?: "processed" | "confirmed" | "finalized" | null
}

export async function getSignaturesForAddress(
  rpc: SolanaRpc,
  address: string,
  limit = 50,
): Promise<SignatureInfo[]> {
  return rpc.call<SignatureInfo[]>("getSignaturesForAddress", [
    address,
    { limit, commitment: "confirmed" },
  ])
}

export async function getLatestBlockhash(
  rpc: SolanaRpc,
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  const res = await rpc.call<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
    "getLatestBlockhash",
    [{ commitment: "confirmed" }],
  )
  return res.value
}

export async function getBlockHeight(rpc: SolanaRpc): Promise<number> {
  return rpc.call<number>("getBlockHeight", [{ commitment: "confirmed" }])
}

export async function sendRawTransaction(rpc: SolanaRpc, wire: Uint8Array): Promise<string> {
  return rpc.call<string>("sendTransaction", [
    Buffer.from(wire).toString("base64"),
    { encoding: "base64", preflightCommitment: "confirmed", maxRetries: 0 },
  ])
}
