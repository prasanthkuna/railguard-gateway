#!/usr/bin/env bun
/** CI-friendly gate for product clip recordings (P3). */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const qualityPath = join(root, "apps", "video", "director", "record-quality.json")
const clipsDir = join(root, "apps", "video", "public", "clips")

if (!existsSync(qualityPath)) {
  console.error("Missing record-quality.json — run: bun run record:product")
  process.exit(1)
}

const quality = JSON.parse(readFileSync(qualityPath, "utf8")) as {
  chapters: { id: string; ok: boolean; durationSec: number; note?: string }[]
  minDurationSec?: number
}

const minDur = quality.minDurationSec ?? 2
const submissionOnly = process.argv.includes("--submission")

const required = submissionOnly
  ? ["site-failure-lab", "site-proof", "site-judge-path", "arbiscan-tx"]
  : ["site-failure-lab", "site-proof", "op-settled-proof"]

let failed = 0
for (const id of required) {
  const ch = quality.chapters.find((c) => c.id === id)
  const mp4 = join(clipsDir, `${id}.mp4`)
  if (!ch?.ok || !existsSync(mp4) || ch.durationSec < minDur) {
    console.error(`FAIL ${id}`, ch?.note ?? "missing or too short")
    failed++
  } else {
    console.log(`PASS ${id} (${ch.durationSec.toFixed(1)}s)`)
  }
}

if (failed) process.exit(1)
console.log("Record quality OK")
