/** PayPal payout item status -> Railguard lifecycle. Users see CONFIRMED, never "settled". */
import type { ExecutionObservation, V5ExecutionStatus } from "@railguard/kernel/executionRail"

export type PayPalPayoutLabel = "PENDING" | "CONFIRMED" | "FAILED" | "REVERSED" | "UNKNOWN"

export interface PayPalStatusMapping {
  paypalStatus: string
  lifecycle: V5ExecutionStatus
  label: PayPalPayoutLabel
  settlementStatus: ExecutionObservation["settlementStatus"]
  /** True when no further status change is expected. SUCCESS is not final: it can still be reversed. */
  final: boolean
  /** False only when PayPal guarantees no money left the sender (budget can be released). */
  fundsMayHaveMoved: boolean
}

const PENDING = ["PENDING", "PROCESSING", "ONHOLD", "NEW", "UNCLAIMED"]
const NEVER_SENT = ["FAILED", "DENIED", "BLOCKED", "CANCELED"]
const CLAWED_BACK = ["RETURNED", "REFUNDED", "REVERSED"]

/**
 * Item status is authoritative; batch status is only a summary (a SUCCESS batch can hold a FAILED item).
 * UNCLAIMED means money left the sender but the receiver has no account yet: PENDING, budget stays reserved.
 */
export function mapPayPalItemStatus(status: string | undefined): PayPalStatusMapping {
  const s = (status ?? "").toUpperCase()
  const base = { paypalStatus: s }
  if (s === "SUCCESS") {
    return {
      ...base,
      lifecycle: "SETTLED",
      label: "CONFIRMED",
      settlementStatus: "SAFE",
      final: false,
      fundsMayHaveMoved: true,
    }
  }
  if (PENDING.includes(s)) {
    return {
      ...base,
      lifecycle: "SUBMITTED",
      label: "PENDING",
      settlementStatus: "UNOBSERVED",
      final: false,
      fundsMayHaveMoved: true,
    }
  }
  if (NEVER_SENT.includes(s)) {
    return {
      ...base,
      lifecycle: "FAILED_SAFE",
      label: "FAILED",
      settlementStatus: "REVERTED",
      final: true,
      fundsMayHaveMoved: false,
    }
  }
  if (CLAWED_BACK.includes(s)) {
    return {
      ...base,
      lifecycle: "REVERSED",
      label: "REVERSED",
      settlementStatus: "REVERTED",
      final: true,
      fundsMayHaveMoved: false,
    }
  }
  return {
    ...base,
    lifecycle: "UNKNOWN",
    label: "UNKNOWN",
    settlementStatus: "UNOBSERVED",
    final: false,
    fundsMayHaveMoved: true,
  }
}

/** Batch status before items exist (create response). DENIED batch = nothing paid. */
export function mapPayPalBatchStatus(status: string | undefined): PayPalStatusMapping {
  const s = (status ?? "").toUpperCase()
  if (s === "DENIED" || s === "CANCELED") return mapPayPalItemStatus("DENIED")
  if (s === "SUCCESS" || s === "PENDING" || s === "PROCESSING" || s === "NEW")
    return mapPayPalItemStatus("PENDING")
  return mapPayPalItemStatus(undefined)
}
