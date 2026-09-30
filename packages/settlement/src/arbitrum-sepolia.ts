/** Arbitrum Sepolia live RPC settlement verification — read-only evidence rail. */

import type { Hash } from "viem"
import { arbitrumSepolia } from "viem/chains"
import { createEvmPublicClient, fetchSettlementFromTx } from "./evm-rpc.js"
import type { ExpectedTransferFacts, SettlementVerificationResult } from "./index.js"
import { parseErc20TransferLogs } from "./index.js"
import { redactRpcUrlForEvidence } from "./rpc-redact.js"

export const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc"
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421_614
/** Circle USDC on Arbitrum Sepolia */
export const ARBITRUM_SEPOLIA_USDC = "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d"

export function createArbitrumSepoliaClient(rpcUrl = ARBITRUM_SEPOLIA_RPC) {
  return createEvmPublicClient(arbitrumSepolia, rpcUrl)
}

export async function discoverRecentUsdcTransfer(input?: {
  rpcUrl?: string
  lookbackBlocks?: number
  maxBlockRange?: number
}): Promise<{
  txHash: string
  transfer: ReturnType<typeof parseErc20TransferLogs>[number]
} | null> {
  const client = createArbitrumSepoliaClient(input?.rpcUrl)
  const maxRange = input?.maxBlockRange ?? 1000
  const lookback = input?.lookbackBlocks ?? 20_000
  const latest = await client.getBlockNumber()
  const start = latest > BigInt(lookback) ? latest - BigInt(lookback) : 0n

  for (let toBlock = latest; toBlock >= start; toBlock -= BigInt(maxRange)) {
    const fromBlock = toBlock > BigInt(maxRange) ? toBlock - BigInt(maxRange) + 1n : start
    if (fromBlock > toBlock) break

    const logs = await client.getLogs({
      address: ARBITRUM_SEPOLIA_USDC as `0x${string}`,
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

export function expectedArbitrumSepoliaTransferFromEnv(): ExpectedTransferFacts {
  const sender = process.env.ARBITRUM_SEPOLIA_SENDER?.trim()
  const recipient = process.env.ARBITRUM_SEPOLIA_RECIPIENT?.trim()
  const amountRaw = process.env.ARBITRUM_SEPOLIA_AMOUNT?.trim() ?? "10000"
  if (!sender || !recipient) {
    throw new Error(
      "set ARBITRUM_SEPOLIA_SENDER and ARBITRUM_SEPOLIA_RECIPIENT (independent expected facts)",
    )
  }
  return {
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    tokenAddress: ARBITRUM_SEPOLIA_USDC,
    sender,
    recipient,
    amount: BigInt(amountRaw),
  }
}

export async function generateArbitrumSepoliaEvidence(input: {
  txHash: string
  expected: ExpectedTransferFacts
  rpcUrl?: string
}): Promise<{
  network: "arbitrum-sepolia"
  chainId: number
  rpcUrl: string
  txHash: string
  explorerUrl: string
  expected: ExpectedTransferFacts
  settlement: SettlementVerificationResult
  confirmations: number
  generatedAt: string
}> {
  const rpcUrl = input.rpcUrl ?? ARBITRUM_SEPOLIA_RPC
  const txHash = input.txHash.trim()
  const expected = {
    ...input.expected,
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    tokenAddress: input.expected.tokenAddress.toLowerCase(),
    sender: input.expected.sender.toLowerCase(),
    recipient: input.expected.recipient.toLowerCase(),
  }

  const settlement = await fetchSettlementFromTx({
    chain: arbitrumSepolia,
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    txHash,
    expected,
    rpcUrl,
  })

  return {
    network: "arbitrum-sepolia",
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    rpcUrl: redactRpcUrlForEvidence(rpcUrl, ARBITRUM_SEPOLIA_RPC),
    txHash,
    explorerUrl: `https://sepolia.arbiscan.io/tx/${txHash}`,
    expected,
    settlement,
    confirmations: settlement.confirmations,
    generatedAt: new Date().toISOString(),
  }
}
