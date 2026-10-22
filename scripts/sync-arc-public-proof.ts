#!/usr/bin/env bun
/** Write apps/site/lib/arc-public-proof.ts from evidence/arc/manifest.json */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const manifestPath = join(root, "evidence", "arc", "manifest.json")
const outPath = join(root, "apps", "site", "lib", "arc-public-proof.ts")

if (!existsSync(manifestPath)) {
  console.error("Missing evidence/arc/manifest.json — run arc-mainnet-usdc-proof first")
  process.exit(1)
}

const m = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  txHash: string
  explorerUrl: string
  chainId: number
  expected: { sender: string; recipient: string; amount: string }
  settlement: { status: string }
  generatedAt: string
  ok?: boolean
}

if (m.ok !== true || m.settlement?.status !== "CONFIRMED") {
  console.error("Manifest not CONFIRMED — fix before syncing public proof")
  process.exit(1)
}

const amountBase = m.expected.amount
const amountHuman =
  amountBase === "10000"
    ? "0.01 USDC"
    : `${amountBase} base units (6 dec)`

const content = `/** Public Arc mainnet proof constants (from evidence manifest — no auth). */
export const ARC_MAINNET_PROOF = {
  slug: "arc-mainnet",
  networkLabel: "Arc mainnet · chain ${m.chainId}",
  chainId: ${m.chainId},
  status: "CONFIRMED" as const,
  amountHuman: "${amountHuman}",
  amountBaseUnits: "${amountBase}",
  txHash: "${m.txHash}",
  explorerUrl: "${m.explorerUrl}",
  tokenAddress: "0x3600000000000000000000000000000000000000",
  sender: "${m.expected.sender}",
  recipient: "${m.expected.recipient}",
  manifestGeneratedAt: "${m.generatedAt}",
  evidenceRepoPath: "evidence/arc/manifest.json",
  reproduceCommand: "bun run arc-mainnet-evidence",
} as const
`

writeFileSync(outPath, content)
console.log(`Wrote ${outPath}`)
