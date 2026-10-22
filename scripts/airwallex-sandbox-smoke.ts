/**
 * Airwallex SANDBOX smoke (fake money). Refuses any non-sandbox base URL.
 * Required env (names only): AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY, AIRWALLEX_BENEFICIARY_ID
 * Optional: AIRWALLEX_BASE_URL (default https://api-demo.airwallex.com), AIRWALLEX_SOURCE_CURRENCY,
 *           AIRWALLEX_SMOKE_CURRENCY (default USD), AIRWALLEX_SMOKE_AMOUNT (default 1.00)
 * Writes non-secret evidence to evidence/airwallex-sandbox/manifest.json.
 *
 *   bun scripts/airwallex-sandbox-smoke.ts
 */
import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  AIRWALLEX_SANDBOX_BASE_URL,
  AirwallexApiError,
  assertSandboxBaseUrl,
  createAirwallexClient,
  createAirwallexExecutionRail,
  demoGrant,
  demoPayoutIntent,
  mapAirwallexStatus,
} from "../packages/kernel/src/adapters/airwallex"

const required = ["AIRWALLEX_CLIENT_ID", "AIRWALLEX_API_KEY", "AIRWALLEX_BENEFICIARY_ID"] as const
const missing = required.filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`airwallex smoke: missing env ${missing.join(", ")} (values are never printed)`)
  console.error("Get them from the Airwallex sandbox web app > Developer > API keys / Beneficiaries.")
  process.exit(2)
}

const baseUrl = process.env.AIRWALLEX_BASE_URL ?? AIRWALLEX_SANDBOX_BASE_URL
assertSandboxBaseUrl(baseUrl)
const currency = process.env.AIRWALLEX_SMOKE_CURRENCY ?? "USD"
const amount = process.env.AIRWALLEX_SMOKE_AMOUNT ?? "1.00"
const beneficiaryId = process.env.AIRWALLEX_BENEFICIARY_ID as string

const client = createAirwallexClient({
  credentials: {
    clientId: process.env.AIRWALLEX_CLIENT_ID as string,
    apiKey: process.env.AIRWALLEX_API_KEY as string,
  },
  baseUrl,
})
const rail = createAirwallexExecutionRail({
  client,
  sourceCurrency: process.env.AIRWALLEX_SOURCE_CURRENCY ?? currency,
})

const intentId = `intent_awx_smoke_${Date.now()}`
const base = demoPayoutIntent(intentId, amount, currency)
const intent = { ...base, counterparty: { id: beneficiaryId } }
const grant = { ...demoGrant(intent), executionConstraints: { rails: ["airwallex"] } }

const steps: Array<Record<string, unknown>> = []
const prepared = await rail.prepare(intent, grant)
steps.push({ step: "prepare", requestId: prepared.providerIdempotencyKey, requestHash: prepared.requestHash })

const submission = await rail.execute(prepared)
steps.push({ step: "create", result: submission.result, transferId: submission.providerOperationId })

// Second execute for the same intent must be blocked locally.
let blocked = false
try {
  await rail.execute(prepared)
} catch {
  blocked = true
}
steps.push({ step: "duplicate_execute_blocked", blocked })

// Replaying the same request_id at Airwallex must not create a second transfer.
let replay: string
try {
  await client.createTransfer(prepared.canonicalRequest as never)
  replay = "ACCEPTED_SECOND_CREATE"
} catch (error) {
  replay = error instanceof AirwallexApiError ? `${error.kind}:${error.code ?? error.status}` : "ERROR"
}
steps.push({ step: "replay_same_request_id", outcome: replay })

const reconcile = await rail.reconcileAttempt(prepared.executionId)
const status = reconcile.transfer?.status ?? "NOT_FOUND"
steps.push({
  step: "reconcile_by_request_id",
  found: reconcile.found,
  transferId: reconcile.transfer?.id,
  airwallexStatus: status,
  railguardLabel: mapAirwallexStatus(status).label,
  mismatch: reconcile.mismatch ?? [],
})

const manifest = {
  kind: "airwallex-sandbox-smoke",
  environment: "sandbox",
  baseUrlHost: new URL(baseUrl).hostname,
  generatedAt: new Date().toISOString(),
  intentId,
  requestId: prepared.providerIdempotencyKey,
  amount,
  currency,
  beneficiaryIdHash: createHash("sha256").update(beneficiaryId).digest("hex").slice(0, 16),
  attempt: {
    state: rail.getAttempt(prepared.executionId)?.state,
    createCalls: rail.getAttempt(prepared.executionId)?.createCalls,
  },
  steps,
  note: "Sandbox (fake money). No credentials or tokens are recorded.",
}

const dir = join(import.meta.dir, "..", "evidence", "airwallex-sandbox")
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ ok: reconcile.found, requestId: manifest.requestId, status, replay }, null, 2))
