import type { EvidenceEnvelope, V5ExecutionStatus } from "@railguard/kernel"

/** A signed or hash-chained record is not itself proof of final settlement. */
export function assertFinalizedPayment(
  status: V5ExecutionStatus,
  evidence: EvidenceEnvelope,
): void {
  if (status !== "SETTLED" || evidence.settlement.status !== "FINALIZED") {
    throw new Error("Railguard payment is not verified as finalized")
  }
}
