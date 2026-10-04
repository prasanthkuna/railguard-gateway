#!/usr/bin/env bun
/**
 * Send a Monad testnet USDC proof transfer and write the evidence manifest.
 *
 * Fund USDC from Circle's official faucet first: https://faucet.circle.com/
 * Requires MON on Monad testnet for gas. Private key from (first set):
 *   MONAD_TESTNET_PRIVATE_KEY, DEPLOYER_PRIVATE_KEY, or CDP_PRIVATE_KEY in .env.local
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { defineChain, http, parseAbi, type Hash } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createWalletClient, publicActions } from "viem"
import {
  generateMonadTestnetEvidence,
  MONAD_TESTNET_RPC,
  MONAD_TESTNET_USDC,
} from "../packages/settlement/src/monad-testnet.ts"

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

const pkRaw =
  process.env.MONAD_TESTNET_PRIVATE_KEY?.trim() ??
  process.env.DEPLOYER_PRIVATE_KEY?.trim() ??
  process.env.CDP_PRIVATE_KEY?.trim()

if (!pkRaw) {
  console.error(
    "Set MONAD_TESTNET_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY / CDP_PRIVATE_KEY) in .env.local",
  )
  process.exit(1)
}

const privateKey = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as Hash
const account = privateKeyToAccount(privateKey)

const recipient =
  process.env.MONAD_TESTNET_RECIPIENT?.trim() ??
  "0x8c7e2543aa8bf69dc8458dc28104234f6a334233"
const amount = BigInt(process.env.MONAD_TESTNET_AMOUNT?.trim() ?? "10000")

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_TESTNET_RPC_URL ?? MONAD_TESTNET_RPC] } },
})

const usdcAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
])

const client = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(process.env.MONAD_TESTNET_RPC_URL ?? MONAD_TESTNET_RPC),
}).extend(publicActions)

console.log(`Wallet ${account.address}`)
const monBal = await client.getBalance({ address: account.address })
console.log(`MON balance: ${monBal}`)

const usdcBal = await client.readContract({
  address: MONAD_TESTNET_USDC as `0x${string}`,
  abi: usdcAbi,
  functionName: "balanceOf",
  args: [account.address],
})
console.log(`USDC balance before: ${usdcBal}`)

if (usdcBal < amount) {
  console.error(`Insufficient USDC: have ${usdcBal}, need ${amount} base units.`)
  console.error("Fund this wallet from Circle's official faucet: https://faucet.circle.com/")
  console.error("Select Monad Testnet and request USDC. Do not retry mintFaucet() on the token contract.")
  process.exit(1)
}

console.log(`Transferring ${amount} USDC → ${recipient}`)
const transferHash = await client.writeContract({
  address: MONAD_TESTNET_USDC as `0x${string}`,
  abi: usdcAbi,
  functionName: "transfer",
  args: [recipient as `0x${string}`, amount],
})
console.log(`transfer tx: ${transferHash}`)
await client.waitForTransactionReceipt({ hash: transferHash })

const expected = {
  chainId: 10143,
  tokenAddress: MONAD_TESTNET_USDC,
  sender: account.address,
  recipient,
  amount,
}

const evidence = await generateMonadTestnetEvidence({
  txHash: transferHash,
  expected,
})

const bundle = {
  ...evidence,
  expected: { ...evidence.expected, amount: evidence.expected.amount.toString() },
  ok: evidence.settlement.status === "CONFIRMED",
}

const evidenceDir = join(process.cwd(), "evidence", "monad-testnet")
mkdirSync(evidenceDir, { recursive: true })
const serialized = JSON.stringify(
  bundle,
  (_k, v) => (typeof v === "bigint" ? v.toString() : v),
  2,
)
writeFileSync(join(evidenceDir, "manifest.json"), `${serialized}\n`)
console.log(serialized)

process.exit(bundle.ok ? 0 : 1)
