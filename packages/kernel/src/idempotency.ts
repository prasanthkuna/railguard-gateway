/** Canonical idempotency helpers — same key must replay; different payload must conflict. */

import { createHash } from "node:crypto"
import type { CreateFinancialIntentInput, FinancialIntent } from "./intent"

export const IDEMPOTENCY_KEY_MIN = 8
export const IDEMPOTENCY_KEY_MAX = 128

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_PAYLOAD_MISMATCH" as const
  constructor(resource: string) {
    super(`${resource} idempotency key is already used for a different request payload`)
    this.name = "IdempotencyConflictError"
  }
}

export function normalizeIdempotencyKey(value: string): string {
  const normalized = value.trim()
  if (normalized.length < IDEMPOTENCY_KEY_MIN || normalized.length > IDEMPOTENCY_KEY_MAX) {
    throw new Error(
      `idempotencyKey must be between ${IDEMPOTENCY_KEY_MIN} and ${IDEMPOTENCY_KEY_MAX} characters`,
    )
  }
  return normalized
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`
}

export function hashCanonicalPayload(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex")
}

/** Hash intent create body (excludes server-assigned id). */
export function hashFinancialIntentInput(input: CreateFinancialIntentInput): string {
  const body: Record<string, unknown> = {
    principal: input.principal,
    action: input.action,
    counterparty: input.counterparty,
    value: input.value,
    constraints: input.constraints,
  }
  if (input.context !== undefined) body.context = input.context
  return hashCanonicalPayload(body)
}

export function hashStoredFinancialIntent(intent: FinancialIntent): string {
  return hashFinancialIntentInput({
    principal: intent.principal,
    action: intent.action,
    counterparty: intent.counterparty,
    value: intent.value,
    constraints: intent.constraints,
    context: intent.context,
    idempotencyKey: intent.idempotencyKey,
  })
}

export function hashPaymentIntentCreateRequest(invoiceId: string): string {
  return hashCanonicalPayload({ invoiceId })
}

export function assertIdempotentReplay(
  resource: string,
  storedHash: string,
  incomingHash: string,
): void {
  if (storedHash !== incomingHash) {
    throw new IdempotencyConflictError(resource)
  }
}
