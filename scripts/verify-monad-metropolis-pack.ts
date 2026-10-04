#!/usr/bin/env bun
/**
 * Verify Monad Metropolis submission pack (read-only).
 *
 *   bun run verify-monad-metropolis-pack
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { createPublicClientForEvmChain } from "../packages/settlement/src/evm-chain.ts"

const root = join(import.meta.dir, "..")

type Check = { name: string; ok: boolean; detail: string }

const checks: Check[] = []

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
}

const submitDoc = join(root, "docs", "grants", "MONAD_METROPOLIS_SUBMIT.md")
add("MONAD_METROPOLIS_SUBMIT.md", existsSync(submitDoc), submitDoc)

const monadModule = join(root, "packages", "settlement", "src", "monad-testnet.ts")
add("settlement monad-testnet module", existsSync(monadModule), monadModule)

try {
  const client = await createPublicClientForEvmChain("monad-testnet")
  const block = await client.getBlockNumber()
  add("monad-testnet RPC ping", true, `block=${block}`)
} catch (e) {
  add("monad-testnet RPC ping", false, String(e))
}

const manifestPath = join(root, "evidence", "monad-testnet", "manifest.json")
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    ok?: boolean
    settlement?: { status: string }
    txHash?: string
  }
  add(
    "evidence/monad-testnet manifest",
    manifest.ok === true && manifest.settlement?.status === "CONFIRMED",
    manifest.ok ? `tx ${manifest.txHash?.slice(0, 10)}…` : "manifest ok !== true",
  )
} else {
  add(
    "evidence/monad-testnet manifest",
    false,
    "missing — run monad-testnet-evidence after your USDC transfer",
  )
}

const proofPage = join(root, "apps", "site", "app", "proof", "monad-testnet", "page.tsx")
add(
  "site /proof/monad-testnet page",
  existsSync(proofPage),
  existsSync(proofPage) ? proofPage : "add after manifest is committed",
)

const PUBLIC_PROOF = "https://railguard-site.vercel.app/proof/monad-testnet"
const MONAD_ECOSYSTEM = "https://railguard-site.vercel.app/ecosystems/monad"

for (const { name, url } of [
  { name: "public Monad proof page", url: PUBLIC_PROOF },
  { name: "site monad ecosystem", url: MONAD_ECOSYSTEM },
]) {
  try {
    const res = await fetch(url, { redirect: "follow" })
    add(`URL ${name}`, res.ok, `${res.status} ${url}`)
  } catch (e) {
    add(`URL ${name}`, false, String(e))
  }
}

const failed = checks.filter((c) => !c.ok)
for (const c of checks) {
  const mark = c.ok ? "PASS" : "FAIL"
  console.log(`${mark}  ${c.name} — ${c.detail}`)
}

console.log("")
console.log(`Summary: ${checks.length - failed.length}/${checks.length} passed`)
console.log("")
console.log("Portal: https://hackathon.monad.xyz/")
console.log("Submit doc: docs/grants/MONAD_METROPOLIS_SUBMIT.md")

if (failed.length) {
  process.exit(1)
}
