/** Verify on-chain ERC-20 transfer against a financial intent (external-wallet broadcast). */

import type { Hash } from "viem"
import { defineChain } from "viem"
import type { FinancialIntent } from "../../packages/kernel/src/intent"
import { ARBITRUM_ONE_USDT } from "../../packages/settlement/src/arbitrum-one.ts"
import { getEvmChain } from "../../packages/settlement/src/chains.ts"
import { parseErc20TransferLogs, verifyTransferFacts } from "../../packages/settlement/src/index.ts"

export function resolveSettlementChainKey(network?: string): string | null {
  const n = network?.trim().toLowerCase() ?? ""
  if (!n) return null
  if (n.includes("sepolia") && n.includes("arbitrum")) return "arbitrum-sepolia"
  if (n === "arbitrum-one" || n === "arbitrum") return "arbitrum-one"
  if (n.includes("base") && n.includes("sepolia")) return "base-sepolia"
  return null
}

export function resolveTokenAddress(chainKey: string, asset: string): string {
  const trimmed = asset.trim()
  if (trimmed.startsWith("0x") && trimmed.length === 42) return trimmed
  const symbol = trimmed.toUpperCase()
  const chain = getEvmChain(chainKey)
  if (symbol === "USDC" && chain.usdcAddress) return chain.usdcAddress
  if (symbol === "USDT" && chainKey === "arbitrum-one") return ARBITRUM_ONE_USDT
  throw new Error(`cannot resolve token asset "${asset}" on ${chainKey}`)
}

function viemChain(chainKey: string) {
  const descriptor = getEvmChain(chainKey)
  return defineChain({
    id: descriptor.chainId,
    name: descriptor.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [...descriptor.rpcUrls] } },
  })
}

export async function verifyIntentSettlementTx(input: {
  intent: FinancialIntent
  txHash: string
}): Promise<{
  chainKey: string
  explorerUrl: string
  settlementStatus: "CONFIRMED" | "MISMATCH" | "PENDING"
  tokenAddress: string
}> {
  const chainKey = resolveSettlementChainKey(input.intent.constraints.network)
  if (!chainKey) {
    throw new Error(
      `network "${input.intent.constraints.network}" does not support external settlement verify`,
    )
  }
  const descriptor = getEvmChain(chainKey)
  const tokenAddress = resolveTokenAddress(chainKey, input.intent.value.asset)
  const recipient = input.intent.counterparty.address
  if (!recipient) throw new Error("intent counterparty.address required for settlement verify")

  const expectedAmount = BigInt(input.intent.value.amount)
  const chain = viemChain(chainKey)
  const { createEvmPublicClient } = await import("../../packages/settlement/src/evm-rpc.ts")
  const client = createEvmPublicClient(chain, descriptor.rpcUrls[0])
  const receipt = await client.getTransactionReceipt({ hash: input.txHash as Hash })
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
    return {
      chainKey,
      explorerUrl: descriptor.explorerTxUrl(input.txHash),
      settlementStatus: "MISMATCH",
      tokenAddress,
    }
  }

  const expected = {
    chainId: descriptor.chainId,
    tokenAddress,
    sender: transfer.from,
    recipient,
    amount: expectedAmount,
  }
  const result = verifyTransferFacts({
    receiptStatus: receipt.status === "success" ? "success" : "reverted",
    confirmations: 12,
    requiredConfirmations: 1,
    observedChainId: descriptor.chainId,
    transfers,
    expected,
  })

  let settlementStatus: "CONFIRMED" | "MISMATCH" | "PENDING" = "MISMATCH"
  if (result.status === "CONFIRMED") {
    settlementStatus = "CONFIRMED"
  } else if (result.status === "PENDING") {
    settlementStatus = "PENDING"
  }

  return {
    chainKey,
    explorerUrl: descriptor.explorerTxUrl(input.txHash),
    settlementStatus,
    tokenAddress,
  }
}

export function buildBroadcastSheet(intent: FinancialIntent): {
  network: string
  chainId: number
  chainKey: string
  tokenAddress: string
  recipient: string
  amount: string
  asset: string
  explorerPrefix: string
} {
  const chainKey = resolveSettlementChainKey(intent.constraints.network)
  if (!chainKey) throw new Error("unsupported network for external broadcast")
  const descriptor = getEvmChain(chainKey)
  const tokenAddress = resolveTokenAddress(chainKey, intent.value.asset)
  const recipient = intent.counterparty.address
  if (!recipient) throw new Error("counterparty.address required")
  return {
    network: intent.constraints.network ?? chainKey,
    chainId: descriptor.chainId,
    chainKey,
    tokenAddress,
    recipient,
    amount: intent.value.amount,
    asset: intent.value.asset,
    explorerPrefix: descriptor.explorerTxUrl(""),
  }
}
