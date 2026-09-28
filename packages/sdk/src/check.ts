import type {
  AuthorizationGrant,
  CreateFinancialIntentInput,
  FinancialIntent,
  V5ExecutionStatus,
} from "@railguard/kernel"
import type { RailguardClient } from "./index"

export type CheckDecision = "ALLOW" | "DENY"

export interface CheckResult {
  decision: CheckDecision
  intent: FinancialIntent
  grant: AuthorizationGrant
  status: V5ExecutionStatus
  /** Same as `grant.grantId` when reserved */
  reservationId: string
  /** Policy evidence fingerprint from the grant */
  policyHash: string
}

/** Product primitive: create intent + authorize (no execute). */
export async function check(
  client: RailguardClient,
  input: CreateFinancialIntentInput,
): Promise<CheckResult> {
  const created = await client.createIntent(input)
  const auth = await client.authorize(created.intent.id)
  const allowed = auth.status === "AUTHORIZED" && auth.grant.decision === "allow"
  return {
    decision: allowed ? "ALLOW" : "DENY",
    intent: created.intent,
    grant: auth.grant,
    status: auth.status,
    reservationId: auth.grant.grantId,
    policyHash: auth.grant.evidenceHash,
  }
}
