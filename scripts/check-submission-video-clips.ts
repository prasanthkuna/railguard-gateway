#!/usr/bin/env bun
/**
 * Ensures recorded clips are judge-safe (no operator MP4s required for submit).
 * Run before render:hero:submission
 */
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const clipsDir = join(root, "apps", "video", "public", "clips")
const manifestPath = join(clipsDir, "manifest.json")

const SUBMISSION_REQUIRED = [
  "site-failure-lab",
  "site-judge-path",
  "site-proof",
  "arbiscan-tx",
] as const

const OPERATOR_PREFIX = "op-"
const MIN_BYTES = 80_000

let failed = 0

if (!existsSync(manifestPath)) {
  console.error("Missing manifest — run record:product with site chapters")
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  clips: { id: string; ok?: boolean; durationSec: number }[]
}

const ids = new Set(manifest.clips.map((c) => c.id))
for (const op of manifest.clips.filter((c) => c.id.startsWith(OPERATOR_PREFIX))) {
  console.log(`NOTE  operator clip in manifest: ${op.id} — excluded from submission render`)
}

for (const id of SUBMISSION_REQUIRED) {
  const mp4 = join(clipsDir, `${id}.mp4`)
  const entry = manifest.clips.find((c) => c.id === id)
  let ok = existsSync(mp4) && (entry?.durationSec ?? 0) >= 2
  if (ok) {
    const size = statSync(mp4).size
    if (size < MIN_BYTES) {
      ok = false
      console.error(`FAIL ${id} — file too small (${size} B); likely blank/login frame`)
      failed++
      continue
    }
  }
  if (!ok) {
    console.error(`FAIL ${id}`, entry?.durationSec ? `${entry.durationSec}s` : "missing")
    failed++
  } else {
    console.log(`PASS ${id} (${entry!.durationSec.toFixed(1)}s)`)
  }
}

if (!ids.has("site-judge-path")) {
  console.error("WARN  site-judge-path not in manifest — run RECORD_CHAPTER=site-judge-path")
}

if (failed) {
  console.error("\nSubmission clips NOT ready — do not upload hero with operator/login B-roll")
  process.exit(1)
}

console.log("\nSubmission clips OK — safe to: bun run render:hero:submission")
