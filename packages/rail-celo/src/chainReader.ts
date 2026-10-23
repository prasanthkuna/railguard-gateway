/** Read-only view of Celo Sepolia that the verifier and reconciler need. Real (viem) and simulated. */
import {
  http,
  type Address,
  type Hex,
  createPublicClient,
  decodeEventLog,
  parseAbi,
  parseAbiItem,
} from "viem"
import { celoSepolia } from "viem/chains"
import { CELO_SEPOLIA, assertCeloTestnetRpc } from "./chain"

export const USDC_EVENTS_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)",
])
export const USDC_READ_ABI = parseAbi([
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
])

export interface ChainLog {
  address: string
  topics: readonly Hex[]
  data: Hex
}

export interface ChainReceipt {
  transactionHash: Hex
  status: "success" | "reverted"
  blockNumber: bigint
  logs: ChainLog[]
}

export interface CeloChainReader {
  readonly chainId: number
  blockNumber(): Promise<bigint>
  /** Latest block the chain reports as finalized (falls back to latest - 64 if the tag is unsupported). */
  finalizedBlockNumber(): Promise<bigint>
  receipt(txHash: Hex): Promise<ChainReceipt | null>
  authorizationUsed(token: Address, authorizer: Address, nonce: Hex): Promise<boolean>
  /** Tx hash of the AuthorizationUsed(authorizer, nonce) event, scanning from `fromBlock`. */
  findAuthorizationTx(
    token: Address,
    authorizer: Address,
    nonce: Hex,
    fromBlock: bigint,
  ): Promise<Hex | null>
  balanceOf(token: Address, owner: Address): Promise<bigint>
}

export function createCeloSepoliaReader(rpcUrl: string = CELO_SEPOLIA.rpcUrl): CeloChainReader {
  const client = createPublicClient({
    chain: celoSepolia,
    transport: http(rpcUrl, { timeout: 20_000 }),
  })
  let checked = false
  async function guard() {
    if (checked) return
    assertCeloTestnetRpc(await client.getChainId())
    checked = true
  }
  return {
    chainId: CELO_SEPOLIA.chainId,
    async blockNumber() {
      await guard()
      return client.getBlockNumber()
    },
    async finalizedBlockNumber() {
      await guard()
      try {
        const b = await client.getBlock({ blockTag: "finalized" })
        return b.number ?? 0n
      } catch {
        return (await client.getBlockNumber()) - 64n
      }
    },
    async receipt(txHash) {
      await guard()
      try {
        const r = await client.getTransactionReceipt({ hash: txHash })
        return {
          transactionHash: r.transactionHash,
          status: r.status,
          blockNumber: r.blockNumber,
          logs: r.logs.map((l) => ({
            address: l.address,
            topics: l.topics as Hex[],
            data: l.data,
          })),
        }
      } catch {
        return null
      }
    },
    async authorizationUsed(token, authorizer, nonce) {
      await guard()
      return client.readContract({
        address: token,
        abi: USDC_READ_ABI,
        functionName: "authorizationState",
        args: [authorizer, nonce],
      })
    },
    async findAuthorizationTx(token, authorizer, nonce, fromBlock) {
      await guard()
      const latest = await client.getBlockNumber()
      const event = parseAbiItem(
        "event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)",
      )
      const step = 5_000n
      for (let start = fromBlock; start <= latest; start += step) {
        const end = start + step - 1n > latest ? latest : start + step - 1n
        const logs = await client.getLogs({
          address: token,
          event,
          args: { authorizer, nonce },
          fromBlock: start,
          toBlock: end,
        })
        if (logs[0]?.transactionHash) return logs[0].transactionHash
      }
      return null
    },
    async balanceOf(token, owner) {
      await guard()
      return client.readContract({
        address: token,
        abi: USDC_READ_ABI,
        functionName: "balanceOf",
        args: [owner],
      })
    },
  }
}

export function decodeUsdcLog(log: ChainLog) {
  try {
    return decodeEventLog({
      abi: USDC_EVENTS_ABI,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    })
  } catch {
    return null
  }
}
