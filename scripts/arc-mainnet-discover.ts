#!/usr/bin/env bun
/** Discover recent USDC transfers on Arc mainnet for grant wallets (read-only). */
import { createPublicClient, http, parseAbiItem } from "viem"
import { defineChain } from "viem"
import { ARC_MAINNET_RPC, ARC_MAINNET_USDC } from "../packages/settlement/src/arc-mainnet.ts"

const senders = [
  process.env.ARC_MAINNET_SENDER?.trim(),
  "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d",
].filter(Boolean) as string[]

const arcChain = defineChain({
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_MAINNET_RPC] } },
})

const client = createPublicClient({ chain: arcChain, transport: http(ARC_MAINNET_RPC) })
const latest = await client.getBlockNumber()
const lookback = 500_000n
const start = latest > lookback ? latest - lookback : 0n

for (const from of senders) {
  try {
    const logs = await client.getLogs({
      address: ARC_MAINNET_USDC as `0x${string}`,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 value)",
      ),
      args: { from: from as `0x${string}` },
      fromBlock: start,
      toBlock: latest,
    })
    const last = logs[logs.length - 1]
    console.log(
      JSON.stringify({
        from,
        found: logs.length,
        latestTx: last?.transactionHash ?? null,
        blockRange: { start: start.toString(), latest: latest.toString() },
      }),
    )
  } catch (e) {
    console.log(JSON.stringify({ from, error: String(e) }))
  }
}
