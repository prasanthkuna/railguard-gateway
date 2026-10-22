#!/usr/bin/env bun
/**
 * Arc mainnet preflight — balances, safety caps, no spend.
 *
 *   bun run arc-mainnet-preflight
 *   bun run arc-mainnet-preflight -- --dry-run-transfer
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { defineChain, formatUnits, http, parseAbi } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient } from "viem"
import {
  ARC_MAINNET_RPC,
  ARC_MAINNET_USDC,
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

const dryRun = process.argv.includes("--dry-run-transfer")

const senderOverride = process.env.ARC_MAINNET_SENDER?.trim()
const pkRaw =
  process.env.ARC_MAINNET_PRIVATE_KEY?.trim() ??
  process.env.DEPLOYER_PRIVATE_KEY?.trim() ??
  process.env.CDP_PRIVATE_KEY?.trim()

let senderAddress: `0x${string}`
if (pkRaw) {
  senderAddress = privateKeyToAccount(
    (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`,
  ).address
} else if (senderOverride) {
  senderAddress = senderOverride as `0x${string}`
} else {
  console.error(
    "Set ARC_MAINNET_PRIVATE_KEY (for proof) or ARC_MAINNET_SENDER (balance check only) in .env.local",
  )
  process.exit(1)
}

const recipient =
  process.env.ARC_MAINNET_RECIPIENT?.trim() ??
  "0x8c7e2543aa8bf69dc8458dc28104234f6a334233"

const amount = BigInt(process.env.ARC_MAINNET_AMOUNT?.trim() ?? "10000")
const minNativeForGas = BigInt(process.env.ARC_MIN_NATIVE_WEI?.trim() ?? "1000000000000000") // 0.001 USDC @ 18 dec

const arcChain = defineChain({
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_MAINNET_RPC_URL ?? ARC_MAINNET_RPC] } },
})

const usdcAbi = parseAbi(["function balanceOf(address) view returns (uint256)"])

const client = createPublicClient({
  chain: arcChain,
  transport: http(process.env.ARC_MAINNET_RPC_URL ?? ARC_MAINNET_RPC),
})

const nativeBal = await client.getBalance({ address: senderAddress })
const erc20Bal = await client.readContract({
  address: ARC_MAINNET_USDC as `0x${string}`,
  abi: usdcAbi,
  functionName: "balanceOf",
  args: [senderAddress],
})

const block = await client.getBlockNumber()

const report = {
  chainId: 5042,
  block: block.toString(),
  sender: senderAddress,
  hasSigningKey: Boolean(pkRaw),
  recipient,
  proofAmountErc20: amount.toString(),
  proofAmountHuman: `${formatUnits(amount, 6)} USDC (ERC-20 6 dec)`,
  nativeUsdcBalance: nativeBal.toString(),
  nativeUsdcHuman: `${formatUnits(nativeBal, 18)} USDC (gas, 18 dec)`,
  erc20UsdcBalance: erc20Bal.toString(),
  erc20UsdcHuman: `${formatUnits(erc20Bal, 6)} USDC`,
  checks: {
    hasNativeGas: nativeBal >= minNativeForGas,
    hasErc20ForProof: erc20Bal >= amount,
    recipientDiffersFromSender: recipient.toLowerCase() !== senderAddress.toLowerCase(),
    canSignProof: Boolean(pkRaw),
  },
  fundSafety: {
    note: "Proof sends only ARC_MAINNET_AMOUNT (default 0.01 USDC) to ARC_MAINNET_RECIPIENT. Use a wallet you control to recover funds.",
    maxLossIfProofRuns: formatUnits(amount, 6) + " USDC + ~0.01–0.05 USDC gas",
    keepOnArcAfterProof: "Leave remaining native USDC on 5042 for future grants (Circle, ETHGlobal Arc track).",
  },
  readyForProof: false as boolean,
}

report.readyForProof =
  Boolean(pkRaw) &&
  report.checks.hasNativeGas &&
  report.checks.hasErc20ForProof &&
  report.checks.recipientDiffersFromSender

console.log(JSON.stringify(report, null, 2))

if (!report.readyForProof) {
  console.error("\nNOT READY — fund Arc 5042 via Circle CCTP before arc-mainnet-usdc-proof.")
  console.error("Bridge guide: docs/grants/ARC_MICROGRANT_SUBMIT.md")
  process.exit(1)
}

if (dryRun) {
  console.log("\nDRY RUN OK — run: bun run arc-mainnet-usdc-proof")
  process.exit(0)
}

console.log("\nREADY — run: bun run arc-mainnet-usdc-proof")
process.exit(0)
