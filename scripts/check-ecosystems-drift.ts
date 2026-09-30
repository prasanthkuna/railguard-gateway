#!/usr/bin/env bun
/**
 * Fail CI when docs/ecosystems.yaml drifts from apps/site/lib/ecosystems.manifest.ts
 * for shared ecosystem ids.
 *
 *   bun run check:ecosystems-drift
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ECOSYSTEM_MANIFEST } from "../apps/site/lib/ecosystems.manifest.ts"

const root = join(import.meta.dir, "..")
const yamlPath = join(root, "docs", "ecosystems.yaml")
const yaml = readFileSync(yamlPath, "utf8")

/** Minimal parse: id + status + first chain line under an ecosystem block */
function yamlEcosystem(id: string): { status?: string; chain?: string } {
  const block = yaml.match(new RegExp(`- id: ${id}[\\s\\S]*?(?=\\n  - id:|\\ngrant_programs:|$)`))
  if (!block) return {}
  const text = block[0]
  const status = text.match(/^\s+status:\s*(\S+)/m)?.[1]
  const chainsBlock = text.match(/\s+chains:\s*\n((?:\s+- .+\n?)+)/)?.[1]
  const chain = chainsBlock?.match(/\s+- ([a-z0-9-]+)/)?.[1]
  return { status, chain }
}

const PAIRS: { yamlId: string; manifestId: string }[] = [
  { yamlId: "arbitrum", manifestId: "arbitrum" },
  { yamlId: "base", manifestId: "base" },
  { yamlId: "stellar", manifestId: "stellar" },
  { yamlId: "failure-lab", manifestId: "failure-lab" },
]

const errors: string[] = []

for (const { yamlId, manifestId } of PAIRS) {
  const fromYaml = yamlEcosystem(yamlId)
  const entry = ECOSYSTEM_MANIFEST.find((e) => e.id === manifestId)
  if (!entry) {
    errors.push(`manifest missing id ${manifestId}`)
    continue
  }
  if (!fromYaml.status) {
    errors.push(`yaml missing ecosystem ${yamlId}`)
    continue
  }

  const manifestStatus =
    entry.status === "testnet" || entry.status === "integrated" || entry.status === "shipped"
      ? entry.status
      : entry.status

  if (yamlId === "arbitrum") {
    if (fromYaml.status !== "testnet") {
      errors.push(`arbitrum yaml status=${fromYaml.status} expected testnet`)
    }
    if (fromYaml.chain !== "arbitrum-sepolia") {
      errors.push(`arbitrum yaml chain=${fromYaml.chain ?? "none"} expected arbitrum-sepolia`)
    }
    if (entry.rail !== "arbitrum-sepolia") {
      errors.push(`manifest arbitrum rail=${entry.rail} expected arbitrum-sepolia`)
    }
  }

  if (yamlId === "base" && fromYaml.status !== "testnet") {
    errors.push(`base yaml status=${fromYaml.status} expected testnet`)
  }
  if (yamlId === "stellar" && fromYaml.status !== "testnet") {
    errors.push(`stellar yaml status=${fromYaml.status} expected testnet`)
  }
  if (yamlId === "failure-lab" && fromYaml.status !== "shipped") {
    errors.push(`failure-lab yaml status=${fromYaml.status} expected shipped`)
  }

  void manifestStatus
}

if (errors.length) {
  console.error("Ecosystem manifest drift:\n")
  for (const e of errors) console.error(`  - ${e}`)
  console.error("\nCanonical site source: apps/site/lib/ecosystems.manifest.ts")
  process.exit(1)
}

console.log("OK — docs/ecosystems.yaml matches manifest for checked ecosystems")
