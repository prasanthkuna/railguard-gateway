#!/usr/bin/env bun
/**
 * Verify Arc Microgrant submission pack (read-only).
 *
 *   bun run verify-arc-microgrant-pack
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createPublicClientForEvmChain } from "../packages/settlement/src/evm-chain.ts"

const root = join(import.meta.dir, "..")

type Check = { name: string; ok: boolean; detail: string }
const checks: Check[] = []

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
}

const submitDoc = join(root, "docs", "grants", "ARC_MICROGRANT_SUBMIT.md")
add("ARC_MICROGRANT_SUBMIT.md", existsSync(submitDoc), submitDoc)

const arcModule = join(root, "packages", "settlement", "src", "arc-mainnet.ts")
add("settlement arc-mainnet module", existsSync(arcModule), arcModule)

try {
  const client = await createPublicClientForEvmChain("arc")
  const block = await client.getBlockNumber()
  add("arc mainnet RPC ping", true, `block=${block}`)
} catch (e) {
  add("arc mainnet RPC ping", false, String(e))
}

const manifestPath = join(root, "evidence", "arc", "manifest.json")
let txHash: string | undefined
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    ok?: boolean
    settlement?: { status: string }
    txHash?: string
    chainId?: number
  }
  txHash = manifest.txHash
  add(
    "evidence/arc/manifest.json",
    manifest.ok === true &&
      manifest.settlement?.status === "CONFIRMED" &&
      manifest.chainId === 5042,
    manifest.ok ? `tx ${manifest.txHash?.slice(0, 10)}…` : "manifest ok !== true",
  )
} else {
  add(
    "evidence/arc/manifest.json",
    false,
    "missing — run arc-mainnet-usdc-proof or arc-mainnet-evidence",
  )
}

if (txHash) {
  const GITHUB_MANIFEST =
    "https://raw.githubusercontent.com/prasanthkuna/railguard-gateway/main/evidence/arc/manifest.json"
  try {
    const res = await fetch(GITHUB_MANIFEST, { redirect: "follow" })
    let ok = res.ok
    let detail = `${res.status} ${GITHUB_MANIFEST}`
    if (ok) {
      const manifest = (await res.json()) as { ok?: boolean; txHash?: string }
      ok = manifest.ok === true && manifest.txHash === txHash
      detail = ok ? "CONFIRMED on main" : "github manifest mismatch"
    }
    add("GitHub evidence/arc/manifest.json", ok, detail)
  } catch (e) {
    add("GitHub evidence/arc/manifest.json", false, String(e))
  }
}

const PUBLIC_ECOSYSTEM = "https://railguard-site.vercel.app/ecosystems/arc"
try {
  const res = await fetch(PUBLIC_ECOSYSTEM, { redirect: "follow" })
  add("public /ecosystems/arc", res.ok, `${res.status}`)
} catch (e) {
  add("public /ecosystems/arc", false, String(e))
}

const proofPage = join(root, "apps", "site", "app", "proof", "arc-mainnet", "page.tsx")
add("site /proof/arc-mainnet page", existsSync(proofPage), proofPage)

const portalPaste = join(root, "docs", "grants", "ARC_MICROGRANT_PORTAL_PASTE.md")
add("ARC_MICROGRANT_PORTAL_PASTE.md", existsSync(portalPaste), portalPaste)

if (txHash) {
  const lib = join(root, "apps", "site", "lib", "arc-public-proof.ts")
  if (existsSync(lib)) {
    const text = readFileSync(lib, "utf8")
    add(
      "arc-public-proof.ts synced",
      text.includes(txHash) && text.includes("CONFIRMED"),
      text.includes(txHash) ? "tx present in site lib" : "run sync-arc-public-proof",
    )
  }
}

const passed = checks.filter((c) => c.ok).length
console.log("\nArc Microgrant pack checks:\n")
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}\n      ${c.detail}`)
}
console.log(`\nSummary: ${passed}/${checks.length} passed\n`)
console.log("Portal: https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq")
process.exit(passed === checks.length ? 0 : 1)
