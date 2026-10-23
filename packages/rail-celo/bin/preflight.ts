#!/usr/bin/env bun
/** Celo Sepolia readiness: addresses, CELO and USDC balances, facilitator, identities. Prints no secrets. */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { http, type Hex, createPublicClient, formatEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { celoSepolia } from "viem/chains"
import { CELO_SEPOLIA, atomicToUsdc } from "../src/chain"
import { createCeloSepoliaReader } from "../src/chainReader"

const rpc = process.env.CELO_SEPOLIA_RPC_URL || CELO_SEPOLIA.rpcUrl
const pub = createPublicClient({ chain: celoSepolia, transport: http(rpc) })
const reader = createCeloSepoliaReader(rpc)
const show = async (label: string, key: string | undefined) => {
  if (!key) return console.log(`${label}: not set`)
  if (!/^0x[0-9a-fA-F]{64}$/.test(key.trim()))
    return console.log(`${label}: set but not a 0x-prefixed 32-byte hex key`)
  const a = privateKeyToAccount(key.trim() as Hex).address
  const [celo, usdc] = await Promise.all([
    pub.getBalance({ address: a }),
    reader.balanceOf(CELO_SEPOLIA.usdc.address, a),
  ])
  console.log(`${label}: ${a}  CELO ${formatEther(celo)}  USDC ${atomicToUsdc(usdc)}`)
}
console.log(`chainId ${await pub.getChainId()} (${CELO_SEPOLIA.caip2})`)
await show("buyer  (CELO_AGENT_PRIVATE_KEY)", process.env.CELO_AGENT_PRIVATE_KEY)
if (!process.env.CELO_AGENT_PRIVATE_KEY)
  await show("buyer  (fallback TESTNET_WALLET_PRIVATE_KEY)", process.env.TESTNET_WALLET_PRIVATE_KEY)
await show("seller (CELO_SELLER_PRIVATE_KEY)", process.env.CELO_SELLER_PRIVATE_KEY)
console.log(
  `X402_API_KEY: ${process.env.X402_API_KEY ? "set" : "not set (self-facilitation needs CELO_SELLER_PRIVATE_KEY)"}`,
)
console.log(`CELO_ATTRIBUTION_CODE: ${process.env.CELO_ATTRIBUTION_CODE ? "set" : "not set"}`)
const facilitator = await fetch(`${CELO_SEPOLIA.facilitatorUrl}/supported`)
  .then((r) => r.ok)
  .catch(() => false)
console.log(
  `facilitator ${CELO_SEPOLIA.facilitatorUrl}: ${facilitator ? "reachable" : "unreachable"}`,
)
const idFile = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "docs",
  "hackathons",
  "celo",
  "evidence",
  "identity.json",
)
console.log(
  `identity.json: ${existsSync(idFile) ? readFileSync(idFile, "utf8").trim() : "missing (run bun run celo:register)"}`,
)
