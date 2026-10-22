/** Pure helpers for the Airwallex ops endpoints (no Encore imports, unit-tested). */
import type {
  ChaosRunResult,
  PayoutAttempt,
  PayoutIncident,
} from "../../packages/kernel/src/adapters/airwallex"

export interface RunSummary {
  id: string
  kind: string
  mode: string
  ok: boolean
  requestId?: string | undefined
  transferId?: string | undefined
  createCalls?: number | undefined
  transfersCreated?: number | undefined
  label?: string | undefined
  source: string
  createdAt: string
}

export interface RunRow {
  id: string
  kind: string
  mode: string
  ok: boolean
  request_id: string | null
  transfer_id: string | null
  create_calls: number | null
  transfers_created: number | null
  label: string | null
  source: string
  doc: string
  created_at: Date | string
}

export function runRowToSummary(row: RunRow): RunSummary {
  return {
    id: row.id,
    kind: row.kind,
    mode: row.mode,
    ok: row.ok,
    requestId: row.request_id ?? undefined,
    transferId: row.transfer_id ?? undefined,
    createCalls: row.create_calls ?? undefined,
    transfersCreated: row.transfers_created ?? undefined,
    label: row.label ?? undefined,
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export function runIdFor(
  result: Pick<ChaosRunResult, "mode" | "requestId" | "finishedAt">,
): string {
  return `run_${result.mode}_${result.requestId.slice(3, 15)}_${Date.parse(result.finishedAt).toString(36)}`
}

/** Strip anything that should not be stored or shown (defence in depth; runs never carry keys). */
export function sanitizeChaosRun(result: ChaosRunResult): ChaosRunResult {
  const text = JSON.stringify(result)
  if (/x-api-key|Bearer\s+[A-Za-z0-9]|api_key"\s*:/i.test(text)) {
    throw new Error(
      "airwallex ops: refusing to store a run that looks like it contains credentials",
    )
  }
  return result
}

export function isChaosRun(value: unknown): value is ChaosRunResult {
  const v = value as Partial<ChaosRunResult> | null
  return Boolean(
    v &&
      v.kind === "airwallex-chaos-run" &&
      (v.mode === "live" || v.mode === "simulated") &&
      typeof v.requestId === "string" &&
      typeof v.createCalls === "number" &&
      Array.isArray(v.transcript),
  )
}

export function attemptRow(attempt: PayoutAttempt, mode: string) {
  return {
    executionId: attempt.executionId,
    requestId: attempt.requestId,
    mode,
    state: attempt.state,
    transferId: attempt.transferId ?? null,
    createCalls: attempt.createCalls,
    doc: JSON.stringify(attempt),
  }
}

export function incidentRow(incident: PayoutIncident, mode: string) {
  return {
    id: `${mode}:${incident.id}:${incident.requestId.slice(3, 11)}`,
    executionId: incident.executionId,
    mode,
    status: incident.status,
    label: incident.label,
    doc: JSON.stringify(incident),
  }
}

/** Simple fixed-window cap on public simulated runs (protects the database, not money). */
export function overHourlyCap(countLastHour: number, cap: number): boolean {
  return countLastHour >= cap
}

export function parseJsonBody<T>(raw: string, maxBytes = 64_000): T | null {
  if (!raw || raw.length > maxBytes) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
