#!/usr/bin/env bun
/**
 * Monad testnet live settlement evidence — read-only RPC verification.
 *
 * Usage:
 *   MONAD_TESTNET_TX_HASH=0x...
 *   MONAD_TESTNET_SENDER=0x...
 *   MONAD_TESTNET_RECIPIENT=0x...
 *   MONAD_TESTNET_AMOUNT=10000
 *   bun run monad-testnet-evidence
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  expectedMonadTestnetTransferFromEnv,
  generateMonadTestnetEvidence,
} from "../packages/settlement/src/monad-testnet.ts"

const evidenceDir = join(import.meta.dir, "..", "evidence", "monad-testnet")

function serializeEvidence(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  )
}

async function main(): Promise<void> {
  mkdirSync(evidenceDir, { recursive: true })

  const txHash = process.env.MONAD_TESTNET_TX_HASH?.trim()
  if (!txHash) {
    throw new Error("MONAD_TESTNET_TX_HASH is required")
  }

  const evidence = await generateMonadTestnetEvidence({
    txHash,
    expected: expectedMonadTestnetTransferFromEnv(),
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL,
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
  return `# Monad testnet — settlement evidence

| Field | Value |
|-------|-------|
| Network | Monad testnet |
| Chain ID | ${bundle.chainId} |
| Tx hash | \`${bundle.txHash}\` |
| Explorer | ${bundle.explorerUrl} |
| Settlement | ${bundle.settlement.status} |

## Reproduce

\`\`\`powershell
cd railguard-gateway
$env:MONAD_TESTNET_TX_HASH="${bundle.txHash}"
$env:MONAD_TESTNET_SENDER="${bundle.expected.sender}"
$env:MONAD_TESTNET_RECIPIENT="${bundle.expected.recipient}"
$env:MONAD_TESTNET_AMOUNT="${bundle.expected.amount}"
bun run monad-testnet-evidence
\`\`\`

USDC on Monad testnet: \`0x534b2f3A21130d7a60830c2Df862319e593943A3\` (6 decimals). USDC faucet: https://faucet.circle.com/ · MON gas faucet: https://faucet.monad.xyz
`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
