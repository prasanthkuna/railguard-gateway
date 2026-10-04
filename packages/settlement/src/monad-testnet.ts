/** Monad testnet live RPC settlement verification — read-only evidence rail. */

import type { Hash } from "viem"
import { defineChain } from "viem"
import { getEvmChain } from "./chains.js"
import { createEvmPublicClient, fetchSettlementFromTx } from "./evm-rpc.js"
import type { ExpectedTransferFacts, SettlementVerificationResult } from "./index.js"
import { parseErc20TransferLogs } from "./index.js"
import { redactRpcUrlForEvidence } from "./rpc-redact.js"

const DESCRIPTOR = getEvmChain("monad-testnet")

export const MONAD_TESTNET_RPC = DESCRIPTOR.rpcUrls[0]
export const MONAD_TESTNET_CHAIN_ID = DESCRIPTOR.chainId
export const MONAD_TESTNET_USDC = DESCRIPTOR.usdcAddress ?? ""

const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: DESCRIPTOR.name,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [...DESCRIPTOR.rpcUrls] } },
})

export function createMonadTestnetClient(rpcUrl = MONAD_TESTNET_RPC) {
  return createEvmPublicClient(monadTestnet, rpcUrl)
}

export async function discoverRecentUsdcTransfer(input?: {
  rpcUrl?: string
  lookbackBlocks?: number
  maxBlockRange?: number
}): Promise<{
  txHash: string
  transfer: ReturnType<typeof parseErc20TransferLogs>[number]
} | null> {
  const client = createMonadTestnetClient(input?.rpcUrl)
  const maxRange = input?.maxBlockRange ?? 100
  const lookback = input?.lookbackBlocks ?? 5_000
  const latest = await client.getBlockNumber()
  const start = latest > BigInt(lookback) ? latest - BigInt(lookback) : 0n

  for (let toBlock = latest; toBlock >= start; toBlock -= BigInt(maxRange)) {
    const fromBlock = toBlock > BigInt(maxRange) ? toBlock - BigInt(maxRange) + 1n : start
    if (fromBlock > toBlock) break

    const logs = await client.getLogs({
      address: MONAD_TESTNET_USDC as `0x${string}`,
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

export function expectedMonadTestnetTransferFromEnv(): ExpectedTransferFacts {
  const sender = process.env.MONAD_TESTNET_SENDER?.trim()
  const recipient = process.env.MONAD_TESTNET_RECIPIENT?.trim()
  const amountRaw = process.env.MONAD_TESTNET_AMOUNT?.trim() ?? "10000"
  if (!sender || !recipient) {
    throw new Error(
      "set MONAD_TESTNET_SENDER and MONAD_TESTNET_RECIPIENT (independent expected facts)",
    )
  }
  return {
    chainId: MONAD_TESTNET_CHAIN_ID,
    tokenAddress: MONAD_TESTNET_USDC,
    sender,
    recipient,
    amount: BigInt(amountRaw),
  }
}

export async function generateMonadTestnetEvidence(input: {
  txHash: string
  expected: ExpectedTransferFacts
  rpcUrl?: string
}): Promise<{
  network: "monad-testnet"
  chainId: number
  rpcUrl: string
  txHash: string
  explorerUrl: string
  expected: ExpectedTransferFacts
  settlement: SettlementVerificationResult
  confirmations: number
  generatedAt: string
}> {
  const rpcUrl = input.rpcUrl ?? MONAD_TESTNET_RPC
  const txHash = input.txHash.trim() as Hash
  const expected = {
    ...input.expected,
    chainId: MONAD_TESTNET_CHAIN_ID,
    tokenAddress: input.expected.tokenAddress.toLowerCase(),
    sender: input.expected.sender.toLowerCase(),
    recipient: input.expected.recipient.toLowerCase(),
  }

  const settlement = await fetchSettlementFromTx({
    chain: monadTestnet,
    chainId: MONAD_TESTNET_CHAIN_ID,
    txHash,
    expected,
    rpcUrl,
  })

  return {
    network: "monad-testnet",
    chainId: MONAD_TESTNET_CHAIN_ID,
    rpcUrl: redactRpcUrlForEvidence(rpcUrl, MONAD_TESTNET_RPC),
    txHash,
    explorerUrl: DESCRIPTOR.explorerTxUrl(txHash),
    expected,
    settlement,
    confirmations: settlement.confirmations,
    generatedAt: new Date().toISOString(),
  }
}
