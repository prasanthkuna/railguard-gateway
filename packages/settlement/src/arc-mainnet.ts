/** Arc mainnet settlement verification — read-only RPC evidence rail. */

import type { Hash } from "viem"
import { defineChain } from "viem"
import { getEvmChain } from "./chains.js"
import { createEvmPublicClient, fetchSettlementFromTx } from "./evm-rpc.js"
import type { ExpectedTransferFacts, SettlementVerificationResult } from "./index.js"
import { redactRpcUrlForEvidence } from "./rpc-redact.js"

const DESCRIPTOR = getEvmChain("arc")

/** Circle USDC ERC-20 interface on Arc (6 decimals). Gas is native USDC (18 decimals). */
export const ARC_MAINNET_USDC = "0x3600000000000000000000000000000000000000"

export const ARC_MAINNET_RPC = DESCRIPTOR.rpcUrls[0]
export const ARC_MAINNET_CHAIN_ID = DESCRIPTOR.chainId

const arcMainnet = defineChain({
  id: ARC_MAINNET_CHAIN_ID,
  name: DESCRIPTOR.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [...DESCRIPTOR.rpcUrls] } },
})

export function createArcMainnetClient(rpcUrl = ARC_MAINNET_RPC) {
  return createEvmPublicClient(arcMainnet, rpcUrl)
}

export function expectedArcMainnetTransferFromEnv(): ExpectedTransferFacts {
  const sender = process.env.ARC_MAINNET_SENDER?.trim()
  const recipient = process.env.ARC_MAINNET_RECIPIENT?.trim()
  const amountRaw = process.env.ARC_MAINNET_AMOUNT?.trim() ?? "10000"
  if (!sender || !recipient) {
    throw new Error(
      "set ARC_MAINNET_SENDER and ARC_MAINNET_RECIPIENT (independent expected facts)",
    )
  }
  return {
    chainId: ARC_MAINNET_CHAIN_ID,
    tokenAddress: ARC_MAINNET_USDC,
    sender,
    recipient,
    amount: BigInt(amountRaw),
  }
}

export async function generateArcMainnetEvidence(input: {
  txHash: string
  expected: ExpectedTransferFacts
  rpcUrl?: string
}): Promise<{
  network: "arc-mainnet"
  chainId: number
  rpcUrl: string
  txHash: string
  explorerUrl: string
  expected: ExpectedTransferFacts
  settlement: SettlementVerificationResult
  confirmations: number
  generatedAt: string
}> {
  const rpcUrl = input.rpcUrl ?? ARC_MAINNET_RPC
  const txHash = input.txHash.trim() as Hash
  const expected = {
    ...input.expected,
    chainId: ARC_MAINNET_CHAIN_ID,
    tokenAddress: input.expected.tokenAddress.toLowerCase(),
    sender: input.expected.sender.toLowerCase(),
    recipient: input.expected.recipient.toLowerCase(),
  }

  const settlement = await fetchSettlementFromTx({
    chain: arcMainnet,
    chainId: ARC_MAINNET_CHAIN_ID,
    txHash,
    expected,
    rpcUrl,
  })

  return {
    network: "arc-mainnet",
    chainId: ARC_MAINNET_CHAIN_ID,
    rpcUrl: redactRpcUrlForEvidence(rpcUrl, ARC_MAINNET_RPC),
    txHash,
    explorerUrl: DESCRIPTOR.explorerTxUrl(txHash),
    expected,
    settlement,
    confirmations: settlement.confirmations,
    generatedAt: new Date().toISOString(),
  }
}
