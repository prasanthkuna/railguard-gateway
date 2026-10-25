import type { SettlementStatus } from "../../packages/kernel/src/evidence"

/**
 * A database status alone does not prove settlement.
 * Only the verified external-wallet path stores the verified chain reference
 * under context.rail=settlement-verify. Other sources remain UNOBSERVED
 * until they have their own independent provider observation.
 */
export function evidenceSettlementStatus(
  executionStatus: string,
  context: Record<string, unknown>,
): SettlementStatus {
  return executionStatus === "SETTLED" &&
    context.rail === "settlement-verify" &&
    typeof context.txHash === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(context.txHash)
    ? "FINALIZED"
    : "UNOBSERVED"
}
