import { spawnSync } from "node:child_process"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const target = process.argv[2] === "technical" ? "render:technical" : "render:hero"
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")

process.env.RAILGUARD_VIDEO_MODE = "submission"

const r = spawnSync("bun", ["run", "--filter", "@railguard/video", target], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
})

process.exit(r.status ?? 1)
