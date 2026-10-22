/**
 * Live Airwallex SANDBOX chaos run (fake money): timeout injected right after create, the agent
 * retries, Railguard blocks, reconciles by request_id, and the sandbox transition to PAID is
 * confirmed by polling. Writes non-secret evidence to evidence/airwallex-sandbox/chaos-live.json
 * and, when RAILGUARD_RELAY_PRIVATE_KEY is set, relays the signed run to the staging API.
 *
 *   bun scripts/airwallex-chaos-live.ts            # Gemini agent if GEMINI_API_KEY, else scripted
 *   bun scripts/airwallex-chaos-live.ts --scripted
 *   # Windows, if Bun's fetch stalls on googleapis.com:
 *   bun build scripts/airwallex-chaos-live.ts --target=node --outfile=.tmp/chaos-live.mjs
 *   node --env-file=.env .tmp/chaos-live.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  AIRWALLEX_SANDBOX_BASE_URL,
  assertSandboxBaseUrl,
  chaosEvidenceHash,
  createResilientPaymentOpsModel,
  geminiModelChain,
  redactChaosRun,
  runChaosTimeout,
  signRelayEnvelope,
} from "../packages/kernel/src/adapters/airwallex"

const required = ["AIRWALLEX_CLIENT_ID", "AIRWALLEX_API_KEY", "AIRWALLEX_BENEFICIARY_ID"] as const
const missing = required.filter((n) => !process.env[n])
if (missing.length > 0) {
  console.error(`missing env ${missing.join(", ")} (values are never printed)`)
  process.exit(2)
}
const baseUrl = process.env.AIRWALLEX_BASE_URL ?? AIRWALLEX_SANDBOX_BASE_URL
assertSandboxBaseUrl(baseUrl)
const scripted = process.argv.includes("--scripted")
const model = createResilientPaymentOpsModel(
  scripted ? [] : geminiModelChain(process.env.GEMINI_API_KEY, process.env.AIRWALLEX_AGENT_MODEL),
)
const beneficiaryId = process.env.AIRWALLEX_BENEFICIARY_ID as string

const raw = await runChaosTimeout({
  mode: "live",
  credentials: {
    clientId: process.env.AIRWALLEX_CLIENT_ID as string,
    apiKey: process.env.AIRWALLEX_API_KEY as string,
  },
  baseUrl,
  beneficiaryId,
  amount: process.env.AIRWALLEX_CHAOS_AMOUNT ?? "1.00",
  invoice: `CHAOS-LOCAL-${Date.now().toString(36).toUpperCase()}`,
  model,
})
const result = redactChaosRun(raw, beneficiaryId)

let relay = "skipped (no RAILGUARD_RELAY_PRIVATE_KEY)"
const key = process.env.RAILGUARD_RELAY_PRIVATE_KEY?.trim()
if (key) {
  const pem = Buffer.from(key, "base64").toString("utf8")
  const api = process.env.ENCORE_API_URL ?? "https://staging-railguard-s4ii.encr.app"
  try {
    const res = await fetch(`${api}/v1/airwallex/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signRelayEnvelope("live_chaos_run", result, pem)),
      signal: AbortSignal.timeout(15_000),
    })
    relay = `HTTP ${res.status} ${await res.text()}`.slice(0, 200)
  } catch (error) {
    relay = `failed: ${(error as Error).message}`
  }
}

const evidence = {
  ...result,
  baseUrlHost: new URL(baseUrl).hostname,
  evidenceHash: chaosEvidenceHash(result),
  modelFallbacks: model.fallbacks(),
  relay,
  note: "Airwallex sandbox (fake money). No credentials, tokens or beneficiary ids are recorded.",
}
// process.cwd() (repo root) so the script also runs bundled under Node: on some Windows networks
// Bun's fetch stalls on googleapis.com while Node's works. See docs/grants/AIRWALLEX_BUILD.md.
const dir = join(process.cwd(), "evidence", "airwallex-sandbox")
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, "chaos-live.json"), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      ok: result.ok,
      model: result.model,
      modelFallbacks: model.fallbacks(),
      requestId: result.requestId,
      transferId: result.transferId,
      airwallexStatus: result.airwallexStatus,
      label: result.label,
      airwallexTransfersCreated: result.airwallexTransfersCreated,
      createCalls: result.createCalls,
      wireCreateCalls: result.wireCreateCalls,
      retriesBlocked: result.retriesBlocked,
      confirmation: result.confirmation,
      forgedWebhook: result.forgedWebhook,
      notes: result.notes,
      relay,
    },
    null,
    2,
  ),
)
if (!result.ok) process.exit(1)
