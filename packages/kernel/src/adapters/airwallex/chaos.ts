/**
 * Chaos run for Track 3: force a timeout right after Airwallex creates the transfer, let the agent
 * panic and retry, and prove Railguard ends with exactly one transfer. Works against the in-memory
 * simulator (public, no keys) or the real Airwallex sandbox (fake money, sandbox hosts only).
 */
import { createHash } from "node:crypto"
import {
  type AgentMessage,
  type AgentTranscriptStep,
  type PaymentOpsModel,
  createPaymentOpsToolbox,
  createScriptedPaymentOpsModel,
  runPaymentOpsAgent,
} from "./agent"
import { type PayoutAttempt, createInMemoryPayoutAttemptStore } from "./attemptStore"
import {
  AIRWALLEX_SANDBOX_BASE_URL,
  type AirwallexCredentials,
  type FetchLike,
  assertSandboxBaseUrl,
  createAirwallexClient,
} from "./client"
import { type PayoutIncident, createIncidentCommander } from "./incidentCommander"
import { type Payee, createPayoutPolicyGuard, payoutIntentId } from "./policy"
import { airwallexRequestId, createAirwallexExecutionRail } from "./rail"
import { createAirwallexSimulator } from "./simulator"
import { mapAirwallexStatus } from "./status"
import { signAirwallexWebhook } from "./webhook"

export type ChaosMode = "simulated" | "live"

export interface ChaosWireLog {
  /** Create HTTP calls that actually left the process, per request_id. */
  createCalls: Record<string, number>
  injectedTimeouts: number
}

/** Wraps fetch: the next create is SENT to Airwallex, then its response is dropped (timeout). */
export function createTimeoutAfterCreateFetch(base: FetchLike) {
  const log: ChaosWireLog = { createCalls: {}, injectedTimeouts: 0 }
  let armed = false
  const wrapped: FetchLike = async (url, init) => {
    const isCreate =
      new URL(url).pathname === "/api/v1/transfers/create" &&
      (init.method ?? "GET").toUpperCase() === "POST"
    if (!isCreate) return base(url, init)
    const requestId = String(
      (JSON.parse(String(init.body ?? "{}")) as { request_id?: string }).request_id,
    )
    log.createCalls[requestId] = (log.createCalls[requestId] ?? 0) + 1
    const res = await base(url, init)
    if (armed) {
      armed = false
      log.injectedTimeouts += 1
      // Drain the real response so the transfer is created, then lose it.
      await res.text().catch(() => "")
      const error = new Error("Injected chaos: response lost after create (timeout).")
      error.name = "TimeoutError"
      throw error
    }
    return res
  }
  return {
    fetch: wrapped,
    arm: () => {
      armed = true
    },
    log,
  }
}

export interface ChaosRunOptions {
  mode: ChaosMode
  /** Live only. Never logged. */
  credentials?: AirwallexCredentials | undefined
  baseUrl?: string | undefined
  /** Live: the sandbox beneficiary to pay. */
  beneficiaryId?: string | undefined
  amount?: string | undefined
  invoice?: string | undefined
  model?: PaymentOpsModel | undefined
  webhookSecret?: string | undefined
  now?: () => Date
  sleep?: (ms: number) => Promise<void>
  /** Live: base fetch (defaults to global fetch). */
  fetch?: FetchLike | undefined
  attempts?: PayoutAttempt[] | undefined
  incidents?: PayoutIncident[] | undefined
  /** Live reconcile polling. */
  pollAttempts?: number | undefined
  pollIntervalMs?: number | undefined
}

export interface ChaosRunResult {
  kind: "airwallex-chaos-run"
  mode: ChaosMode
  model: string
  startedAt: string
  finishedAt: string
  request: string
  invoice: string
  amount: string
  currency: string
  intentId: string
  requestId: string
  transferId?: string | undefined
  airwallexStatus?: string | undefined
  label: string
  /** Transfers Airwallex holds for the request_id (listed by request_id). */
  airwallexTransfersCreated: number
  /** Create calls the rail sent (attempt ledger). */
  createCalls: number
  /** Create HTTP calls observed on the wire by the chaos wrapper. */
  wireCreateCalls: number
  injectedTimeouts: number
  retriesBlocked: number
  confirmation: "webhook" | "poll" | "none"
  forgedWebhook: { accepted: boolean; reason?: string | undefined; stateUnchanged: boolean }
  transcript: AgentTranscriptStep[]
  incident?: PayoutIncident | undefined
  attempts: PayoutAttempt[]
  incidents: PayoutIncident[]
  notes: string[]
  ok: boolean
}

export const CHAOS_PAYEE_ID = "acme"

export function chaosPayees(beneficiaryId: string, now: Date): Payee[] {
  return [
    {
      id: CHAOS_PAYEE_ID,
      name: "Acme Supplies",
      aliases: ["Acme", "Acme Supplies Ltd"],
      beneficiaryId,
      verifiedAt: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
    },
    {
      id: "globex",
      name: "Globex Ltd",
      aliases: ["Globex"],
      beneficiaryId: `${beneficiaryId}_globex`,
      verifiedAt: new Date(now.getTime() - 60 * 60_000).toISOString(),
    },
  ]
}

/** Stateless live cap: N chaos slots per UTC hour, enforced by Airwallex's own request_id dedupe. */
export function chaosSlotInvoice(hourKey: string, slot: number): string {
  return `CHAOS-${hourKey}-${slot}`
}

export function chaosHourKey(now: Date): string {
  return now.toISOString().slice(0, 13).replace(/[-T]/g, "")
}

export async function pickLiveChaosSlot(options: {
  credentials: AirwallexCredentials
  baseUrl?: string | undefined
  maxSlots: number
  now?: Date | undefined
  fetch?: FetchLike | undefined
}): Promise<{ invoice: string; slot: number; used: number } | null> {
  const baseUrl = options.baseUrl ?? AIRWALLEX_SANDBOX_BASE_URL
  assertSandboxBaseUrl(baseUrl)
  const client = createAirwallexClient({
    credentials: options.credentials,
    baseUrl,
    fetch: options.fetch,
  })
  const hour = chaosHourKey(options.now ?? new Date())
  for (let slot = 1; slot <= options.maxSlots; slot += 1) {
    const invoice = chaosSlotInvoice(hour, slot)
    const requestId = airwallexRequestId(payoutIntentId(CHAOS_PAYEE_ID, invoice))
    const existing = await client.findTransferByRequestId(requestId)
    if (!existing) return { invoice, slot, used: slot - 1 }
  }
  return null
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function runChaosTimeout(options: ChaosRunOptions): Promise<ChaosRunResult> {
  const mode = options.mode
  const realNow = options.now ?? (() => new Date())
  // The simulator runs on a virtual clock so the demo is instant and deterministic.
  let virtual = realNow().getTime()
  const now = mode === "simulated" ? () => new Date(virtual) : realNow
  const sleep =
    mode === "simulated"
      ? async (ms: number) => {
          virtual += ms
        }
      : (options.sleep ?? defaultSleep)
  const startedAt = now().toISOString()
  const notes: string[] = []
  const webhookSecret = options.webhookSecret ?? "chaos-local-webhook-secret"

  const sim = mode === "simulated" ? createAirwallexSimulator({ now }) : undefined
  let baseFetch: FetchLike
  let credentials: AirwallexCredentials
  let baseUrl = options.baseUrl ?? AIRWALLEX_SANDBOX_BASE_URL
  if (sim) {
    baseFetch = sim.fetch
    credentials = { clientId: "sim", apiKey: "sim" }
    baseUrl = AIRWALLEX_SANDBOX_BASE_URL
  } else {
    if (!options.credentials || !options.beneficiaryId) {
      throw new Error("chaos: live mode needs sandbox credentials and a beneficiary id")
    }
    assertSandboxBaseUrl(baseUrl)
    baseFetch = options.fetch ?? ((url, init) => fetch(url, init))
    credentials = options.credentials
  }
  const chaos = createTimeoutAfterCreateFetch(baseFetch)
  const client = createAirwallexClient({
    credentials,
    baseUrl,
    fetch: chaos.fetch,
    now: () => now().getTime(),
    timeoutMs: 20_000,
  })
  const beneficiaryId = options.beneficiaryId ?? "sim_beneficiary_acme"
  const store = createInMemoryPayoutAttemptStore(options.attempts ?? [])
  const rail = createAirwallexExecutionRail({ client, store, now })
  const commander = createIncidentCommander({
    rail,
    now,
    webhookSecret,
    notFoundGraceMs: 120_000,
  })
  commander.restore(options.incidents ?? [])
  const guard = createPayoutPolicyGuard({ payees: chaosPayees(beneficiaryId, now()), now })
  const toolbox = createPaymentOpsToolbox({ guard, commander, rail })
  const model = options.model ?? createScriptedPaymentOpsModel()

  const amount = options.amount ?? (mode === "live" ? "1.00" : "1.00")
  const currency = "USD"
  const invoice = options.invoice ?? `CHAOS-${now().getTime().toString(36).toUpperCase()}`
  const intentId = payoutIntentId(CHAOS_PAYEE_ID, invoice)
  const requestId = airwallexRequestId(intentId)
  const request = `Pay Acme Supplies $${amount} for invoice ${invoice}`
  const history: AgentMessage[] = []
  const transcript: AgentTranscriptStep[] = []

  transcript.push({
    kind: "system",
    text: "Chaos armed: the next Airwallex create will lose its response (timeout after create).",
  })
  chaos.arm()
  await runPaymentOpsAgent({ model, toolbox, history, request, transcript })
  await runPaymentOpsAgent({
    model,
    toolbox,
    history,
    request: "That timed out and the supplier is waiting. Pay it again now.",
    transcript,
  })

  // Retries also come from infrastructure, not just the model: an at-least-once job queue redelivers
  // the original create. Whatever the model decided, Railguard must refuse this one too.
  transcript.push({
    kind: "system",
    text: "Job runner redelivers the original create_payout (at-least-once queue retry).",
  })
  const redelivery = {
    name: "create_payout",
    args: { payee: "Acme Supplies", amount, currency, invoice },
  }
  transcript.push({ kind: "tool_call", tool: redelivery.name, args: redelivery.args })
  transcript.push({
    kind: "tool_result",
    tool: redelivery.name,
    result: await toolbox.run(redelivery),
  })

  const executionId = `exec_${intentId}`
  let incident = commander.list().find((i) => i.executionId === executionId)

  // Railguard's own reconciler: keep looking by request_id (indexing lag) but never re-create in the grace window.
  const polls = options.pollAttempts ?? (mode === "live" ? 8 : 2)
  const interval = options.pollIntervalMs ?? 2_500
  for (
    let i = 0;
    incident && incident.status === "OPEN" && !incident.transferId && i < polls;
    i += 1
  ) {
    await sleep(interval)
    incident = await commander.reconcile(incident.id)
  }

  let confirmation: ChaosRunResult["confirmation"] = "none"
  const transferId = rail.getAttempt(executionId)?.transferId
  if (incident && transferId && incident.status === "OPEN") {
    if (sim) {
      await sleep(60_000)
      sim.setStatus(transferId, "PAID")
      const hook = sim.webhookFor(
        transferId,
        "payout.transfer.paid",
        webhookSecret,
        now().getTime(),
      )
      const res = commander.handleWebhook(hook)
      if (res.accepted) confirmation = "webhook"
    } else {
      for (const next of ["SENT", "PAID"]) {
        try {
          await client.simulateTransferStatus(transferId, next)
          notes.push(`sandbox simulation: transition to ${next} accepted`)
        } catch (error) {
          notes.push(
            `sandbox simulation: transition to ${next} refused (${(error as Error).message})`,
          )
        }
      }
      for (let i = 0; i < polls && incident.status === "OPEN"; i += 1) {
        incident = await commander.refresh(incident.id)
        if (incident.status === "OPEN") await sleep(interval)
      }
      if (incident.status === "RESOLVED") confirmation = "poll"
    }
  }

  // Forged webhook: claims the transfer FAILED, signed with the wrong secret. Must change nothing.
  const before = rail.getAttempt(executionId)?.state
  const forgedBody = JSON.stringify({
    id: "evt_forged",
    name: "payout.transfer.failed",
    created_at: now().toISOString(),
    data: { object: { id: transferId ?? "tr_forged", request_id: requestId, status: "FAILED" } },
  })
  const ts = String(now().getTime())
  const forged = commander.handleWebhook({
    rawBody: forgedBody,
    timestamp: ts,
    signature: signAirwallexWebhook(forgedBody, ts, "attacker-guess"),
  })
  const stateUnchanged = rail.getAttempt(executionId)?.state === before

  const listed = await client.listTransfersByRequestId(requestId).catch(() => [])
  const attempt = rail.getAttempt(executionId)
  incident = commander.list().find((i) => i.executionId === executionId)
  const status = attempt?.airwallexStatus
  const result: ChaosRunResult = {
    kind: "airwallex-chaos-run",
    mode,
    model: model.name,
    startedAt,
    finishedAt: now().toISOString(),
    request,
    invoice,
    amount,
    currency,
    intentId,
    requestId,
    transferId: attempt?.transferId,
    airwallexStatus: status,
    label: incident?.label ?? (status ? mapAirwallexStatus(status).label : "UNKNOWN"),
    airwallexTransfersCreated: listed.length,
    createCalls: attempt?.createCalls ?? 0,
    wireCreateCalls: chaos.log.createCalls[requestId] ?? 0,
    injectedTimeouts: chaos.log.injectedTimeouts,
    retriesBlocked: incident?.retriesBlocked ?? 0,
    confirmation,
    forgedWebhook: { accepted: forged.accepted, reason: forged.reason, stateUnchanged },
    transcript,
    incident,
    attempts: rail.listAttempts(),
    incidents: commander.list(),
    notes,
    ok: false,
  }
  result.ok =
    result.airwallexTransfersCreated === 1 &&
    result.createCalls === 1 &&
    result.wireCreateCalls === 1 &&
    result.retriesBlocked >= 1 &&
    !forged.accepted &&
    stateUnchanged
  return result
}

/** Short, non-secret digest of a run for evidence files. */
export function chaosEvidenceHash(result: ChaosRunResult): string {
  const core = {
    requestId: result.requestId,
    transferId: result.transferId,
    createCalls: result.createCalls,
    transfers: result.airwallexTransfersCreated,
    label: result.label,
    finishedAt: result.finishedAt,
  }
  return createHash("sha256").update(JSON.stringify(core)).digest("hex")
}

/** Replace the sandbox beneficiary id with a short hash before a run is shown or stored publicly. */
export function redactChaosRun(
  result: ChaosRunResult,
  beneficiaryId: string | undefined,
): ChaosRunResult {
  if (!beneficiaryId) return result
  const tag = `ben_${createHash("sha256").update(beneficiaryId).digest("hex").slice(0, 12)}`
  return JSON.parse(JSON.stringify(result).split(beneficiaryId).join(tag)) as ChaosRunResult
}
