#!/usr/bin/env bun
/**
 * Verify HackQuest / Arbitrum testnet submission pack (read-only).
 *
 *   bun run verify-hackquest-pack
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")

type Check = { name: string; ok: boolean; detail: string }

const checks: Check[] = []

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
}

const manifestPath = join(root, "evidence", "arbitrum-sepolia", "manifest.json")
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    ok?: boolean
    settlement?: { status: string }
    txHash?: string
  }
  add(
    "evidence/arbitrum-sepolia manifest",
    manifest.ok === true && manifest.settlement?.status === "CONFIRMED",
    manifest.ok ? `tx ${manifest.txHash?.slice(0, 10)}…` : "manifest ok !== true",
  )
} else {
  add("evidence/arbitrum-sepolia manifest", false, "missing file")
}

const hookReadme = join(root, "evidence", "arbitrum-sepolia-hook", "README.md")
add(
  "evidence/arbitrum-sepolia-hook README",
  existsSync(hookReadme) && readFileSync(hookReadme, "utf8").includes("0x756829"),
  hookReadme,
)

const hfIndex = join(root, "apps", "hyperframes", "grant-90s", "index.html")
add("HyperFrames grant-90s composition", existsSync(hfIndex), hfIndex)

const urls = [
  ["prebroadcast execution", "https://prebroadcast.vercel.app/executions/exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa"],
  ["site arbitrum", "https://railguard-site.vercel.app/ecosystems/arbitrum"],
  ["site attack lab", "https://railguard-site.vercel.app/attack"],
] as const

for (const [name, url] of urls) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" })
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

if (failed.length) {
  process.exit(1)
}
