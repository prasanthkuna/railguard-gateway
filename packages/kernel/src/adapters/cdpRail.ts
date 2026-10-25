/**
 * v5 CDP descriptor. Deliberately fail-closed until wired to the existing
 * authenticated CDP driver in apps/api. This is NOT an execution adapter.
 */
import { createHash } from "node:crypto"
import type { AuthorizationGrant } from "../authority"
import type {
  ExecutionObservation,
  ExecutionRail,
  ExecutionSubmission,
  PreparedExecution,
  SettlementResult,
} from "../executionRail"
import type { FinancialIntent } from "../intent"

export interface CdpRailConfig {
  organizationId: string
  payerAddress: string
}

export function createCdpExecutionRail(config: CdpRailConfig): ExecutionRail {
  return {
    name: "cdp",

    async prepare(intent: FinancialIntent, grant: AuthorizationGrant): Promise<PreparedExecution> {
      if (grant.decision !== "allow" || grant.intentId !== intent.id) {
        throw new Error("cdp: intent has no matching allow grant")
      }
      if (intent.principal.organizationId !== config.organizationId) {
        throw new Error("cdp: intent organization does not match configured payer")
      }
      const canonicalRequest = {
        to: intent.counterparty.address,
        amount: intent.value.amount,
        asset: intent.value.asset,
        network: intent.constraints.network,
        grantId: grant.grantId,
        payerAddress: config.payerAddress,
      }
      return {
        executionId: `exec_${intent.id}`,
        rail: "cdp",
        providerIdempotencyKey: intent.idempotencyKey,
        requestHash: createHash("sha256").update(JSON.stringify(canonicalRequest)).digest("hex"),
        canonicalRequest,
      }
    },

    async execute(_prepared: PreparedExecution): Promise<ExecutionSubmission> {
      throw new Error(
        "cdp: v5 reference rail cannot execute payments; use the authenticated CDP API driver",
      )
    },

    async observe(submission: ExecutionSubmission): Promise<ExecutionObservation> {
      return {
        executionId: submission.executionId,
        settlementStatus: "UNOBSERVED",
        observedAt: new Date().toISOString(),
      }
    },

    async reconcile(executionId: string): Promise<SettlementResult> {
      return {
        executionId,
        status: "REQUIRED",
        decision: "UNKNOWN",
        observations: [],
      }
    },
  }
}
