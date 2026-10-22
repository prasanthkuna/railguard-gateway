/**
 * Payment Ops Incident Commander for Airwallex payouts.
 * Detects UNKNOWN / stuck payouts, blocks duplicate payouts, reconciles by request_id,
 * and records an incident timeline + runbook with a hash-chained evidence trail.
 */
import { createHash } from "node:crypto"
import type { AuthorizationGrant } from "../../authority"
import type { FinancialIntent } from "../../intent"
import type { PayoutAttempt } from "./attemptStore"
import { type AirwallexExecutionRail, DuplicatePayoutBlockedError } from "./rail"
import { mapAirwallexStatus } from "./status"
import { parseAirwallexTransferEvent, verifyAirwallexWebhook } from "./webhook"

export type IncidentKind = "UNKNOWN_AFTER_SUBMIT" | "STUCK_PENDING" | "AMOUNT_MISMATCH"
export type IncidentStatus = "OPEN" | "RESOLVED" | "ESCALATED"
export type IncidentOutcome =
  | "CONFIRMED"
  | "FAILED_NO_FUNDS_MOVED"
  | "REVERSED_AFTER_PAID"
  | "DISPUTED"

export interface IncidentTimelineEntry {
  at: string
  step: string
  detail: string
  attemptState?: string | undefined
  airwallexStatus?: string | undefined
  hash: string
}

export interface PayoutIncident {
  id: string
  kind: IncidentKind
  status: IncidentStatus
  executionId: string
  intentId: string
  requestId: string
  transferId?: string | undefined
  openedAt: string
  resolvedAt?: string | undefined
  outcome?: IncidentOutcome | undefined
  label: "UNKNOWN" | "PENDING" | "CONFIRMED" | "FAILED" | "DISPUTED"
  /** Create calls sent to Airwallex for this request_id (proof of no duplicate payout). */
  createCalls: number
  retriesBlocked: number
  timeline: IncidentTimelineEntry[]
  runbook: string[]
  evidenceHead: string
}

export interface IncidentCommanderOptions {
  rail: AirwallexExecutionRail
  now?: () => Date
  /** Pending transfers older than this are treated as stuck. Default 15 min. */
  stuckAfterMs?: number | undefined
  /** Wait this long after a create before trusting "not found" (Airwallex indexing lag). */
  notFoundGraceMs?: number | undefined
  webhookSecret?: string | undefined
}

export interface PayResult {
  executionId: string
  outcome: "SUBMITTED" | "UNKNOWN" | "REJECTED" | "BLOCKED_DUPLICATE"
  incident?: PayoutIncident | undefined
}

const RUNBOOK: Record<IncidentKind, string[]> = {
  UNKNOWN_AFTER_SUBMIT: [
    "Freeze the grant: no second payout for this intent while the first is UNKNOWN.",
    "Look up the transfer by request_id (GET /api/v1/transfers?request_id=...).",
    "Found: adopt that transfer and follow its status (no new transfer).",
    "Not found after the grace window: retry once with the SAME request_id (Airwallex dedupes for 7 days).",
    "Still unresolved: escalate to a human with this timeline.",
  ],
  STUCK_PENDING: [
    "Check the transfer status in Airwallex and any open RFI (request for information).",
    "Keep the grant frozen; do not create a replacement transfer.",
    "Wait for payout.transfer.* webhooks; PAID is not final until no FAILED arrives.",
    "Cancel only via POST /api/v1/transfers/{id}/cancel before SENT, then pay with a new intent.",
  ],
  AMOUNT_MISMATCH: [
    "Stop: the Airwallex transfer does not match the authorized intent.",
    "Do not retry. Escalate to finance with the expected vs actual fields.",
  ],
}

export function createIncidentCommander(options: IncidentCommanderOptions) {
  const rail = options.rail
  const now = options.now ?? (() => new Date())
  const stuckAfterMs = options.stuckAfterMs ?? 15 * 60_000
  const notFoundGraceMs = options.notFoundGraceMs ?? 2 * 60_000
  const incidents = new Map<string, PayoutIncident>()
  let counter = 0

  const iso = () => now().toISOString()

  function openIncidentFor(executionId: string): PayoutIncident | undefined {
    return [...incidents.values()].find((i) => i.executionId === executionId && i.status === "OPEN")
  }

  function labelFor(attempt: PayoutAttempt): PayoutIncident["label"] {
    switch (attempt.state) {
      case "CONFIRMED":
        return "CONFIRMED"
      case "FAILED":
      case "REVERSED":
      case "REJECTED":
        return "FAILED"
      case "DISPUTED":
        return "DISPUTED"
      case "SUBMITTED":
        return "PENDING"
      default:
        return "UNKNOWN"
    }
  }

  function record(incident: PayoutIncident, step: string, detail: string): void {
    const attempt = rail.getAttempt(incident.executionId)
    const base = {
      at: iso(),
      step,
      detail,
      attemptState: attempt?.state,
      airwallexStatus: attempt?.airwallexStatus,
    }
    const hash = createHash("sha256")
      .update(`${incident.evidenceHead}|${JSON.stringify(base)}`)
      .digest("hex")
    incident.timeline.push({ ...base, hash })
    incident.evidenceHead = hash
    if (attempt) {
      incident.createCalls = attempt.createCalls
      incident.transferId = attempt.transferId
      incident.label = labelFor(attempt)
    }
  }

  function open(attempt: PayoutAttempt, kind: IncidentKind, detail: string): PayoutIncident {
    const existing = openIncidentFor(attempt.executionId)
    if (existing) return existing
    counter += 1
    const incident: PayoutIncident = {
      id: `inc_${attempt.requestId.slice(3, 11)}_${counter}`,
      kind,
      status: "OPEN",
      executionId: attempt.executionId,
      intentId: attempt.intentId,
      requestId: attempt.requestId,
      openedAt: iso(),
      label: labelFor(attempt),
      createCalls: attempt.createCalls,
      retriesBlocked: 0,
      timeline: [],
      runbook: RUNBOOK[kind],
      evidenceHead: createHash("sha256").update(`incident:${attempt.requestId}`).digest("hex"),
    }
    incidents.set(incident.id, incident)
    record(incident, "INCIDENT_OPENED", detail)
    return incident
  }

  function resolveIfFinal(incident: PayoutIncident): void {
    const attempt = rail.getAttempt(incident.executionId)
    if (!attempt) return
    let outcome: IncidentOutcome | undefined
    if (attempt.state === "CONFIRMED") outcome = "CONFIRMED"
    else if (attempt.state === "FAILED") outcome = "FAILED_NO_FUNDS_MOVED"
    else if (attempt.state === "REVERSED") outcome = "REVERSED_AFTER_PAID"
    else if (attempt.state === "DISPUTED") outcome = "DISPUTED"
    if (!outcome) return
    incident.outcome = outcome
    incident.status = outcome === "DISPUTED" ? "ESCALATED" : "RESOLVED"
    incident.resolvedAt = iso()
    record(
      incident,
      outcome === "DISPUTED" ? "ESCALATED" : "RESOLVED",
      outcome === "CONFIRMED"
        ? `Single transfer CONFIRMED (Airwallex PAID). Create calls for this request_id: ${attempt.createCalls}. Keep watching for payout.transfer.failed.`
        : `Outcome ${outcome}.`,
    )
  }

  async function pay(intent: FinancialIntent, grant: AuthorizationGrant): Promise<PayResult> {
    const prepared = await rail.prepare(intent, grant)
    try {
      const submission = await rail.execute(prepared)
      const attempt = rail.getAttempt(prepared.executionId)
      if (submission.result === "BROADCAST_UNKNOWN" && attempt) {
        const incident = open(
          attempt,
          "UNKNOWN_AFTER_SUBMIT",
          `Create transfer outcome unknown (${attempt.lastError ?? "no response"}). Payout marked UNKNOWN; retries blocked.`,
        )
        return { executionId: prepared.executionId, outcome: "UNKNOWN", incident }
      }
      if (submission.result === "REJECTED_BEFORE_BROADCAST") {
        return { executionId: prepared.executionId, outcome: "REJECTED" }
      }
      return { executionId: prepared.executionId, outcome: "SUBMITTED" }
    } catch (error) {
      if (!(error instanceof DuplicatePayoutBlockedError)) throw error
      const attempt = rail.getAttempt(prepared.executionId)
      if (!attempt) throw error
      const incident =
        openIncidentFor(attempt.executionId) ??
        open(attempt, "UNKNOWN_AFTER_SUBMIT", "Duplicate payout attempt on an in-flight transfer.")
      incident.retriesBlocked += 1
      record(
        incident,
        "RETRY_BLOCKED",
        `Second payout for intent ${intent.id} refused: first attempt is ${error.state}. No new Airwallex transfer created.`,
      )
      return { executionId: prepared.executionId, outcome: "BLOCKED_DUPLICATE", incident }
    }
  }

  /** Opens incidents for UNKNOWN attempts and pending transfers older than stuckAfterMs. */
  function scan(): PayoutIncident[] {
    const opened: PayoutIncident[] = []
    const nowMs = now().getTime()
    for (const attempt of rail.listAttempts()) {
      if (openIncidentFor(attempt.executionId)) continue
      if (attempt.state === "UNKNOWN") {
        opened.push(open(attempt, "UNKNOWN_AFTER_SUBMIT", "Scan found an UNKNOWN payout."))
      } else if (
        attempt.state === "SUBMITTED" &&
        nowMs - Date.parse(attempt.lastCreateAt ?? attempt.updatedAt) > stuckAfterMs
      ) {
        opened.push(
          open(
            attempt,
            "STUCK_PENDING",
            `Transfer still ${attempt.airwallexStatus ?? "pending"} after ${Math.round(stuckAfterMs / 60_000)} min.`,
          ),
        )
      }
    }
    return opened
  }

  /** Reconcile by request_id; adopt a found transfer, or do one safe retry with the same request_id. */
  async function reconcile(incidentId: string): Promise<PayoutIncident> {
    const incident = incidents.get(incidentId)
    if (!incident) throw new Error(`unknown incident ${incidentId}`)
    if (incident.status !== "OPEN") return incident
    const outcome = await rail.reconcileAttempt(incident.executionId)
    if (outcome.found && outcome.transfer) {
      if (outcome.mismatch && outcome.mismatch.length > 0) {
        incident.kind = "AMOUNT_MISMATCH"
        incident.runbook = RUNBOOK.AMOUNT_MISMATCH
      }
      record(
        incident,
        "RECONCILE_FOUND",
        `Found transfer ${outcome.transfer.id} for request_id (status ${outcome.transfer.status} = ${mapAirwallexStatus(outcome.transfer.status).label}). Adopted; no new transfer.`,
      )
      resolveIfFinal(incident)
      return incident
    }
    const attempt = outcome.attempt
    const sinceCreate = now().getTime() - Date.parse(attempt.lastCreateAt ?? attempt.createdAt)
    if (sinceCreate < notFoundGraceMs) {
      record(
        incident,
        "RECONCILE_NOT_FOUND_WAIT",
        `No transfer for request_id yet; waiting ${Math.round(notFoundGraceMs / 1000)}s grace before any retry.`,
      )
      return incident
    }
    if (attempt.safeRetries >= 1) {
      incident.status = "ESCALATED"
      record(incident, "ESCALATED", "Still not found after one safe retry. Human review required.")
      return incident
    }
    record(
      incident,
      "RECONCILE_NOT_FOUND",
      "No transfer exists for request_id after the grace window. One retry with the same request_id is safe.",
    )
    const submission = await rail.safeRetry(incident.executionId)
    record(
      incident,
      "SAFE_RETRY_SAME_REQUEST_ID",
      `Retried once with request_id ${incident.requestId}: ${submission.result}.`,
    )
    resolveIfFinal(incident)
    return incident
  }

  /** Verify signature first, then apply payout.transfer.* events. */
  function handleWebhook(input: {
    rawBody: string
    timestamp?: string | null | undefined
    signature?: string | null | undefined
    nowMs?: number | undefined
  }): { accepted: boolean; reason?: string | undefined; incident?: PayoutIncident | undefined } {
    const verdict = verifyAirwallexWebhook({
      rawBody: input.rawBody,
      timestamp: input.timestamp,
      signature: input.signature,
      secret: options.webhookSecret ?? "",
      nowMs: input.nowMs ?? now().getTime(),
    })
    if (!verdict.ok) return { accepted: false, reason: verdict.reason }
    const event = parseAirwallexTransferEvent(input.rawBody)
    if (!event) return { accepted: true, reason: "ignored_event" }
    const attempt = rail.applyTransferUpdate(event.transfer)
    if (!attempt) return { accepted: true, reason: "unknown_request_id" }
    const incident = openIncidentFor(attempt.executionId)
    if (incident) {
      record(
        incident,
        "WEBHOOK",
        `${event.name} for transfer ${event.transfer.id} (signature verified).`,
      )
      resolveIfFinal(incident)
    }
    return { accepted: true, incident }
  }

  /** Poll the transfer status (fallback when no webhook arrives) and resolve if it is final. */
  async function refresh(incidentId: string): Promise<PayoutIncident> {
    const incident = incidents.get(incidentId)
    if (!incident) throw new Error(`unknown incident ${incidentId}`)
    if (incident.status !== "OPEN") return incident
    const attempt = rail.getAttempt(incident.executionId)
    if (!attempt?.transferId) return incident
    const before = attempt.airwallexStatus
    const observation = await rail.observe({
      executionId: incident.executionId,
      rail: rail.name,
      providerOperationId: attempt.transferId,
      result: "BROADCAST_CONFIRMED",
    })
    const after = rail.getAttempt(incident.executionId)?.airwallexStatus
    if (after !== before) {
      record(
        incident,
        "POLL",
        `Polled transfer ${attempt.transferId}: ${before ?? "?"} -> ${after ?? "?"} (${observation.settlementStatus}).`,
      )
    }
    resolveIfFinal(incident)
    return incident
  }

  /** Rehydrate incidents loaded from storage (Postgres) so state survives restarts. */
  function restore(saved: PayoutIncident[]): void {
    for (const incident of saved) {
      incidents.set(incident.id, structuredClone(incident))
      const n = Number(incident.id.split("_").pop())
      if (Number.isFinite(n) && n > counter) counter = n
    }
  }

  return {
    pay,
    scan,
    reconcile,
    refresh,
    restore,
    handleWebhook,
    list: () => [...incidents.values()],
    get: (id: string) => incidents.get(id),
  }
}

export type IncidentCommander = ReturnType<typeof createIncidentCommander>
