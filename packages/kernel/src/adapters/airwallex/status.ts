/** Airwallex transfer status → Railguard lifecycle mapping. */
import type { ExecutionObservation, V5ExecutionStatus } from "../../executionRail"

export type RailguardPayoutLabel = "PENDING" | "CONFIRMED" | "FAILED" | "UNKNOWN"

export interface AirwallexStatusMapping {
  airwallexStatus: string
  /** Internal lifecycle value (V5 enum). */
  lifecycle: V5ExecutionStatus
  /** User-facing label. PAID is shown as CONFIRMED (settlement verified by Airwallex). */
  label: RailguardPayoutLabel
  settlementStatus: ExecutionObservation["settlementStatus"]
  /** True when no further status change is expected. PAID is NOT final (it can still fail). */
  final: boolean
  /** False when Airwallex guarantees funds never left (rejected approvals, failed, cancelled). */
  fundsMayHaveMoved: boolean
}

const PENDING = ["IN_APPROVAL", "SCHEDULED", "OVERDUE", "PROCESSING", "CANCELLATION_REQUESTED"]
const NEVER_SENT = ["APPROVAL_RECALLED", "APPROVAL_REJECTED", "APPROVAL_BLOCKED"]

export function mapAirwallexStatus(status: string | undefined): AirwallexStatusMapping {
  const s = (status ?? "").toUpperCase()
  const base = { airwallexStatus: s }
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
  if (s === "SENT") {
    return {
      ...base,
      lifecycle: "SUBMITTED",
      label: "PENDING",
      settlementStatus: "INCLUDED",
      final: false,
      fundsMayHaveMoved: true,
    }
  }
  if (s === "PAID") {
    return {
      ...base,
      lifecycle: "SETTLED",
      label: "CONFIRMED",
      settlementStatus: "SAFE",
      final: false,
      fundsMayHaveMoved: true,
    }
  }
  if (s === "FAILED" || s === "CANCELLED") {
    return {
      ...base,
      lifecycle: "FAILED_SAFE",
      label: "FAILED",
      settlementStatus: "REVERTED",
      final: true,
      fundsMayHaveMoved: false,
    }
  }
  if (NEVER_SENT.includes(s)) {
    return {
      ...base,
      lifecycle: "FAILED_SAFE",
      label: "FAILED",
      settlementStatus: "UNOBSERVED",
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
