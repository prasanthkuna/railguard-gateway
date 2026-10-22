/** Arbitrum One mainnet settlement verification — read-only RPC evidence rail. */

import type { Hash } from "viem"
import { arbitrum } from "viem/chains"
import { discoverTokenTransferTxHash } from "./etherscan-v2.js"
import {
  buildExpectedFromTransfer,
  createEvmPublicClient,
  fetchSettlementFromTx,
} from "./evm-rpc.js"
import type { ExpectedTransferFacts, SettlementVerificationResult } from "./index.js"
import { parseErc20TransferLogs } from "./index.js"

export const ARBITRUM_ONE_RPC = "https://arb1.arbitrum.io/rpc"
export const ARBITRUM_ONE_CHAIN_ID = 42161
/** Circle USDC on Arbitrum One */
export const ARBITRUM_ONE_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
/** Bridged USDT on Arbitrum One */
export const ARBITRUM_ONE_USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"

export type ArbitrumOneToken = "usdt" | "usdc"

export function arbitrumOneTokenAddress(token: ArbitrumOneToken): string {
  return token === "usdt" ? ARBITRUM_ONE_USDT : ARBITRUM_ONE_USDC
}

export function createArbitrumOneClient(rpcUrl = ARBITRUM_ONE_RPC) {
  return createEvmPublicClient(arbitrum, rpcUrl)
}

export async function discoverRecentTokenTransfer(input: {
  tokenAddress: string
  rpcUrl?: string
  fromAddress?: string
  toAddress?: string
  lookbackBlocks?: number
  maxBlockRange?: number
}): Promise<{
  txHash: string
  transfer: ReturnType<typeof parseErc20TransferLogs>[number]
} | null> {
  const client = createArbitrumOneClient(input.rpcUrl)
  const maxRange = input.maxBlockRange ?? 2000
  const lookback = input.lookbackBlocks ?? 500_000
  const latest = await client.getBlockNumber()
  const start = latest > BigInt(lookback) ? latest - BigInt(lookback) : 0n
  for (let toBlock = latest; toBlock >= start; toBlock -= BigInt(maxRange)) {
    const fromBlock = toBlock > BigInt(maxRange) ? toBlock - BigInt(maxRange) + 1n : start
    if (fromBlock > toBlock) break

    const logs = await client.getLogs({
      address: input.tokenAddress as `0x${string}`,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
        ],
      },
      args: {
        ...(input.fromAddress ? { from: input.fromAddress as `0x${string}` } : {}),
        ...(input.toAddress ? { to: input.toAddress as `0x${string}` } : {}),
      },
      fromBlock,
      toBlock,
    })

    if (logs.length === 0) continue
    const last = logs[logs.length - 1]
    if (!last) continue
    const transfers = parseErc20TransferLogs([
      {
        address: last.address,
        topics: last.topics as readonly string[],
        data: last.data,
      },
    ])
    const transfer = transfers[0]
    if (!transfer) continue
    return { txHash: last.transactionHash, transfer }
  }

  return null
}

export async function generateArbitrumOneEvidence(input?: {
  txHash?: string
  rpcUrl?: string
  token?: ArbitrumOneToken
  fromAddress?: string
  toAddress?: string
}): Promise<{
  network: "arbitrum-one"
  chainId: number
  rpcUrl: string
  token: ArbitrumOneToken
  tokenAddress: string
  txHash: string
  explorerUrl: string
  expected: ExpectedTransferFacts
  settlement: SettlementVerificationResult
  confirmations: number
  generatedAt: string
}> {
  const rpcUrl = input?.rpcUrl ?? process.env.ARBITRUM_ONE_RPC_URL ?? ARBITRUM_ONE_RPC
  const token = (input?.token ?? process.env.ARBITRUM_ONE_TOKEN ?? "usdt") as ArbitrumOneToken
  const tokenAddress = arbitrumOneTokenAddress(token)
  let txHash = input?.txHash ?? process.env.ARBITRUM_ONE_TX_HASH
  const fromAddress =
    input?.fromAddress ??
    process.env.ARBITRUM_ONE_FROM ??
    "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d"
  const toAddress =
    input?.toAddress ?? process.env.ARBITRUM_ONE_TO ?? "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233"

  if (!txHash) {
    if (process.env.ETHERSCAN_API_KEY) {
      txHash =
        (await discoverTokenTransferTxHash({
          chainId: ARBITRUM_ONE_CHAIN_ID,
          tokenAddress,
          fromAddress,
          toAddress,
        })) ?? undefined
    }

    if (!txHash) {
      const discovered = await discoverRecentTokenTransfer({
        tokenAddress,
        rpcUrl,
        fromAddress,
        toAddress,
        lookbackBlocks: 50_000,
      })
      if (!discovered) {
        throw new Error(
          "no matching Arbitrum One transfer — send USDT, set ARBITRUM_ONE_TX_HASH, or set ETHERSCAN_API_KEY for V2 explorer lookup (not api.arbiscan.io V1)",
        )
      }
      txHash = discovered.txHash
    }
  }

  const client = createArbitrumOneClient(rpcUrl)
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hash })
  const transfers = parseErc20TransferLogs(
    receipt.logs.map((log) => ({
      address: log.address,
      topics: log.topics as readonly string[],
      data: log.data,
    })),
  )
  const transfer = transfers.find(
    (t) => t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
  )
  if (!transfer) {
    throw new Error(`no ${token.toUpperCase()} transfer in tx ${txHash}`)
  }

  const expected = buildExpectedFromTransfer(ARBITRUM_ONE_CHAIN_ID, transfer)
  const settlement = await fetchSettlementFromTx({
    chain: arbitrum,
    chainId: ARBITRUM_ONE_CHAIN_ID,
    txHash,
    expected,
    rpcUrl,
  })

  return {
    network: "arbitrum-one",
    chainId: ARBITRUM_ONE_CHAIN_ID,
    rpcUrl,
    token,
    tokenAddress,
    txHash,
    explorerUrl: `https://arbiscan.io/tx/${txHash}`,
    expected,
    settlement,
    confirmations: settlement.confirmations,
    generatedAt: new Date().toISOString(),
  }
}
