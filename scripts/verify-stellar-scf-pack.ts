#!/usr/bin/env bun
/**
 * Verify Stellar SCF #46 submission pack (read-only).
 *
 *   bun run verify-stellar-scf-pack
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")

type Check = { name: string; ok: boolean; detail: string }

const checks: Check[] = []

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
}

const TX = "3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437"

const manifestPath = join(root, "evidence", "stellar-testnet", "manifest.json")
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    status?: string
    transaction_hash?: string
  }
  add(
    "evidence/stellar-testnet manifest",
    manifest.status === "CONFIRMED" && manifest.transaction_hash === TX,
    manifest.status === "CONFIRMED" ? `tx ${TX.slice(0, 10)}…` : `status=${manifest.status}`,
  )
} else {
  add("evidence/stellar-testnet manifest", false, "missing file")
}

const readme = join(root, "evidence", "stellar-testnet", "README.md")
add(
  "evidence/stellar-testnet README",
  existsSync(readme) && readFileSync(readme, "utf8").includes(TX.slice(0, 8)),
  readme,
)

const interestForm = join(root, "docs", "grants", "STELLAR_SCF_46_INTEREST_FORM.md")
add("STELLAR_SCF_46_INTEREST_FORM.md", existsSync(interestForm), interestForm)

const buildDoc = join(root, "docs", "grants", "STELLAR_SCF_46_BUILD.md")
add("STELLAR_SCF_46_BUILD.md", existsSync(buildDoc), buildDoc)

const GITHUB_MANIFEST =
  "https://raw.githubusercontent.com/prasanthkuna/railguard-gateway/main/evidence/stellar-testnet/manifest.json"
try {
  const res = await fetch(GITHUB_MANIFEST, { redirect: "follow" })
  let ok = res.ok
  let detail = `${res.status} ${GITHUB_MANIFEST}`
  if (ok) {
    const manifest = (await res.json()) as { status?: string; transaction_hash?: string }
    ok = manifest.status === "CONFIRMED" && manifest.transaction_hash === TX
    detail = ok ? "CONFIRMED on main" : `github manifest mismatch status=${manifest.status}`
  }
  add("GitHub evidence/stellar-testnet/manifest.json", ok, detail)
} catch (e) {
  add("GitHub evidence/stellar-testnet/manifest.json", false, String(e))
}

const proofPage = join(root, "apps", "site", "app", "proof", "stellar-testnet", "page.tsx")
add("site proof page source", existsSync(proofPage), proofPage)

const PUBLIC_PROOF = "https://railguard-site.vercel.app/proof/stellar-testnet"
const STELLAR_ECOSYSTEM = "https://railguard-site.vercel.app/ecosystems/stellar"

const urlChecks: { name: string; url: string; bodyMust?: string[] }[] = [
  {
    name: "public Stellar proof page",
    url: PUBLIC_PROOF,
    bodyMust: ["CONFIRMED", TX.slice(0, 8), "Horizon"],
  },
  {
    name: "site stellar ecosystem",
    url: STELLAR_ECOSYSTEM,
    bodyMust: ["Stellar", "Horizon"],
  },
  { name: "site attack lab", url: "https://railguard-site.vercel.app/attack" },
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
console.log("Interest form: docs/grants/STELLAR_SCF_46_INTEREST_FORM.md")
console.log(`Public proof (after deploy): ${PUBLIC_PROOF}`)

if (failed.length) {
  process.exit(1)
}
