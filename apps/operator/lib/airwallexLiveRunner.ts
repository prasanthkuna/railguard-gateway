/**
 * Server-only live sandbox runner (Vercel). Holds the Airwallex SANDBOX keys as env vars; the
 * Encore API never sees them. Results are relayed to the API as Ed25519-signed envelopes.
 */
import {
  AIRWALLEX_SANDBOX_BASE_URL,
  type ChaosRunResult,
  type RelayKind,
  assertSandboxBaseUrl,
  createResilientPaymentOpsModel,
  geminiModelChain,
  pickLiveChaosSlot,
  redactChaosRun,
  runChaosTimeout,
  signRelayEnvelope,
  verifyAirwallexWebhook,
} from "../../../packages/kernel/src/adapters/airwallex"

export const PUBLIC_LIVE_RUNS_PER_HOUR = 3
export const OPERATOR_LIVE_RUNS_PER_HOUR = 12

function env(name: string): string {
  return process.env[name]?.trim() ?? ""
}

export function liveConfig() {
  const baseUrl = env("AIRWALLEX_BASE_URL") || AIRWALLEX_SANDBOX_BASE_URL
  const configured = Boolean(
    env("AIRWALLEX_CLIENT_ID") && env("AIRWALLEX_API_KEY") && env("AIRWALLEX_BENEFICIARY_ID"),
  )
  return {
    configured,
    baseUrl,
    baseUrlHost: new URL(baseUrl).hostname,
    gemini: Boolean(env("GEMINI_API_KEY")),
    relay: Boolean(env("RAILGUARD_RELAY_PRIVATE_KEY")),
    webhookSecret: Boolean(env("AIRWALLEX_WEBHOOK_SECRET")),
    operatorToken: Boolean(env("AIRWALLEX_OPERATOR_TOKEN")),
    apiUrl: env("ENCORE_API_URL") || "https://staging-railguard-s4ii.encr.app",
  }
}

function credentials() {
  return { clientId: env("AIRWALLEX_CLIENT_ID"), apiKey: env("AIRWALLEX_API_KEY") }
}

function privateKeyPem(): string {
  const raw = env("RAILGUARD_RELAY_PRIVATE_KEY")
  if (!raw) return ""
  return raw.includes("BEGIN")
    ? raw.replace(/\\n/g, "\n")
    : Buffer.from(raw, "base64").toString("utf8")
}

export function isOperator(token: string | null): boolean {
  const expected = env("AIRWALLEX_OPERATOR_TOKEN")
  if (!expected || !token) return false
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i += 1) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export async function relay(
  kind: RelayKind,
  payload: unknown,
): Promise<{ relayed: boolean; detail: string }> {
  const pem = privateKeyPem()
  if (!pem) return { relayed: false, detail: "relay key not configured" }
  const envelope = signRelayEnvelope(kind, payload, pem)
  try {
    const res = await fetch(`${liveConfig().apiUrl}/v1/airwallex/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(10_000),
    })
    const body = (await res.json().catch(() => ({}))) as { id?: string; reason?: string }
    return {
      relayed: res.ok,
      detail: res.ok ? (body.id ?? "ok") : `HTTP ${res.status} ${body.reason ?? ""}`,
    }
  } catch (error) {
    return { relayed: false, detail: (error as Error).message }
  }
}

export type LiveRunResponse =
  | {
      ok: true
      result: ChaosRunResult
      slot: number
      slotsPerHour: number
      relay: { relayed: boolean; detail: string }
    }
  | { ok: false; status: number; error: string }

export async function runLiveChaos(operatorToken: string | null): Promise<LiveRunResponse> {
  const cfg = liveConfig()
  if (!cfg.configured) {
    return {
      ok: false,
      status: 503,
      error: "Live sandbox runner is not configured on this deployment.",
    }
  }
  assertSandboxBaseUrl(cfg.baseUrl)
  const maxSlots = isOperator(operatorToken)
    ? OPERATOR_LIVE_RUNS_PER_HOUR
    : PUBLIC_LIVE_RUNS_PER_HOUR
  const slot = await pickLiveChaosSlot({
    credentials: credentials(),
    baseUrl: cfg.baseUrl,
    maxSlots,
  })
  if (!slot) {
    return {
      ok: false,
      status: 429,
      error: `All ${maxSlots} live sandbox chaos runs for this hour are used. Simulated mode is unlimited.`,
    }
  }
  const gemini = geminiModelChain(env("GEMINI_API_KEY"), env("AIRWALLEX_AGENT_MODEL") || undefined)
  const raw = await runChaosTimeout({
    mode: "live",
    credentials: credentials(),
    baseUrl: cfg.baseUrl,
    beneficiaryId: env("AIRWALLEX_BENEFICIARY_ID"),
    amount: "1.00",
    invoice: slot.invoice,
    model: createResilientPaymentOpsModel(gemini),
  })
  const result = redactChaosRun(raw, env("AIRWALLEX_BENEFICIARY_ID"))
  const relayed = await relay("live_chaos_run", result)
  return { ok: true, result, slot: slot.slot, slotsPerHour: maxSlots, relay: relayed }
}

export async function handleLiveWebhook(rawBody: string, headers: Headers) {
  const verdict = verifyAirwallexWebhook({
    rawBody,
    timestamp: headers.get("x-timestamp"),
    signature: headers.get("x-signature"),
    secret: env("AIRWALLEX_WEBHOOK_SECRET"),
  })
  if (!verdict.ok) return { status: 401, body: { accepted: false, reason: verdict.reason } }
  const relayed = await relay("webhook_event", { rawBody })
  return { status: 200, body: { accepted: true, relayed: relayed.relayed } }
}
