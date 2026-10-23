#!/usr/bin/env bun
/**
 * Register Railguard's agents on the ERC-8004 Identity Registry on Celo Sepolia (testnet gas only).
 *   CELO_AGENT_PRIVATE_KEY  -> buyer agent "Railguard due-diligence agent"
 *   CELO_SELLER_PRIVATE_KEY -> seller agent "Railguard Data Desk" (optional; its wallet receives x402 payments)
 *   CELO_ATTRIBUTION_CODE   -> ERC-8021 code appended to each register tx (from Loops House registration)
 * Writes public results (agent ids, wallets, tx hashes) to docs/hackathons/celo/evidence/identity.json.
 * Skips a role that is already in identity.json unless --force. Never prints keys. Testnet only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { http, type Hex, createPublicClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { celoSepolia } from "viem/chains"
import { CELO_SEPOLIA } from "../src/chain"
import {
  buildAgentRegistration,
  registerAgentOnCeloSepolia,
  registrationDataUri,
} from "../src/identity"

const dir = join(import.meta.dir, "..", "..", "..", "docs", "hackathons", "celo", "evidence")
const file = join(dir, "identity.json")
const repoUrl =
  process.env.RAILGUARD_REPO_URL || "https://github.com/prasanthkuna/railguard-gateway"
const prior = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}
const force = process.argv.includes("--force")
const rpc = process.env.CELO_SEPOLIA_RPC_URL || CELO_SEPOLIA.rpcUrl
const pub = createPublicClient({ chain: celoSepolia, transport: http(rpc) })

const roles = [
  {
    role: "buyer",
    key: process.env.CELO_AGENT_PRIVATE_KEY || process.env.TESTNET_WALLET_PRIVATE_KEY,
    name: "Railguard due-diligence agent",
    description:
      "AI agent that buys x402 checks on Celo; every payment is guarded by Railguard (budget, ERC-8004 payee identity, UNKNOWN on timeout, on-chain verification).",
  },
  {
    role: "seller",
    key: process.env.CELO_SELLER_PRIVATE_KEY,
    name: "Railguard Data Desk",
    description:
      "x402 data service on Celo Sepolia (FX quote, address risk) used in the Railguard demo.",
  },
] as const

const out: Record<string, unknown> = {
  ...prior,
  registry: CELO_SEPOLIA.identityRegistry,
  network: CELO_SEPOLIA.caip2,
}
for (const r of roles) {
  if (!r.key) {
    console.log(`${r.role}: no key in env, skipped`)
    continue
  }
  if (prior[r.role]?.agentId && !force) {
    console.log(
      `${r.role}: already registered as #${prior[r.role].agentId}, skipped (use --force to register again)`,
    )
    continue
  }
  const account = privateKeyToAccount(r.key.trim() as Hex)
  const gas = await pub.getBalance({ address: account.address })
  if (gas === 0n) {
    console.log(
      `${r.role}: ${account.address} has 0 CELO on Celo Sepolia. Get test CELO at https://faucet.celo.org then rerun.`,
    )
    continue
  }
  const registration = buildAgentRegistration({
    name: r.name,
    description: r.description,
    wallet: account.address,
    repoUrl,
  })
  const res = await registerAgentOnCeloSepolia({
    account,
    agentURI: registrationDataUri(registration),
    attributionCode: process.env.CELO_ATTRIBUTION_CODE,
    rpcUrl: rpc,
  })
  out[r.role] = {
    agentId: res.agentId.toString(),
    wallet: account.address,
    txHash: res.txHash,
    block: res.blockNumber.toString(),
    explorer: CELO_SEPOLIA.explorerTx(res.txHash),
    attribution: process.env.CELO_ATTRIBUTION_CODE
      ? "ERC-8021 schema 0 suffix"
      : "none (set CELO_ATTRIBUTION_CODE)",
    registeredAt: new Date().toISOString(),
  }
  console.log(
    `${r.role}: registered ERC-8004 agent #${res.agentId} for ${account.address} -> ${CELO_SEPOLIA.explorerTx(res.txHash)}`,
  )
}
mkdirSync(dir, { recursive: true })
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`)
console.log(`wrote ${file}`)
