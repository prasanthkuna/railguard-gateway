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

const TX =
  "0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2"

type Check = { name: string; ok: boolean; detail: string }

const checks: Check[] = []

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
}

const submitDoc = join(root, "docs", "grants", "MONAD_METROPOLIS_SUBMIT.md")
add("MONAD_METROPOLIS_SUBMIT.md", existsSync(submitDoc), submitDoc)

const portalPaste = join(root, "docs", "grants", "MONAD_METROPOLIS_PORTAL_PASTE.md")
add("MONAD_METROPOLIS_PORTAL_PASTE.md", existsSync(portalPaste), portalPaste)

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
    manifest.ok === true &&
      manifest.settlement?.status === "CONFIRMED" &&
      manifest.txHash === TX,
    manifest.ok ? `tx ${manifest.txHash?.slice(0, 10)}…` : "manifest ok !== true",
  )
} else {
  add(
    "evidence/monad-testnet manifest",
    false,
    "missing — run monad-testnet-evidence after your USDC transfer",
  )
}

const GITHUB_MANIFEST =
  "https://raw.githubusercontent.com/prasanthkuna/railguard-gateway/main/evidence/monad-testnet/manifest.json"
try {
  const res = await fetch(GITHUB_MANIFEST, { redirect: "follow" })
  let ok = res.ok
  let detail = `${res.status} ${GITHUB_MANIFEST}`
  if (ok) {
    const manifest = (await res.json()) as {
      ok?: boolean
      settlement?: { status: string }
      txHash?: string
    }
    ok =
      manifest.ok === true &&
      manifest.settlement?.status === "CONFIRMED" &&
      manifest.txHash === TX
    detail = ok ? "CONFIRMED on main" : `github manifest mismatch ok=${manifest.ok}`
  }
  add("GitHub evidence/monad-testnet/manifest.json", ok, detail)
} catch (e) {
  add("GitHub evidence/monad-testnet/manifest.json", false, String(e))
}

const proofPage = join(root, "apps", "site", "app", "proof", "monad-testnet", "page.tsx")
add("site /proof/monad-testnet page", existsSync(proofPage), proofPage)

const PUBLIC_PROOF = "https://railguard-site.vercel.app/proof/monad-testnet"
const MONAD_ECOSYSTEM = "https://railguard-site.vercel.app/ecosystems/monad"

const urlChecks: { name: string; url: string; bodyMust?: string[] }[] = [
  {
    name: "public Monad proof page",
    url: PUBLIC_PROOF,
    bodyMust: ["CONFIRMED", TX.slice(0, 8), "10143"],
  },
  {
    name: "site monad ecosystem",
    url: MONAD_ECOSYSTEM,
    bodyMust: ["Monad", "TESTNET VERIFIED"],
  },
]

for (const { name, url, bodyMust } of urlChecks) {
  try {
    const res = await fetch(url, { redirect: "follow" })
    let ok = res.ok
    let detail = `${res.status} ${url}`
    if (ok && bodyMust?.length) {
      const html = await res.text()
      const missing = bodyMust.filter((s) => !html.includes(s))
      ok = missing.length === 0
      detail = ok ? detail : `missing in body: ${missing.join(", ")}`
    }
    add(`URL ${name}`, ok, detail)
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
console.log(`Public proof: ${PUBLIC_PROOF}`)
console.log("Portal: https://hackathon.monad.xyz/")
console.log("Submit doc: docs/grants/MONAD_METROPOLIS_SUBMIT.md")
console.log("Paste doc: docs/grants/MONAD_METROPOLIS_PORTAL_PASTE.md")

if (failed.length) {
  process.exit(1)
}
