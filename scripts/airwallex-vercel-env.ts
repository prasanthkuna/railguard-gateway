/**
 * Pushes the live-runner env vars from local .env to the Vercel operator project (prebroadcast),
 * piping each value over stdin. Values are never printed. Run from the repo root:
 *
 *   bun scripts/airwallex-vercel-env.ts
 */
import { randomBytes } from "node:crypto"
import { join } from "node:path"
import { setEnvVar } from "./lib-env-file"

const root = join(import.meta.dir, "..")
if (!process.env.AIRWALLEX_OPERATOR_TOKEN) {
  const token = randomBytes(24).toString("base64url")
  setEnvVar(join(root, ".env"), "AIRWALLEX_OPERATOR_TOKEN", token, false)
  process.env.AIRWALLEX_OPERATOR_TOKEN = token
}
const NAMES = [
  "AIRWALLEX_CLIENT_ID",
  "AIRWALLEX_API_KEY",
  "AIRWALLEX_BENEFICIARY_ID",
  "AIRWALLEX_BASE_URL",
  "AIRWALLEX_WEBHOOK_SECRET",
  "AIRWALLEX_OPERATOR_TOKEN",
  "RAILGUARD_RELAY_PRIVATE_KEY",
  "GEMINI_API_KEY",
]
const cwd = join(root, "apps", "operator")
const vercel = process.platform === "win32" ? "vercel.cmd" : "vercel"
const report: Record<string, string> = {}
for (const name of NAMES) {
  const value = process.env[name]?.trim()
  if (!value) {
    report[name] = "missing locally (skipped)"
    continue
  }
  const rm = Bun.spawn([vercel, "env", "rm", name, "production", "-y"], { cwd, stdout: "ignore", stderr: "ignore" })
  await rm.exited
  const add = Bun.spawn([vercel, "env", "add", name, "production", "--sensitive"], {
    cwd,
    stdin: new Blob([value]),
    stdout: "ignore",
    stderr: "pipe",
  })
  const code = await add.exited
  const err = code === 0 ? "" : (await new Response(add.stderr).text()).split("\n").filter(Boolean).pop()
  report[name] = code === 0 ? "set" : `failed (${(err ?? "").replaceAll(value, "***").slice(0, 120)})`
}
console.log(JSON.stringify(report, null, 2))
