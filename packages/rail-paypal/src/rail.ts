/**
 * PayPal Payouts ExecutionRail.
 *
 *  prepare  -> deterministic PayPal-Request-Id + sender_batch_id from the Railguard intent id,
 *              canonical request built from the APPROVED intent (receiver from the directory).
 *  execute  -> one create. Timeout / 5xx / 409 / 429 => UNKNOWN, budget FROZEN, no second create.
 *  reconcile-> by request id: GET the batch if we know it; otherwise replay the byte-identical create
 *              with the SAME PayPal-Request-Id (PayPal returns the stored result of the first call
 *              instead of paying again), or follow the duplicate sender_batch_id link to the original.
 *  observe  -> item status is authoritative (a SUCCESS batch can hold a FAILED item).
 *
 * Invariants: INV-001 one intent => at most one PayPal payout; INV-005 ambiguity freezes the budget.
 */
import { createHash } from "node:crypto"
import type { AuthorizationGrant } from "@railguard/kernel/authority"
import type {
  ExecutionObservation,
  ExecutionRail,
  ExecutionSubmission,
  PreparedExecution,
  SettlementResult,
} from "@railguard/kernel/executionRail"
import type { FinancialIntent } from "@railguard/kernel/intent"
import type { BudgetLedger } from "./budget"
import {
  type CreatePayoutRequest,
  PayPalApiError,
  type PayPalClient,
  type PayPalPayoutBatch,
  type PayPalPayoutItem,
} from "./client"
import { mapPayPalBatchStatus, mapPayPalItemStatus } from "./status"

export const PAYPAL_RAIL_NAME = "paypal"
/** PayPal stores PayPal-Request-Id and sender_batch_id for 30 days; replay only inside 29. */
export const PAYPAL_REPLAY_WINDOW_MS = 29 * 24 * 3_600_000

export type PayPalAttemptState =
  | "PREPARED"
  | "CREATING"
  | "SUBMITTED"
  | "UNKNOWN"
  | "CONFIRMED"
  | "FAILED"
  | "REJECTED"
  | "REVERSED"
  | "DISPUTED"

export const PAYPAL_BLOCKING_STATES: readonly PayPalAttemptState[] = [
  "CREATING",
  "SUBMITTED",
  "UNKNOWN",
  "CONFIRMED",
  "DISPUTED",
  "REVERSED",
  "FAILED",
]

export interface PayPalAttempt {
  executionId: string
  intentId: string
  paypalRequestId: string
  senderBatchId: string
  requestHash: string
  state: PayPalAttemptState
  payoutBatchId?: string | undefined
  payoutItemId?: string | undefined
  transactionId?: string | undefined
  paypalBatchStatus?: string | undefined
  paypalItemStatus?: string | undefined
  expected: { amount: string; currency: string; receiver: string }
  canonicalRequest: CreatePayoutRequest
  /** Fresh create calls (only ever 0 or 1). */
  createCalls: number
  /** Idempotent replays with the same PayPal-Request-Id during reconcile (cannot pay twice). */
  replays: number
  firstCreateAt?: string | undefined
  lastReconcile?: { at: string; found: boolean; via: string } | undefined
  lastError?: string | undefined
  createdAt: string
  updatedAt: string
}

export class DuplicatePayPalPayoutBlockedError extends Error {
  constructor(
    readonly executionId: string,
    readonly state: PayPalAttemptState,
  ) {
    super(`paypal: payout ${executionId} is ${state}; second create refused (fail closed)`)
    this.name = "DuplicatePayPalPayoutBlockedError"
  }
}

export interface PayPalReconcileOutcome {
  found: boolean
  via: "get_batch" | "request_id_replay" | "duplicate_batch_link" | "none"
  batch?: PayPalPayoutBatch | undefined
  mismatch?: string[] | undefined
  attempt: PayPalAttempt
}

export interface PayPalExecutionRail extends ExecutionRail {
  readonly configured: boolean
  getAttempt(executionId: string): PayPalAttempt | undefined
  findAttempt(ref: string): PayPalAttempt | undefined
  listAttempts(): PayPalAttempt[]
  reconcileAttempt(executionId: string): Promise<PayPalReconcileOutcome>
  /** Re-fetch the batch and apply it (used by observe and by verified webhooks). */
  refresh(executionId: string): Promise<PayPalAttempt>
}

/** UUID-shaped (36 chars, under PayPal's 38-char guidance), deterministic per intent. */
export function paypalRequestIdFor(intentId: string): string {
  const h = createHash("sha256").update(`railguard:paypal:request:${intentId}`).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export function senderBatchIdFor(intentId: string): string {
  return `rg_${createHash("sha256").update(`railguard:paypal:batch:${intentId}`).digest("hex").slice(0, 40)}`
}

function sameMoney(a: string | undefined, b: string): boolean {
  return a !== undefined && Number(a).toFixed(2) === Number(b).toFixed(2)
}

function notConfigured(): never {
  throw new Error(
    "paypal: not configured - set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox app)",
  )
}

export function createPayPalExecutionRail(config: {
  client?: PayPalClient | undefined
  budget?: BudgetLedger | undefined
  now?: () => Date
  emailSubject?: string | undefined
}): PayPalExecutionRail {
  const store = new Map<string, PayPalAttempt>()
  const now = config.now ?? (() => new Date())
  const client = config.client
  const budget = config.budget
  const iso = () => now().toISOString()

  function save(attempt: PayPalAttempt, patch: Partial<PayPalAttempt>): PayPalAttempt {
    const next = { ...attempt, ...patch, updatedAt: iso() }
    store.set(next.executionId, next)
    // Budget follows the money state (INV-005).
    if (budget) {
      if (next.state === "UNKNOWN" || next.state === "DISPUTED")
        budget.freeze(next.intentId, next.state)
      else if (next.state === "CONFIRMED") budget.commit(next.intentId)
      else if (next.state === "REJECTED" || next.state === "FAILED" || next.state === "REVERSED")
        budget.release(next.intentId, next.state)
    }
    return next
  }

  function requireAttempt(executionId: string): PayPalAttempt {
    const attempt = store.get(executionId)
    if (!attempt) throw new Error(`paypal: unknown execution ${executionId}`)
    return attempt
  }

  function ourItem(attempt: PayPalAttempt, batch: PayPalPayoutBatch): PayPalPayoutItem | undefined {
    const items = batch.items ?? []
    const senderItemId = attempt.canonicalRequest.items[0]?.sender_item_id
    return items.find((i) => i.payout_item.sender_item_id === senderItemId) ?? items[0]
  }

  /** Compare what PayPal holds with what was authorized; derive the attempt state. */
  function stateFromBatch(attempt: PayPalAttempt, batch: PayPalPayoutBatch) {
    const mismatch: string[] = []
    if (batch.batch_header.sender_batch_header?.sender_batch_id !== attempt.senderBatchId)
      mismatch.push("sender_batch_id")
    const item = ourItem(attempt, batch)
    if (item) {
      if (!sameMoney(item.payout_item.amount.value, attempt.expected.amount))
        mismatch.push("amount")
      if (item.payout_item.amount.currency.toUpperCase() !== attempt.expected.currency)
        mismatch.push("currency")
      if (item.payout_item.receiver.toLowerCase() !== attempt.expected.receiver.toLowerCase())
        mismatch.push("receiver")
      if ((batch.items ?? []).length > 1) mismatch.push("item_count")
    }
    if (mismatch.length > 0) return { state: "DISPUTED" as const, mismatch, item }
    const mapped = item
      ? mapPayPalItemStatus(item.transaction_status)
      : mapPayPalBatchStatus(batch.batch_header.batch_status)
    let state: PayPalAttemptState
    if (mapped.label === "CONFIRMED") state = "CONFIRMED"
    else if (mapped.label === "FAILED") state = "FAILED"
    else if (mapped.label === "REVERSED") state = "REVERSED"
    else if (mapped.label === "PENDING") state = "SUBMITTED"
    else state = "UNKNOWN"
    return { state, mismatch, item }
  }

  function applyBatch(attempt: PayPalAttempt, batch: PayPalPayoutBatch) {
    const { state, mismatch, item } = stateFromBatch(attempt, batch)
    const next = save(attempt, {
      state,
      payoutBatchId: batch.batch_header.payout_batch_id,
      paypalBatchStatus: batch.batch_header.batch_status,
      payoutItemId: item?.payout_item_id ?? attempt.payoutItemId,
      transactionId: item?.transaction_id ?? attempt.transactionId,
      paypalItemStatus: item?.transaction_status ?? attempt.paypalItemStatus,
      lastError: mismatch.length > 0 ? `mismatch: ${mismatch.join(",")}` : attempt.lastError,
    })
    return { next, mismatch }
  }

  async function withItems(batch: PayPalPayoutBatch): Promise<PayPalPayoutBatch> {
    if (!client || (batch.items && batch.items.length > 0)) return batch
    try {
      return await client.getPayoutBatch(batch.batch_header.payout_batch_id)
    } catch {
      return batch
    }
  }

  async function reconcileAttempt(executionId: string): Promise<PayPalReconcileOutcome> {
    if (!client) notConfigured()
    let attempt = requireAttempt(executionId)
    const mark = (found: boolean, via: PayPalReconcileOutcome["via"]) =>
      save(attempt, { lastReconcile: { at: iso(), found, via } })

    // 1. We know the batch id: read it.
    if (attempt.payoutBatchId) {
      const batch = await client.getPayoutBatch(attempt.payoutBatchId)
      const { next, mismatch } = applyBatch(attempt, batch)
      attempt = next
      return { found: true, via: "get_batch", batch, mismatch, attempt: mark(true, "get_batch") }
    }

    // 2. Unknown create: replay the identical request with the SAME PayPal-Request-Id.
    const first = attempt.firstCreateAt ? Date.parse(attempt.firstCreateAt) : now().getTime()
    if (now().getTime() - first > PAYPAL_REPLAY_WINDOW_MS) {
      attempt = save(attempt, {
        lastError: "replay window passed; a human must check PayPal activity",
      })
      return { found: false, via: "none", attempt: mark(false, "none") }
    }
    const hash = createHash("sha256").update(JSON.stringify(attempt.canonicalRequest)).digest("hex")
    if (hash !== attempt.requestHash)
      throw new Error("paypal: canonical request changed; replay refused")
    attempt = save(attempt, { replays: attempt.replays + 1 })
    try {
      const batch = await withItems(
        await client.createPayout(attempt.canonicalRequest, attempt.paypalRequestId),
      )
      const { next, mismatch } = applyBatch(attempt, batch)
      attempt = next
      return {
        found: true,
        via: "request_id_replay",
        batch,
        mismatch,
        attempt: mark(true, "request_id_replay"),
      }
    } catch (error) {
      if (
        error instanceof PayPalApiError &&
        error.kind === "DUPLICATE_BATCH" &&
        error.originalBatchHref
      ) {
        const batch = await withItems(await client.getByHref(error.originalBatchHref))
        const { next, mismatch } = applyBatch(attempt, batch)
        attempt = next
        return {
          found: true,
          via: "duplicate_batch_link",
          batch,
          mismatch,
          attempt: mark(true, "duplicate_batch_link"),
        }
      }
      if (error instanceof PayPalApiError && (error.kind === "REJECTED" || error.kind === "AUTH")) {
        if (error.kind === "REJECTED")
          attempt = save(attempt, { state: "REJECTED", lastError: error.message })
        return { found: false, via: "request_id_replay", attempt: mark(false, "request_id_replay") }
      }
      // Still ambiguous: stay UNKNOWN, budget stays frozen.
      attempt = save(attempt, { lastError: `reconcile: ${(error as Error).message}` })
      return { found: false, via: "request_id_replay", attempt: mark(false, "request_id_replay") }
    }
  }

  return {
    name: PAYPAL_RAIL_NAME,
    configured: client !== undefined,

    async prepare(intent: FinancialIntent, grant: AuthorizationGrant): Promise<PreparedExecution> {
      if (grant.decision !== "allow" || grant.intentId !== intent.id)
        throw new Error("paypal: grant does not authorize this intent")
      if (
        grant.executionConstraints.rails &&
        !grant.executionConstraints.rails.includes(PAYPAL_RAIL_NAME)
      )
        throw new Error("paypal: grant does not allow the paypal rail")
      const receiver = intent.counterparty.address
      if (!receiver) throw new Error("paypal: intent has no verified receiver")
      if (
        grant.executionConstraints.recipients &&
        !grant.executionConstraints.recipients.includes(receiver)
      )
        throw new Error("paypal: receiver is not in the grant (payee changed after approval)")
      if (grant.limits.asset !== intent.value.asset)
        throw new Error("paypal: grant asset does not match intent currency")
      if (Number(intent.value.amount) > Number(grant.limits.reservedAmount))
        throw new Error("paypal: amount exceeds the reserved grant")
      if (Date.parse(grant.validUntil) < now().getTime()) throw new Error("paypal: grant expired")

      const executionId = `exec_${intent.id}`
      const paypalRequestId = paypalRequestIdFor(intent.id)
      const senderBatchId = senderBatchIdFor(intent.id)
      const canonicalRequest: CreatePayoutRequest = {
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: config.emailSubject ?? "You have a payment",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: { value: Number(intent.value.amount).toFixed(2), currency: intent.value.asset },
            receiver,
            note: String(intent.action.purpose ?? "Payment").slice(0, 120),
            sender_item_id: intent.id.slice(0, 63),
          },
        ],
      }
      const requestHash = createHash("sha256")
        .update(JSON.stringify(canonicalRequest))
        .digest("hex")
      if (!store.get(executionId)) {
        store.set(executionId, {
          executionId,
          intentId: intent.id,
          paypalRequestId,
          senderBatchId,
          requestHash,
          state: "PREPARED",
          expected: {
            amount: Number(intent.value.amount).toFixed(2),
            currency: intent.value.asset,
            receiver,
          },
          canonicalRequest,
          createCalls: 0,
          replays: 0,
          createdAt: iso(),
          updatedAt: iso(),
        })
      }
      return {
        executionId,
        rail: PAYPAL_RAIL_NAME,
        providerIdempotencyKey: paypalRequestId,
        requestHash,
        canonicalRequest: canonicalRequest as unknown as Record<string, unknown>,
      }
    },

    async execute(prepared: PreparedExecution): Promise<ExecutionSubmission> {
      if (!client) notConfigured()
      let attempt = requireAttempt(prepared.executionId)
      if (PAYPAL_BLOCKING_STATES.includes(attempt.state)) {
        throw new DuplicatePayPalPayoutBlockedError(attempt.executionId, attempt.state)
      }
      if (attempt.state === "REJECTED") {
        // A rejected create moved no money; a new attempt is allowed with the same keys.
      }
      attempt = save(attempt, {
        state: "CREATING",
        createCalls: attempt.createCalls + 1,
        firstCreateAt: attempt.firstCreateAt ?? iso(),
      })
      try {
        const batch = await client.createPayout(attempt.canonicalRequest, attempt.paypalRequestId)
        const { next } = applyBatch(attempt, batch)
        return {
          executionId: next.executionId,
          rail: PAYPAL_RAIL_NAME,
          providerOperationId: batch.batch_header.payout_batch_id,
          result: "BROADCAST_CONFIRMED",
          responseHash: createHash("sha256").update(JSON.stringify(batch)).digest("hex"),
        }
      } catch (error) {
        const kind = error instanceof PayPalApiError ? error.kind : "AMBIGUOUS"
        const message = (error as Error).message
        if (kind === "REJECTED" || kind === "AUTH") {
          save(attempt, { state: "REJECTED", lastError: `${kind}: ${message}` })
          return {
            executionId: attempt.executionId,
            rail: PAYPAL_RAIL_NAME,
            result: "REJECTED_BEFORE_BROADCAST",
          }
        }
        // AMBIGUOUS or DUPLICATE_BATCH: the payout may exist. Freeze; reconcile by request id.
        save(attempt, { state: "UNKNOWN", lastError: `${kind}: ${message}` })
        return {
          executionId: attempt.executionId,
          rail: PAYPAL_RAIL_NAME,
          result: "BROADCAST_UNKNOWN",
        }
      }
    },

    async observe(submission: ExecutionSubmission): Promise<ExecutionObservation> {
      if (!client) notConfigured()
      const attempt = requireAttempt(submission.executionId)
      if (!attempt.payoutBatchId) {
        return {
          executionId: attempt.executionId,
          settlementStatus: "UNOBSERVED",
          observedAt: iso(),
        }
      }
      const batch = await client.getPayoutBatch(attempt.payoutBatchId)
      const { next } = applyBatch(attempt, batch)
      return {
        executionId: next.executionId,
        settlementStatus:
          next.state === "DISPUTED"
            ? "MISMATCH"
            : mapPayPalItemStatus(next.paypalItemStatus).settlementStatus,
        observedAt: iso(),
      }
    },

    async reconcile(executionId: string): Promise<SettlementResult> {
      const outcome = await reconcileAttempt(executionId)
      const state = outcome.attempt.state
      const observation: ExecutionObservation = {
        executionId,
        settlementStatus:
          state === "DISPUTED"
            ? "MISMATCH"
            : outcome.found
              ? mapPayPalItemStatus(outcome.attempt.paypalItemStatus).settlementStatus
              : "UNOBSERVED",
        observedAt: iso(),
      }
      if (state === "CONFIRMED")
        return { executionId, status: "RESOLVED", decision: "SETTLED", observations: [observation] }
      if (state === "FAILED" || state === "REVERSED" || state === "REJECTED")
        return {
          executionId,
          status: "RESOLVED",
          decision: "REVERSED",
          observations: [observation],
        }
      if (state === "DISPUTED")
        return {
          executionId,
          status: "REQUIRED",
          decision: "DISPUTED",
          observations: [observation],
        }
      if (outcome.found)
        return {
          executionId,
          status: "IN_PROGRESS",
          decision: "UNKNOWN",
          observations: [observation],
        }
      return { executionId, status: "REQUIRED", decision: "UNKNOWN", observations: [] }
    },

    reconcileAttempt,

    async refresh(executionId: string) {
      if (!client) notConfigured()
      const attempt = requireAttempt(executionId)
      if (!attempt.payoutBatchId) return attempt
      const batch = await client.getPayoutBatch(attempt.payoutBatchId)
      return applyBatch(attempt, batch).next
    },

    getAttempt: (executionId) => store.get(executionId),
    findAttempt: (ref) =>
      store.get(ref) ??
      [...store.values()].find(
        (a) =>
          a.payoutBatchId === ref ||
          a.paypalRequestId === ref ||
          a.intentId === ref ||
          a.senderBatchId === ref,
      ),
    listAttempts: () => [...store.values()].map((a) => ({ ...a })),
  }
}
