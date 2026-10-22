#!/usr/bin/env bun
/**
 * Arc mainnet settlement evidence — read-only RPC verification.
 *
 * Usage:
 *   ARC_MAINNET_TX_HASH=0x...
 *   ARC_MAINNET_SENDER=0x...
 *   ARC_MAINNET_RECIPIENT=0x...
 *   ARC_MAINNET_AMOUNT=10000
 *   bun run arc-mainnet-evidence
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  expectedArcMainnetTransferFromEnv,
  generateArcMainnetEvidence,
} from "../packages/settlement/src/arc-mainnet.ts"

const evidenceDir = join(import.meta.dir, "..", "evidence", "arc")

function serializeEvidence(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  )
}

async function main(): Promise<void> {
  mkdirSync(evidenceDir, { recursive: true })

  const txHash = process.env.ARC_MAINNET_TX_HASH?.trim()
  if (!txHash) {
    throw new Error("ARC_MAINNET_TX_HASH is required")
  }

  const evidence = await generateArcMainnetEvidence({
    txHash,
    expected: expectedArcMainnetTransferFromEnv(),
    rpcUrl: process.env.ARC_MAINNET_RPC_URL,
  })

  const bundle = {
    ...evidence,
    expected: {
      ...evidence.expected,
      amount: evidence.expected.amount.toString(),
    },
    ok: evidence.settlement.status === "CONFIRMED",
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
  expected: { sender: string; recipient: string; amount: string }
  settlement: { status: string }
}): string {
  return `# Arc mainnet — settlement evidence

| Field | Value |
|-------|-------|
| Network | Arc mainnet |
| Chain ID | ${bundle.chainId} |
| Tx hash | \`${bundle.txHash}\` |
| Explorer | ${bundle.explorerUrl} |
| Settlement | ${bundle.settlement.status} |

## Reproduce

\`\`\`powershell
cd railguard-gateway
$env:ARC_MAINNET_TX_HASH="${bundle.txHash}"
$env:ARC_MAINNET_SENDER="${bundle.expected.sender}"
$env:ARC_MAINNET_RECIPIENT="${bundle.expected.recipient}"
$env:ARC_MAINNET_AMOUNT="${bundle.expected.amount}"
bun run arc-mainnet-evidence
\`\`\`

USDC ERC-20 on Arc: \`0x3600000000000000000000000000000000000000\` (6 decimals). Gas is native USDC — bridge via Circle CCTP.
`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
