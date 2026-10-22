#!/usr/bin/env bun
/**
 * Send a minimal Arc mainnet USDC proof transfer and write evidence/arc/manifest.json.
 *
 * Prerequisites:
 *   - Wallet on Arc mainnet (chain 5042) with native USDC for gas + ERC-20 transfer amount.
 *   - Bridge via Circle CCTP (no mainnet faucet): https://developers.circle.com/cctp
 *
 * Default amount: 10000 base units = 0.01 USDC (6 decimals on ERC-20 interface).
 *
 * Private key: ARC_MAINNET_PRIVATE_KEY, or DEPLOYER_PRIVATE_KEY / CDP_PRIVATE_KEY in .env.local
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { defineChain, http, parseAbi, type Hash } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createWalletClient, publicActions } from "viem"
import {
  ARC_MAINNET_RPC,
  ARC_MAINNET_USDC,
  generateArcMainnetEvidence,
} from "../packages/settlement/src/arc-mainnet.ts"

function loadEnv(file: string) {
  const path = join(process.cwd(), file)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#") || !t.includes("=")) continue
    const i = t.indexOf("=")
    const k = t.slice(0, i)
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv(".env")
loadEnv(".env.local")

if (process.env.ARC_CONFIRM?.trim() !== "yes") {
  console.error("Safety gate: set ARC_CONFIRM=yes after preflight passes.")
  console.error("  bun run arc-mainnet-preflight")
  console.error("  $env:ARC_CONFIRM='yes'; bun run arc-mainnet-usdc-proof")
  process.exit(1)
}

const pkRaw =
  process.env.ARC_MAINNET_PRIVATE_KEY?.trim() ??
  process.env.DEPLOYER_PRIVATE_KEY?.trim() ??
  process.env.CDP_PRIVATE_KEY?.trim()

if (!pkRaw) {
  console.error(
    "Set ARC_MAINNET_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY / CDP_PRIVATE_KEY) in .env.local",
  )
  process.exit(1)
}

const privateKey = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as Hash
const account = privateKeyToAccount(privateKey)

const recipient =
  process.env.ARC_MAINNET_RECIPIENT?.trim() ??
  "0x8c7e2543aa8bf69dc8458dc28104234f6a334233"
const amount = BigInt(process.env.ARC_MAINNET_AMOUNT?.trim() ?? "10000")

const arcChain = defineChain({
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_MAINNET_RPC_URL ?? ARC_MAINNET_RPC] } },
})

const usdcAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
])

const client = createWalletClient({
  account,
  chain: arcChain,
  transport: http(process.env.ARC_MAINNET_RPC_URL ?? ARC_MAINNET_RPC),
}).extend(publicActions)

console.log(`Wallet ${account.address}`)
const nativeBal = await client.getBalance({ address: account.address })
console.log(`Native USDC balance (18 dec, gas): ${nativeBal}`)

const usdcBal = await client.readContract({
  address: ARC_MAINNET_USDC as `0x${string}`,
  abi: usdcAbi,
  functionName: "balanceOf",
  args: [account.address],
})
console.log(`ERC-20 USDC balance (6 dec): ${usdcBal}`)

if (usdcBal < amount) {
  console.error(`Insufficient ERC-20 USDC: have ${usdcBal}, need ${amount} base units.`)
  console.error("Bridge USDC to Arc mainnet (5042) via Circle CCTP — no mainnet faucet.")
  process.exit(1)
}

if (nativeBal === 0n) {
  console.error("Native USDC balance is zero — cannot pay gas on Arc.")
  process.exit(1)
}

console.log(`Transferring ${amount} (0.01 USDC @ 6 dec) → ${recipient}`)
const transferHash = await client.writeContract({
  address: ARC_MAINNET_USDC as `0x${string}`,
  abi: usdcAbi,
  functionName: "transfer",
  args: [recipient as `0x${string}`, amount],
})
console.log(`transfer tx: ${transferHash}`)
await client.waitForTransactionReceipt({ hash: transferHash })

const expected = {
  chainId: 5042,
  tokenAddress: ARC_MAINNET_USDC,
  sender: account.address,
  recipient,
  amount,
}

const evidence = await generateArcMainnetEvidence({
  txHash: transferHash,
  expected,
})

const bundle = {
  ...evidence,
  expected: { ...evidence.expected, amount: evidence.expected.amount.toString() },
  ok: evidence.settlement.status === "CONFIRMED",
}

const evidenceDir = join(process.cwd(), "evidence", "arc")
mkdirSync(evidenceDir, { recursive: true })
const serialized = JSON.stringify(
  bundle,
  (_k, v) => (typeof v === "bigint" ? v.toString() : v),
  2,
)
writeFileSync(join(evidenceDir, "manifest.json"), `${serialized}\n`)
console.log(serialized)

process.exit(bundle.ok ? 0 : 1)
