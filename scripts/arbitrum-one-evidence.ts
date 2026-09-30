#!/usr/bin/env bun
/**
 * Arbitrum One mainnet settlement evidence — read-only RPC verification.
 *
 * Usage:
 *   ARBITRUM_ONE_TX_HASH=0x... bun run arbitrum-one-evidence
 *   # or auto-discover USDT transfer between default grant wallets:
 *   bun run arbitrum-one-evidence
 */

import { existsSync, readFileSync } from "node:fs"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const envLocal = join(import.meta.dir, "..", ".env.local")
if (existsSync(envLocal)) {
  for (const line of readFileSync(envLocal, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}
import { generateArbitrumOneEvidence } from "../packages/settlement/src/arbitrum-one.ts"

const evidenceDir = join(import.meta.dir, "..", "evidence", "arbitrum-one")

function serializeEvidence(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  )
}

async function main(): Promise<void> {
  mkdirSync(evidenceDir, { recursive: true })

  const evidence = await generateArbitrumOneEvidence({
    txHash: process.env.ARBITRUM_ONE_TX_HASH,
    rpcUrl: process.env.ARBITRUM_ONE_RPC_URL,
    token: process.env.ARBITRUM_ONE_TOKEN as "usdt" | "usdc" | undefined,
    fromAddress: process.env.ARBITRUM_ONE_FROM,
    toAddress: process.env.ARBITRUM_ONE_TO,
  })

  const bundle = {
    ...evidence,
    ok: evidence.settlement.status === "CONFIRMED",
    grantWallets: {
      sender: process.env.ARBITRUM_ONE_FROM ?? "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d",
      recipient: process.env.ARBITRUM_ONE_TO ?? "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233",
    },
  }

  const outPath = join(evidenceDir, "manifest.json")
  writeFileSync(outPath, serializeEvidence(bundle))
  writeFileSync(join(evidenceDir, "README.md"), buildReadme(bundle))
  console.log(serializeEvidence(bundle))

  if (!bundle.ok) {
    process.exit(1)
  }
}

function buildReadme(bundle: {
  txHash: string
  explorerUrl: string
  chainId: number
  token: string
  tokenAddress: string
  settlement: { status: string }
}): string {
  return `# Arbitrum One — mainnet settlement evidence

| Field | Value |
|-------|-------|
| Network | Arbitrum One |
| Chain ID | ${bundle.chainId} |
| Token | ${bundle.token.toUpperCase()} (\`${bundle.tokenAddress}\`) |
| Tx hash | \`${bundle.txHash}\` |
| Explorer | ${bundle.explorerUrl} |
| Settlement | ${bundle.settlement.status} |

## Reproduce

\`\`\`powershell
cd railguard-gateway
$env:ARBITRUM_ONE_TX_HASH="${bundle.txHash}"
bun run arbitrum-one-evidence
\`\`\`
`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
