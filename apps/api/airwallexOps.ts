/**
 * Airwallex Track 3 endpoints: agent, policy demo, chaos runs, signed relay, webhook receiver.
 * Public endpoints are simulator-only. Live sandbox runs happen in the runner that holds the
 * sandbox keys and arrive here only as Ed25519-signed relay envelopes.
 */
import type { IncomingMessage, ServerResponse } from "node:http"
import { api } from "encore.dev/api"
import { secret } from "encore.dev/config"
import {
  type ChaosRunResult,
  RAILGUARD_RELAY_PUBLIC_KEY_PEM,
  type RelayEnvelope,
  createAirwallexClient,
  createAirwallexExecutionRail,
  createAirwallexSimulator,
  createInMemoryPayoutAttemptStore,
  createResilientPaymentOpsModel,
  geminiModelChain,
  parseAirwallexTransferEvent,
  runAgentPolicyDemo,
  runChaosTimeout,
  runSimulatedAgentRequest,
  verifyAirwallexWebhook,
  verifyRelayEnvelope,
} from "../../packages/kernel/src/adapters/airwallex"
import {
  type RunRow,
  attemptRow,
  incidentRow,
  isChaosRun,
  overHourlyCap,
  parseJsonBody,
  runIdFor,
  runRowToSummary,
  sanitizeChaosRun,
} from "./airwallexOpsPure"
import { db } from "./db"

const SIMULATED_RUNS_PER_HOUR = 120
/** Gemini calls from the public console are capped per instance per hour (protects the free tier). */
const GEMINI_AGENT_RUNS_PER_HOUR = 40
const geminiApiKey = secret("GEMINI_API_KEY")
const geminiWindow = { hour: "", count: 0 }

function takeGeminiSlot(): boolean {
  const hour = new Date().toISOString().slice(0, 13)
  if (geminiWindow.hour !== hour) {
    geminiWindow.hour = hour
    geminiWindow.count = 0
  }
  if (geminiWindow.count >= GEMINI_AGENT_RUNS_PER_HOUR) return false
  geminiWindow.count += 1
  return true
}

function agentModel(wantGemini: boolean) {
  let key = ""
  try {
    key = wantGemini ? geminiApiKey() : ""
  } catch {
    key = ""
  }
  const chain =
    key && takeGeminiSlot() ? geminiModelChain(key, process.env.AIRWALLEX_AGENT_MODEL) : []
  return createResilientPaymentOpsModel(chain)
}

async function readBody(req: IncomingMessage, limit = 256_000): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > limit) throw new Error("body too large")
    chunks.push(buf)
  }
  return Buffer.concat(chunks).toString("utf8")
}

function send(resp: ServerResponse, status: number, body: unknown): void {
  resp.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  resp.end(JSON.stringify(body))
}

async function persistRun(result: ChaosRunResult, source: string): Promise<string> {
  const run = sanitizeChaosRun(result)
  const id = runIdFor(run)
  await db.exec`
    INSERT INTO airwallex_runs (id, kind, mode, ok, request_id, transfer_id, create_calls, transfers_created, label, source, doc)
    VALUES (${id}, 'chaos_timeout_after_create', ${run.mode}, ${run.ok}, ${run.requestId}, ${run.transferId ?? null},
            ${run.createCalls}, ${run.airwallexTransfersCreated}, ${run.label}, ${source}, ${JSON.stringify(run)})
    ON CONFLICT (id) DO NOTHING
  `
  for (const attempt of run.attempts) {
    const row = attemptRow(attempt, run.mode)
    await db.exec`
      INSERT INTO airwallex_payout_attempts (execution_id, request_id, mode, state, transfer_id, create_calls, doc, updated_at)
      VALUES (${`${row.mode}:${row.executionId}`}, ${`${row.mode}:${row.requestId}`}, ${row.mode}, ${row.state},
              ${row.transferId}, ${row.createCalls}, ${row.doc}, now())
      ON CONFLICT (execution_id) DO UPDATE SET state = EXCLUDED.state, transfer_id = EXCLUDED.transfer_id,
        create_calls = EXCLUDED.create_calls, doc = EXCLUDED.doc, updated_at = now()
    `
  }
  for (const incident of run.incidents) {
    const row = incidentRow(incident, run.mode)
    await db.exec`
      INSERT INTO airwallex_incidents (id, execution_id, mode, status, label, doc, updated_at)
      VALUES (${row.id}, ${row.executionId}, ${row.mode}, ${row.status}, ${row.label}, ${row.doc}, now())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, label = EXCLUDED.label, doc = EXCLUDED.doc, updated_at = now()
    `
  }
  return id
}

async function recordWebhookEvent(input: {
  source: string
  accepted: boolean
  reason?: string | undefined
  eventId?: string | undefined
  eventName?: string | undefined
  transferId?: string | undefined
  requestId?: string | undefined
  status?: string | undefined
}): Promise<void> {
  await db.exec`
    INSERT INTO airwallex_webhook_events (source, accepted, reason, event_id, event_name, transfer_id, request_id, status)
    VALUES (${input.source}, ${input.accepted}, ${input.reason ?? null}, ${input.eventId ?? null}, ${input.eventName ?? null},
            ${input.transferId ?? null}, ${input.requestId ?? null}, ${input.status ?? null})
  `
}

/** Apply a verified transfer event to the stored live attempt (survives restarts). */
async function applyStoredTransferEvent(rawBody: string): Promise<string | undefined> {
  const event = parseAirwallexTransferEvent(rawBody)
  if (!event) return undefined
  const row = await db.queryRow<{ doc: string }>`
    SELECT doc FROM airwallex_payout_attempts WHERE request_id = ${`live:${event.transfer.request_id}`}
  `
  if (!row) return undefined
  const sim = createAirwallexSimulator()
  const rail = createAirwallexExecutionRail({
    client: createAirwallexClient({
      credentials: { clientId: "x", apiKey: "x" },
      fetch: sim.fetch,
    }),
    store: createInMemoryPayoutAttemptStore([JSON.parse(row.doc)]),
  })
  const updated = rail.applyTransferUpdate(event.transfer)
  if (!updated) return undefined
  await db.exec`
    UPDATE airwallex_payout_attempts
    SET state = ${updated.state}, transfer_id = ${updated.transferId ?? null}, doc = ${JSON.stringify(updated)}, updated_at = now()
    WHERE request_id = ${`live:${event.transfer.request_id}`}
  `
  return updated.state
}

/** Public: agent + policy story (approval, caps, holds). Simulator only. */
export const airwallexAgentDemo = api.raw(
  { expose: true, method: "GET", path: "/v1/airwallex/agent-demo" },
  async (_req, resp) => {
    send(resp, 200, { rail: "airwallex", demo: await runAgentPolicyDemo() })
  },
)

/** Public: one free-form agent request on a fresh simulated stack. */
export const airwallexAgent = api.raw(
  { expose: true, method: "POST", path: "/v1/airwallex/agent" },
  async (req, resp) => {
    const body = parseJsonBody<{ request?: string; approvals?: string[]; model?: string }>(
      await readBody(req),
    )
    if (!body?.request || typeof body.request !== "string") {
      send(resp, 400, { error: "request (string) is required" })
      return
    }
    const approvals = Array.isArray(body.approvals) ? body.approvals.slice(0, 5).map(String) : []
    const model = agentModel(body.model !== "offline")
    const out = await runSimulatedAgentRequest({ request: body.request, approvals, model })
    send(resp, 200, { ...out, model: model.name, fallbacks: model.fallbacks() })
  },
)

/** Public: simulated chaos run (force timeout after create), persisted to Postgres. */
export const airwallexChaos = api.raw(
  { expose: true, method: "POST", path: "/v1/airwallex/chaos" },
  async (_req, resp) => {
    const count = await db.queryRow<{ n: number }>`
      SELECT COUNT(*)::int AS n FROM airwallex_runs WHERE mode = 'simulated' AND created_at > now() - interval '1 hour'
    `
    if (overHourlyCap(count?.n ?? 0, SIMULATED_RUNS_PER_HOUR)) {
      send(resp, 429, { error: "simulated chaos runs are capped per hour; try again later" })
      return
    }
    const result = await runChaosTimeout({ mode: "simulated" })
    const id = await persistRun(result, "api-simulator")
    send(resp, 200, { id, persisted: true, result })
  },
)

/** Public: recent runs (simulated and relayed live sandbox runs), newest first. */
export const airwallexRuns = api.raw(
  { expose: true, method: "GET", path: "/v1/airwallex/runs" },
  async (req, resp) => {
    const mode = new URL(req.url ?? "/", "http://x").searchParams.get("mode")
    const rows: RunRow[] = []
    const q = mode
      ? db.query<RunRow>`SELECT * FROM airwallex_runs WHERE mode = ${mode} ORDER BY created_at DESC LIMIT 20`
      : db.query<RunRow>`SELECT * FROM airwallex_runs ORDER BY created_at DESC LIMIT 20`
    for await (const row of q) rows.push(row)
    const latestLive = rows.find((r) => r.mode === "live")
    send(resp, 200, {
      runs: rows.map(runRowToSummary),
      latestLive: latestLive ? JSON.parse(latestLive.doc) : null,
      relayConfigured: Boolean(RAILGUARD_RELAY_PUBLIC_KEY_PEM.trim()),
    })
  },
)

/** Public: one stored run, full document. */
export const airwallexRun = api.raw(
  { expose: true, method: "GET", path: "/v1/airwallex/runs/:id" },
  async (req, resp) => {
    const id = decodeURIComponent((req.url ?? "").split("?")[0]?.split("/").pop() ?? "")
    const row = await db.queryRow<RunRow>`SELECT * FROM airwallex_runs WHERE id = ${id}`
    if (!row) {
      send(resp, 404, { error: "run not found" })
      return
    }
    send(resp, 200, { summary: runRowToSummary(row), run: JSON.parse(row.doc) })
  },
)

/** Signed relay from the live sandbox runner (Ed25519, committed public key). */
export const airwallexRelay = api.raw(
  { expose: true, method: "POST", path: "/v1/airwallex/relay" },
  async (req, resp) => {
    const envelope = parseJsonBody<RelayEnvelope>(await readBody(req, 1_000_000), 1_000_000)
    const verdict = verifyRelayEnvelope(envelope, RAILGUARD_RELAY_PUBLIC_KEY_PEM)
    if (!verdict.ok || !envelope) {
      send(resp, 401, { accepted: false, reason: verdict.ok ? "bad_shape" : verdict.reason })
      return
    }
    if (
      envelope.kind === "live_chaos_run" &&
      isChaosRun(verdict.payload) &&
      verdict.payload.mode === "live"
    ) {
      const id = await persistRun(verdict.payload, "relay:live-runner")
      send(resp, 200, { accepted: true, id })
      return
    }
    if (envelope.kind === "webhook_event") {
      const p = verdict.payload as { rawBody?: string }
      const event = p.rawBody ? parseAirwallexTransferEvent(p.rawBody) : null
      const state = p.rawBody ? await applyStoredTransferEvent(p.rawBody) : undefined
      await recordWebhookEvent({
        source: "relay:live-runner",
        accepted: true,
        reason: state ? `applied:${state}` : "verified_by_runner",
        eventId: event?.eventId,
        eventName: event?.name,
        transferId: event?.transfer.id,
        requestId: event?.transfer.request_id,
        status: event?.transfer.status,
      })
      send(resp, 200, { accepted: true, state })
      return
    }
    send(resp, 400, { accepted: false, reason: "unsupported_kind" })
  },
)

/**
 * Airwallex webhook receiver. Raw body, HMAC-SHA256(x-timestamp + body) verified before parsing.
 * Fails closed when AIRWALLEX_WEBHOOK_SECRET is not configured on this environment.
 */
export const airwallexWebhook = api.raw(
  { expose: true, method: "POST", path: "/v1/airwallex/webhook" },
  async (req, resp) => {
    let rawBody = ""
    try {
      rawBody = await readBody(req)
    } catch {
      send(resp, 413, { accepted: false, reason: "body_too_large" })
      return
    }
    const verdict = verifyAirwallexWebhook({
      rawBody,
      timestamp: req.headers["x-timestamp"]?.toString(),
      signature: req.headers["x-signature"]?.toString(),
      secret: process.env.AIRWALLEX_WEBHOOK_SECRET ?? "",
    })
    if (!verdict.ok) {
      await recordWebhookEvent({ source: "airwallex", accepted: false, reason: verdict.reason })
      send(resp, 401, { accepted: false, reason: verdict.reason })
      return
    }
    const event = parseAirwallexTransferEvent(rawBody)
    const state = await applyStoredTransferEvent(rawBody)
    await recordWebhookEvent({
      source: "airwallex",
      accepted: true,
      reason: state ? `applied:${state}` : event ? "no_matching_attempt" : "ignored_event",
      eventId: event?.eventId,
      eventName: event?.name,
      transferId: event?.transfer.id,
      requestId: event?.transfer.request_id,
      status: event?.transfer.status,
    })
    send(resp, 200, { accepted: true, state })
  },
)

/** Public: recent webhook deliveries (accepted and rejected), newest first. No payloads stored. */
export const airwallexWebhookEvents = api.raw(
  { expose: true, method: "GET", path: "/v1/airwallex/webhook-events" },
  async (_req, resp) => {
    const events: unknown[] = []
    for await (const row of db.query`
      SELECT id, received_at, source, accepted, reason, event_name, transfer_id, request_id, status
      FROM airwallex_webhook_events ORDER BY received_at DESC LIMIT 25
    `) {
      events.push(row)
    }
    send(resp, 200, { events })
  },
)

/** Public: persisted incidents (latest 20), proving state survives restarts. */
export const airwallexStoredIncidents = api.raw(
  { expose: true, method: "GET", path: "/v1/airwallex/incidents" },
  async (_req, resp) => {
    const incidents: unknown[] = []
    for await (const row of db.query<{ doc: string; mode: string; updated_at: Date }>`
      SELECT doc, mode, updated_at FROM airwallex_incidents ORDER BY updated_at DESC LIMIT 20
    `) {
      incidents.push({ mode: row.mode, updatedAt: row.updated_at, incident: JSON.parse(row.doc) })
    }
    send(resp, 200, { incidents })
  },
)
