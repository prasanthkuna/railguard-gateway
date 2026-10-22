/** Airwallex payout ExecutionRail: deterministic request_id, UNKNOWN on ambiguity, reconcile by request_id. */
import { createHash } from "node:crypto"
import type { AuthorizationGrant } from "../../authority"
import type {
  ExecutionObservation,
  ExecutionRail,
  ExecutionSubmission,
  PreparedExecution,
  SettlementResult,
} from "../../executionRail"
import type { FinancialIntent } from "../../intent"
import {
  BLOCKING_STATES,
  type PayoutAttempt,
  type PayoutAttemptState,
  type PayoutAttemptStore,
  createInMemoryPayoutAttemptStore,
} from "./attemptStore"
import {
  AirwallexApiError,
  type AirwallexClient,
  type AirwallexTransfer,
  type CreateTransferRequest,
} from "./client"
import { mapAirwallexStatus } from "./status"

export const AIRWALLEX_RAIL_NAME = "airwallex"

export class DuplicatePayoutBlockedError extends Error {
  readonly executionId: string
  readonly state: PayoutAttemptState

  constructor(executionId: string, state: PayoutAttemptState) {
    super(`airwallex: payout ${executionId} is ${state}; second create refused (fail closed)`)
    this.name = "DuplicatePayoutBlockedError"
    this.executionId = executionId
    this.state = state
  }
}

export interface AirwallexRailConfig {
  client?: AirwallexClient | undefined
  store?: PayoutAttemptStore | undefined
  sourceCurrency?: string | undefined
  reason?: string | undefined
  now?: () => Date
}

export interface AirwallexReconcileOutcome {
  found: boolean
  transfer?: AirwallexTransfer | undefined
  mismatch?: string[] | undefined
  attempt: PayoutAttempt
}

export interface AirwallexExecutionRail extends ExecutionRail {
  readonly configured: boolean
  requestIdFor(intentId: string): string
  getAttempt(executionId: string): PayoutAttempt | undefined
  listAttempts(): PayoutAttempt[]
  /** Reconcile against Airwallex by request_id; adopts an existing transfer (no duplicate). */
  reconcileAttempt(executionId: string): Promise<AirwallexReconcileOutcome>
  /** One retry with the SAME request_id, only after reconcile proved no transfer exists. */
  safeRetry(executionId: string): Promise<ExecutionSubmission>
  /** Apply a verified webhook / polled transfer to the ledger. */
  applyTransferUpdate(transfer: AirwallexTransfer): PayoutAttempt | undefined
}

/** Deterministic Airwallex request_id from the Railguard intent id (<= 50 chars). */
export function airwallexRequestId(intentId: string): string {
  const digest = createHash("sha256").update(`railguard:airwallex:${intentId}`).digest("hex")
  return `rg_${digest.slice(0, 40)}`
}

function sameAmount(a: string | number | undefined, b: string): boolean {
  if (a === undefined) return false
  return Number(a).toFixed(2) === Number(b).toFixed(2)
}

function notConfigured(): never {
  throw new Error(
    "airwallex: not configured - set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY (sandbox keys)",
  )
}

export function createAirwallexExecutionRail(
  config: AirwallexRailConfig = {},
): AirwallexExecutionRail {
  const store = config.store ?? createInMemoryPayoutAttemptStore()
  const now = config.now ?? (() => new Date())
  const sourceCurrency = config.sourceCurrency ?? "USD"
  const client = config.client

  const iso = () => now().toISOString()

  function save(attempt: PayoutAttempt, patch: Partial<PayoutAttempt>): PayoutAttempt {
    const next = { ...attempt, ...patch, updatedAt: iso() }
    store.put(next)
    return next
  }

  function requireAttempt(executionId: string): PayoutAttempt {
    const attempt = store.get(executionId)
    if (!attempt) throw new Error(`airwallex: unknown execution ${executionId}`)
    return attempt
  }

  function stateFromTransfer(attempt: PayoutAttempt, transfer: AirwallexTransfer) {
    const mismatch: string[] = []
    if (!sameAmount(transfer.transfer_amount, attempt.expected.amount)) mismatch.push("amount")
    if (
      transfer.transfer_currency &&
      transfer.transfer_currency.toUpperCase() !== attempt.expected.currency
    ) {
      mismatch.push("currency")
    }
    if (transfer.beneficiary_id && transfer.beneficiary_id !== attempt.expected.beneficiaryId) {
      mismatch.push("beneficiary")
    }
    if (mismatch.length > 0) return { state: "DISPUTED" as const, mismatch }
    const mapped = mapAirwallexStatus(transfer.status)
    let state: PayoutAttemptState
    if (mapped.label === "CONFIRMED") state = "CONFIRMED"
    else if (mapped.label === "FAILED")
      state = attempt.state === "CONFIRMED" ? "REVERSED" : "FAILED"
    else if (mapped.label === "PENDING") state = "SUBMITTED"
    else state = "UNKNOWN"
    return { state, mismatch }
  }

  async function sendCreate(attempt: PayoutAttempt): Promise<ExecutionSubmission> {
    if (!client) notConfigured()
    let current = save(attempt, {
      state: "CREATING",
      createCalls: attempt.createCalls + 1,
      lastCreateAt: iso(),
    })
    try {
      const transfer = await client.createTransfer(
        current.canonicalRequest as unknown as CreateTransferRequest,
      )
      const { state } = stateFromTransfer(current, transfer)
      current = save(current, {
        state,
        transferId: transfer.id,
        airwallexStatus: transfer.status,
        lastError: undefined,
      })
      return {
        executionId: current.executionId,
        rail: AIRWALLEX_RAIL_NAME,
        providerOperationId: transfer.id,
        result: "BROADCAST_CONFIRMED",
        responseHash: createHash("sha256").update(JSON.stringify(transfer)).digest("hex"),
      }
    } catch (error) {
      const kind = error instanceof AirwallexApiError ? error.kind : "AMBIGUOUS"
      const message = (error as Error).message
      if (kind === "REJECTED" || kind === "AUTH") {
        save(current, { state: "REJECTED", lastError: message })
        return {
          executionId: current.executionId,
          rail: AIRWALLEX_RAIL_NAME,
          result: "REJECTED_BEFORE_BROADCAST",
        }
      }
      // AMBIGUOUS or DUPLICATE_REQUEST: the transfer may exist. Never re-create; reconcile.
      save(current, { state: "UNKNOWN", lastError: `${kind}: ${message}` })
      return {
        executionId: current.executionId,
        rail: AIRWALLEX_RAIL_NAME,
        result: "BROADCAST_UNKNOWN",
      }
    }
  }

  async function reconcileAttempt(executionId: string): Promise<AirwallexReconcileOutcome> {
    if (!client) notConfigured()
    const attempt = requireAttempt(executionId)
    const transfer = await client.findTransferByRequestId(attempt.requestId)
    if (!transfer) {
      const next = save(attempt, { lastReconcile: { at: iso(), found: false } })
      return { found: false, attempt: next }
    }
    const { state, mismatch } = stateFromTransfer(attempt, transfer)
    const next = save(attempt, {
      state,
      transferId: transfer.id,
      airwallexStatus: transfer.status,
      lastReconcile: { at: iso(), found: true },
    })
    return { found: true, transfer, mismatch, attempt: next }
  }

  return {
    name: AIRWALLEX_RAIL_NAME,
    configured: Boolean(client),
    requestIdFor: airwallexRequestId,
    getAttempt: (executionId) => store.get(executionId),
    listAttempts: () => store.list(),

    async prepare(intent: FinancialIntent, grant: AuthorizationGrant): Promise<PreparedExecution> {
      const beneficiaryId = intent.counterparty.id
      if (!beneficiaryId)
        throw new Error("airwallex: intent.counterparty.id (beneficiary_id) required")
      const currency = intent.value.asset.toUpperCase()
      if (!/^[A-Z]{3}$/.test(currency))
        throw new Error(`airwallex: unsupported currency ${currency}`)
      if (!/^\d+(\.\d{1,2})?$/.test(intent.value.amount)) {
        throw new Error(`airwallex: amount must be a decimal string, got ${intent.value.amount}`)
      }
      if (grant.intentId !== intent.id)
        throw new Error("airwallex: grant does not belong to this intent")
      if (grant.decision !== "allow")
        throw new Error(`airwallex: grant decision is ${grant.decision}`)
      if (grant.limits.asset.toUpperCase() !== currency) {
        throw new Error("airwallex: grant asset does not match intent currency")
      }
      if (Number(intent.value.amount) > Number(grant.limits.reservedAmount)) {
        throw new Error("airwallex: amount exceeds reserved grant amount")
      }
      const requestId = airwallexRequestId(intent.id)
      const executionId = `exec_${intent.id}`
      const canonicalRequest: CreateTransferRequest = {
        request_id: requestId,
        beneficiary_id: beneficiaryId,
        transfer_amount: intent.value.amount,
        transfer_currency: currency,
        source_currency: sourceCurrency,
        transfer_method: "LOCAL",
        reason: config.reason ?? "payment_to_supplier",
        reference: `RG ${intent.id}`.slice(0, 35),
        metadata: { railguard_intent_id: intent.id, railguard_grant_id: grant.grantId },
      }
      if (!store.get(executionId)) {
        store.put({
          executionId,
          intentId: intent.id,
          requestId,
          state: "PREPARED",
          expected: { amount: intent.value.amount, currency, beneficiaryId },
          canonicalRequest: canonicalRequest as unknown as Record<string, unknown>,
          createCalls: 0,
          safeRetries: 0,
          createdAt: iso(),
          updatedAt: iso(),
        })
      }
      return {
        executionId,
        rail: AIRWALLEX_RAIL_NAME,
        providerIdempotencyKey: requestId,
        requestHash: createHash("sha256").update(JSON.stringify(canonicalRequest)).digest("hex"),
        canonicalRequest: canonicalRequest as unknown as Record<string, unknown>,
      }
    },

    async execute(prepared: PreparedExecution): Promise<ExecutionSubmission> {
      if (!client) notConfigured()
      const attempt = requireAttempt(prepared.executionId)
      if (BLOCKING_STATES.includes(attempt.state)) {
        throw new DuplicatePayoutBlockedError(attempt.executionId, attempt.state)
      }
      return sendCreate(attempt)
    },

    async observe(submission: ExecutionSubmission): Promise<ExecutionObservation> {
      if (!client) notConfigured()
      const attempt = requireAttempt(submission.executionId)
      const transfer = attempt.transferId
        ? await client.getTransfer(attempt.transferId)
        : await client.findTransferByRequestId(attempt.requestId)
      if (!transfer) {
        return {
          executionId: attempt.executionId,
          settlementStatus: "UNOBSERVED",
          observedAt: iso(),
        }
      }
      const { state } = stateFromTransfer(attempt, transfer)
      save(attempt, { state, transferId: transfer.id, airwallexStatus: transfer.status })
      return {
        executionId: attempt.executionId,
        settlementStatus:
          state === "DISPUTED" ? "MISMATCH" : mapAirwallexStatus(transfer.status).settlementStatus,
        observedAt: iso(),
      }
    },

    async reconcile(executionId: string): Promise<SettlementResult> {
      const outcome = await reconcileAttempt(executionId)
      const observation: ExecutionObservation = {
        executionId,
        settlementStatus: outcome.transfer
          ? outcome.attempt.state === "DISPUTED"
            ? "MISMATCH"
            : mapAirwallexStatus(outcome.transfer.status).settlementStatus
          : "UNOBSERVED",
        observedAt: iso(),
      }
      const state = outcome.attempt.state
      if (state === "CONFIRMED") {
        return { executionId, status: "RESOLVED", decision: "SETTLED", observations: [observation] }
      }
      if (state === "FAILED" || state === "REVERSED") {
        return {
          executionId,
          status: "RESOLVED",
          decision: "REVERSED",
          observations: [observation],
        }
      }
      if (state === "DISPUTED") {
        return {
          executionId,
          status: "REQUIRED",
          decision: "DISPUTED",
          observations: [observation],
        }
      }
      if (outcome.found) {
        return {
          executionId,
          status: "IN_PROGRESS",
          decision: "UNKNOWN",
          observations: [observation],
        }
      }
      return { executionId, status: "REQUIRED", decision: "UNKNOWN", observations: [] }
    },

    reconcileAttempt,

    async safeRetry(executionId: string): Promise<ExecutionSubmission> {
      const attempt = requireAttempt(executionId)
      if (attempt.state !== "UNKNOWN") {
        throw new DuplicatePayoutBlockedError(executionId, attempt.state)
      }
      if (!attempt.lastReconcile || attempt.lastReconcile.found) {
        throw new Error("airwallex: safe retry requires a reconcile that found no transfer")
      }
      if (attempt.safeRetries >= 1) {
        throw new Error("airwallex: safe retry already used; escalate to a human")
      }
      const next = save(attempt, { safeRetries: attempt.safeRetries + 1 })
      return sendCreate(next)
    },

    applyTransferUpdate(transfer: AirwallexTransfer) {
      const attempt = store.getByRequestId(transfer.request_id)
      if (!attempt) return undefined
      const { state } = stateFromTransfer(attempt, transfer)
      return save(attempt, { state, transferId: transfer.id, airwallexStatus: transfer.status })
    },
  }
}
