/**
 * Creates (or reuses) the Airwallex SANDBOX webhook for payout.transfer.* events and stores its
 * secret in local .env as AIRWALLEX_WEBHOOK_SECRET. Prints ids and URLs only, never the secret.
 *
 *   bun scripts/airwallex-webhook-setup.ts https://prebroadcast.vercel.app/airwallex-live/webhook
 */
import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { AIRWALLEX_SANDBOX_BASE_URL, assertSandboxBaseUrl } from "../packages/kernel/src/adapters/airwallex"
import { setEnvVar } from "./lib-env-file"

const url = process.argv[2]
if (!url?.startsWith("https://")) {
  console.error("usage: bun scripts/airwallex-webhook-setup.ts <https url>")
  process.exit(2)
}
for (const name of ["AIRWALLEX_CLIENT_ID", "AIRWALLEX_API_KEY"]) {
  if (!process.env[name]) {
    console.error(`missing env ${name}`)
    process.exit(2)
  }
}
const base = process.env.AIRWALLEX_BASE_URL ?? AIRWALLEX_SANDBOX_BASE_URL
assertSandboxBaseUrl(base)
const EVENTS = [
  "payout.transfer.processing",
  "payout.transfer.sent",
  "payout.transfer.paid",
  "payout.transfer.failed",
  "payout.transfer.cancelled",
]

const login = await fetch(`${base}/api/v1/authentication/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-client-id": process.env.AIRWALLEX_CLIENT_ID as string,
    "x-api-key": process.env.AIRWALLEX_API_KEY as string,
  },
})
if (!login.ok) {
  console.error(`login failed: HTTP ${login.status}`)
  process.exit(1)
}
const { token } = (await login.json()) as { token: string }
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

type Hook = { id: string; url: string; secret?: string; events?: string[]; version?: string }
const list = await fetch(`${base}/api/v1/webhooks?page_size=100`, { headers })
const items = list.ok ? (((await list.json()) as { items?: Hook[] }).items ?? []) : []
let hook = items.find((h) => h.url === url)
let created = false
if (!hook) {
  const res = await fetch(`${base}/api/v1/webhooks/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      request_id: `rg_wh_${createHash("sha256").update(url).digest("hex").slice(0, 32)}`,
      url,
      version: "2025-06-30",
      events: EVENTS,
    }),
  })
  const body = (await res.json().catch(() => ({}))) as Hook & { code?: string; message?: string }
  if (!res.ok) {
    console.error(`webhook create failed: HTTP ${res.status} ${body.code ?? ""} ${body.message ?? ""}`)
    process.exit(1)
  }
  hook = body
  created = true
}
if (!hook.secret) {
  const res = await fetch(`${base}/api/v1/webhooks/${encodeURIComponent(hook.id)}`, { headers })
  hook = { ...hook, ...((await res.json()) as Hook) }
}
if (!hook.secret) {
  console.error("webhook has no secret in the API response")
  process.exit(1)
}
const stored = setEnvVar(join(import.meta.dir, "..", ".env"), "AIRWALLEX_WEBHOOK_SECRET", hook.secret)
const evidence = {
  kind: "airwallex-sandbox-webhook",
  generatedAt: new Date().toISOString(),
  baseUrlHost: new URL(base).hostname,
  webhookId: hook.id,
  url: hook.url,
  version: hook.version,
  events: hook.events,
  created,
  note: "Secret stored only in local .env and the runner's env; never recorded here.",
}
const dir = join(import.meta.dir, "..", "evidence", "airwallex-sandbox")
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, "webhook.json"), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, webhookId: hook.id, url: hook.url, created, secretInEnv: stored }))
