/**
 * v5 x402 descriptor only. Real x402 settlement lives in x402-guard / rail-celo.
 * Never manufacture a transaction hash or finalized settlement for an interface.
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

export function createX402ExecutionRail(): ExecutionRail {
  return {
    name: "x402",

    async prepare(intent: FinancialIntent, grant: AuthorizationGrant): Promise<PreparedExecution> {
      if (grant.decision !== "allow" || grant.intentId !== intent.id) {
        throw new Error("x402: intent has no matching allow grant")
      }
      const resource = intent.context?.resource ?? intent.counterparty.domain
      const canonicalRequest = {
        resource,
        amount: intent.value.amount,
        asset: intent.value.asset,
        grantId: grant.grantId,
      }
      return {
        executionId: `exec_${intent.id}`,
        rail: "x402",
        providerIdempotencyKey: intent.idempotencyKey,
        requestHash: createHash("sha256").update(JSON.stringify(canonicalRequest)).digest("hex"),
        canonicalRequest,
      }
    },

    async execute(_prepared: PreparedExecution): Promise<ExecutionSubmission> {
      throw new Error(
        "x402: v5 reference rail cannot execute payments; use a connected x402-guard/facilitator rail",
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
