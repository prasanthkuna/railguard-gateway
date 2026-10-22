#!/usr/bin/env bun
/**
 * Fail CI when docs/ecosystems.yaml drifts from the public site manifest.
 *
 * The TypeScript manifest is the product-facing source of truth.
 * YAML exists for human-readable ecosystem/reviewer documentation.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ECOSYSTEM_MANIFEST } from "../apps/site/lib/ecosystems.manifest.ts"

const root = join(import.meta.dir, "..")
const yaml = readFileSync(join(root, "docs", "ecosystems.yaml"), "utf8")

type YamlEntry = { status?: string; chain?: string }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&")
}

function yamlEcosystem(id: string): YamlEntry {
  const escaped = escapeRegExp(id)
  const block = yaml.match(new RegExp(`\\n  - id: ${escaped}\\n[\\s\\S]*?(?=\\n  - id:|\\nadapters:|$)`))
  if (!block) return {}

  const text = block[0]
  const status = text.match(/^\s+status:\s*(\S+)/m)?.[1]
  const chainsBlock = text.match(/\s+chains:\s*\n((?:\s+- .+\n?)+)/)?.[1]
  const chain = chainsBlock?.match(/\s+- ([a-z0-9-]+)/)?.[1]
  return { status, chain }
}

const pairs: Array<{
  yamlId: string
  manifestId: string
  expectedChain?: string
}> = [
  { yamlId: "x402", manifestId: "x402" },
  { yamlId: "coinbase-cdp", manifestId: "cdp" },
  { yamlId: "base", manifestId: "base", expectedChain: "base-sepolia" },
  { yamlId: "arbitrum", manifestId: "arbitrum", expectedChain: "arbitrum-sepolia" },
  { yamlId: "monad", manifestId: "monad", expectedChain: "monad-testnet" },
  { yamlId: "arc", manifestId: "arc", expectedChain: "arc-testnet" },
  { yamlId: "stellar", manifestId: "stellar" },
  { yamlId: "celo", manifestId: "celo", expectedChain: "celo-alfajores" },
  { yamlId: "airwallex", manifestId: "airwallex" },
  { yamlId: "failure-lab", manifestId: "failure-lab" },
]

const errors: string[] = []

for (const pair of pairs) {
  const fromYaml = yamlEcosystem(pair.yamlId)
  const fromManifest = ECOSYSTEM_MANIFEST.find((entry) => entry.id === pair.manifestId)

  if (!fromManifest) {
    errors.push(`site manifest missing id ${pair.manifestId}`)
    continue
  }

  if (!fromYaml.status) {
    errors.push(`docs/ecosystems.yaml missing id ${pair.yamlId}`)
    continue
  }

  if (fromYaml.status !== fromManifest.status) {
    errors.push(
      `${pair.yamlId} status drift: yaml=${fromYaml.status} site=${fromManifest.status}`,
    )
  }

  if (pair.expectedChain && fromYaml.chain !== pair.expectedChain) {
    errors.push(
      `${pair.yamlId} chain drift: yaml=${fromYaml.chain ?? "none"} expected=${pair.expectedChain}`,
    )
  }
}

if (errors.length) {
  console.error("Ecosystem manifest drift:\n")
  for (const error of errors) console.error(`  - ${error}`)
  console.error("\nCanonical product source: apps/site/lib/ecosystems.manifest.ts")
  process.exit(1)
}

console.log(`OK - docs/ecosystems.yaml matches all ${pairs.length} checked ecosystem entries`)
