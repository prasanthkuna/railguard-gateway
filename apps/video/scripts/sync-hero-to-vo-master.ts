/**
 * After you approve vo-master.json, rebuild hero timing + render.
 *   bun run apps/video/scripts/sync-hero-to-vo-master.ts
 */
import { existsSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST = join(ROOT, "public", "vo", "vo-master.json")

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
  approved?: boolean
  totalSec: number
}

if (!manifest.approved) {
  console.error("vo-master not approved. Set approved:true in public/vo/vo-master.json after listening.")
  process.exit(1)
}

const repo = join(ROOT, "..", "..")
spawnSync("bun", ["run", "--filter", "@railguard/video", "render:hero"], {
  cwd: repo,
  stdio: "inherit",
  shell: true,
})
