/** Payout attempt ledger: one row per Railguard execution / Airwallex request_id. */

export type PayoutAttemptState =
  | "PREPARED"
  /** Create call in flight. Never start a second create while this is set. */
  | "CREATING"
  | "SUBMITTED"
  /** Create outcome unknown (timeout / 5xx). Retry is blocked until reconcile. */
  | "UNKNOWN"
  | "CONFIRMED"
  | "FAILED"
  /** Rejected before broadcast (validation / auth) - no money could have moved. */
  | "REJECTED"
  /** PAID then FAILED (bank rejection after payout). */
  | "REVERSED"
  /** Airwallex transfer does not match the authorized intent. */
  | "DISPUTED"

export interface PayoutExpectation {
  amount: string
  currency: string
  beneficiaryId: string
}

export interface PayoutAttempt {
  executionId: string
  intentId: string
  requestId: string
  transferId?: string | undefined
  state: PayoutAttemptState
  airwallexStatus?: string | undefined
  expected: PayoutExpectation
  canonicalRequest: Record<string, unknown>
  /** Number of create calls sent to Airwallex for this request_id. */
  createCalls: number
  /** Number of safe retries (same request_id) after reconcile found nothing. */
  safeRetries: number
  lastCreateAt?: string | undefined
  lastReconcile?: { at: string; found: boolean }
  lastError?: string | undefined
  createdAt: string
  updatedAt: string
}

export interface PayoutAttemptStore {
  get(executionId: string): PayoutAttempt | undefined
  getByRequestId(requestId: string): PayoutAttempt | undefined
  put(attempt: PayoutAttempt): void
  list(): PayoutAttempt[]
}

export function createInMemoryPayoutAttemptStore(): PayoutAttemptStore {
  const byExecution = new Map<string, PayoutAttempt>()
  return {
    get: (executionId) => byExecution.get(executionId),
    getByRequestId: (requestId) => [...byExecution.values()].find((a) => a.requestId === requestId),
    put: (attempt) => {
      byExecution.set(attempt.executionId, { ...attempt })
    },
    list: () => [...byExecution.values()].map((a) => ({ ...a })),
  }
}

/** States in which a new create call for the same execution must be refused (fail closed). */
export const BLOCKING_STATES: readonly PayoutAttemptState[] = [
  "CREATING",
  "SUBMITTED",
  "UNKNOWN",
  "CONFIRMED",
  "DISPUTED",
  "REVERSED",
  "FAILED",
]
