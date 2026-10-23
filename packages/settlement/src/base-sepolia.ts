/** Base Sepolia live RPC settlement verification — no mocks. */

import type { Hash } from "viem"
import { baseSepolia } from "viem/chains"
import {
  buildExpectedFromTransfer as buildExpectedForChain,
  createEvmPublicClient,
  fetchSettlementFromTx as fetchEvmSettlementFromTx,
} from "./evm-rpc.js"
import {
  type ExpectedTransferFacts,
  type SettlementVerificationResult,
  parseErc20TransferLogs,
} from "./index.js"

export const BASE_SEPOLIA_RPC = "https://sepolia.base.org"

/** Public Base Sepolia RPCs tried in order (read-only, no keys). */
export const BASE_SEPOLIA_RPCS = [
  BASE_SEPOLIA_RPC,
  "https://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.drpc.org",
  "https://base-sepolia.gateway.tenderly.co",
] as const

/** sepolia.base.org rejects eth_getLogs spans over 200 blocks; stay well under it. */
export const BASE_SEPOLIA_MAX_LOG_RANGE = 100

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Retry a read-only RPC operation with exponential backoff (1s, 2s, 4s...). */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 3
  const baseDelayMs = options?.baseDelayMs ?? 1000
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) await sleep(baseDelayMs * 2 ** attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/** Preferred RPC first (if given), then the public fallbacks, without duplicates. */
export function baseSepoliaRpcCandidates(preferred?: string): string[] {
  const list = preferred ? [preferred, ...BASE_SEPOLIA_RPCS] : [...BASE_SEPOLIA_RPCS]
  return [...new Set(list.filter((url) => url.length > 0))]
}
export const BASE_SEPOLIA_CHAIN_ID = 84532
export const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

export function createBaseSepoliaClient(rpcUrl = BASE_SEPOLIA_RPC) {
  return createEvmPublicClient(baseSepolia, rpcUrl)
}

export async function fetchSettlementFromTx(input: {
  txHash: string
  expected?: ExpectedTransferFacts
  requiredConfirmations?: number
  rpcUrl?: string
}): Promise<SettlementVerificationResult & { txHash: string; confirmations: number }> {
  return fetchEvmSettlementFromTx({
    chain: baseSepolia,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    txHash: input.txHash,
    expected: input.expected,
    requiredConfirmations: input.requiredConfirmations,
    rpcUrl: input.rpcUrl,
  })
}

/** Discover a recent USDC transfer on Base Sepolia for read-only evidence (no keys). */
export async function discoverRecentUsdcTransfer(input?: {
  rpcUrl?: string
  lookbackBlocks?: number
  maxBlockRange?: number
}): Promise<{
  txHash: string
  transfer: ReturnType<typeof parseErc20TransferLogs>[number]
} | null> {
  const client = createBaseSepoliaClient(input?.rpcUrl)
  const maxRange = Math.min(input?.maxBlockRange ?? BASE_SEPOLIA_MAX_LOG_RANGE, 200)
  const lookback = input?.lookbackBlocks ?? 5_000
  const latest = await client.getBlockNumber()
  const start = latest > BigInt(lookback) ? latest - BigInt(lookback) : 0n

  for (let toBlock = latest; toBlock >= start; toBlock -= BigInt(maxRange)) {
    const fromBlock = toBlock > BigInt(maxRange) ? toBlock - BigInt(maxRange) + 1n : start
    if (fromBlock > toBlock) break

    const logs = await client.getLogs({
      address: BASE_SEPOLIA_USDC as `0x${string}`,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
        ],
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

export function buildExpectedFromTransfer(
  transfer: ReturnType<typeof parseErc20TransferLogs>[number],
): ExpectedTransferFacts {
  return buildExpectedForChain(BASE_SEPOLIA_CHAIN_ID, transfer)
}

type BaseSepoliaEvidence = {
  network: "base-sepolia"
  chainId: number
  rpcUrl: string
  txHash: string
  explorerUrl: string
  expected: ExpectedTransferFacts
  settlement: SettlementVerificationResult
  confirmations: number
  generatedAt: string
}

/**
 * Live read-only evidence with RPC fallback: each RPC gets retries with backoff,
 * then the next public RPC is tried. Verification itself is never skipped.
 */
export async function generateBaseSepoliaEvidence(input?: {
  txHash?: string
  rpcUrl?: string
  rpcUrls?: readonly string[]
  attemptsPerRpc?: number
}): Promise<BaseSepoliaEvidence> {
  const urls = input?.rpcUrls ? [...input.rpcUrls] : baseSepoliaRpcCandidates(input?.rpcUrl)
  const failures: string[] = []
  for (const rpcUrl of urls) {
    try {
      return await withBackoff(
        () => generateBaseSepoliaEvidenceOnce({ txHash: input?.txHash, rpcUrl }),
        {
          attempts: input?.attemptsPerRpc ?? 3,
        },
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? ((error as { shortMessage?: string }).shortMessage ?? error.message)
          : String(error)
      failures.push(`${rpcUrl}: ${message}`)
      console.error(`[base-sepolia] RPC failed, trying next: ${rpcUrl}: ${message}`)
    }
  }
  throw new Error(`all Base Sepolia RPCs failed:\n  ${failures.join("\n  ")}`)
}

async function generateBaseSepoliaEvidenceOnce(input?: {
  txHash?: string
  rpcUrl?: string
}): Promise<{
  network: "base-sepolia"
  chainId: number
  rpcUrl: string
  txHash: string
  explorerUrl: string
  expected: ExpectedTransferFacts
  settlement: SettlementVerificationResult
  confirmations: number
  generatedAt: string
}> {
  const rpcUrl = input?.rpcUrl ?? BASE_SEPOLIA_RPC
  let txHash = input?.txHash

  if (!txHash) {
    const discovered = await discoverRecentUsdcTransfer({ rpcUrl })
    if (!discovered) {
      throw new Error("no recent USDC transfers found on Base Sepolia — set BASE_SEPOLIA_TX_HASH")
    }
    txHash = discovered.txHash
  }

  const client = createBaseSepoliaClient(rpcUrl)
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hash })
  const transfers = parseErc20TransferLogs(
    receipt.logs.map((log) => ({
      address: log.address,
      topics: log.topics as readonly string[],
      data: log.data,
    })),
  )
  const transfer = transfers.find(
    (t) => t.tokenAddress.toLowerCase() === BASE_SEPOLIA_USDC.toLowerCase(),
  )
  if (!transfer) {
    throw new Error(`no USDC transfer in tx ${txHash}`)
  }

  const expected = buildExpectedFromTransfer(transfer)
  const settlement = await fetchSettlementFromTx({
    txHash,
    expected,
    rpcUrl,
  })

  return {
    network: "base-sepolia",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    rpcUrl,
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    expected,
    settlement,
    confirmations: settlement.confirmations,
    generatedAt: new Date().toISOString(),
  }
}
