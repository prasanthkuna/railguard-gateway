import { randomUUID } from "node:crypto"
import { APIError } from "encore.dev/api"
import { getAuthData } from "encore.dev/internal/codegen/auth"
import { type AppRole, type AuthenticatedActor, hasRequiredRole } from "../../packages/auth/src"
import type { AuthorizationGrant } from "../../packages/kernel/src/authority"
import {
  type EvidenceEnvelope,
  buildEvidenceEnvelope,
  explainCharge,
  hashEvidencePart,
} from "../../packages/kernel/src/evidence"
import {
  type V5ExecutionStatus,
  mapLegacyPaymentStatus,
} from "../../packages/kernel/src/executionRail"
import {
  assertIdempotentReplay,
  hashFinancialIntentInput,
  hashStoredFinancialIntent,
  normalizeIdempotencyKey,
} from "../../packages/kernel/src/idempotency"
import {
  type CreateFinancialIntentInput,
  type FinancialIntent,
  createFinancialIntent,
} from "../../packages/kernel/src/intent"
import { authorizeIntent } from "../../packages/kernel/src/v5Actions"
import { db } from "./db"
import { buildExecutionCorrelation, buildGuardInput } from "./paymentCorrelation"
import { resolveCdpPayerAddress } from "./providers"
import { evaluatePaymentGuard, isX402GuardEnabled, organizationAgentId } from "./x402Guard"

interface FinancialIntentRow {
  id: string
  organization_id: string
  payload_json: FinancialIntent
  status: V5ExecutionStatus
  idempotency_key: string
  payment_intent_id: string | null
  authorization_grant_json: AuthorizationGrant | null
  execution_id: string | null
  evidence_json: EvidenceEnvelope | null
  created_at: Date
  updated_at: Date
}

function v5Id(prefix: string): string {
  return `${prefix}_${randomUUID()}`
}

function ensureIdempotencyKey(value: string): string {
  try {
    return normalizeIdempotencyKey(value)
  } catch {
    throw APIError.invalidArgument("idempotencyKey must be between 8 and 128 characters")
  }
}

export async function requireV5Actor(
  allowedRoles?: readonly AppRole[],
): Promise<AuthenticatedActor> {
  const actor = getAuthData() as AuthenticatedActor | null
  if (!actor) throw APIError.unauthenticated("authentication required")
  if (!hasRequiredRole(actor, allowedRoles)) {
    throw APIError.permissionDenied("insufficient role")
  }
  return actor
}

export function parseIntentPayload(payload: FinancialIntent | string): FinancialIntent {
  if (typeof payload === "string") {
    return JSON.parse(payload) as FinancialIntent
  }
  return payload
}

export function parseEvidencePayload(
  payload: EvidenceEnvelope | string | null | undefined,
): EvidenceEnvelope | undefined {
  if (payload == null) return undefined
  let value: unknown = payload
  if (typeof value === "string") {
    value = JSON.parse(value) as unknown
    if (typeof value === "string") value = JSON.parse(value) as unknown
  }
  const envelope = value as EvidenceEnvelope
  if (!envelope?.settlement?.status) return undefined
  return envelope
}

function mapRow(row: FinancialIntentRow) {
  return {
    intent: parseIntentPayload(row.payload_json as FinancialIntent | string),
    status: row.status,
    paymentIntentId: row.payment_intent_id ?? undefined,
    authorizationGrant: row.authorization_grant_json ?? undefined,
    executionId: row.execution_id ?? undefined,
    evidence: parseEvidencePayload(row.evidence_json),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function createStoredFinancialIntent(
  organizationId: string,
  input: CreateFinancialIntentInput,
): Promise<ReturnType<typeof mapRow>> {
  const idempotencyKey = ensureIdempotencyKey(input.idempotencyKey)
  const existing = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND idempotency_key = ${idempotencyKey}
  `
  if (existing) {
    try {
      assertIdempotentReplay(
        "financial intent",
        hashStoredFinancialIntent(
          parseIntentPayload(existing.payload_json as FinancialIntent | string),
        ),
        hashFinancialIntentInput(input),
      )
    } catch {
      throw APIError.failedPrecondition(
        "financial intent idempotency key is already used for a different request payload",
      )
    }
    return mapRow(existing)
  }

  const intentId = v5Id("fin")
  if (input.principal.organizationId && input.principal.organizationId !== organizationId) {
    throw APIError.permissionDenied(
      "principal.organizationId must match the authenticated organization",
    )
  }
  const intent = createFinancialIntent(
    {
      ...input,
      principal: { ...input.principal, organizationId },
    },
    intentId,
  )
  const row = await db.queryRow<FinancialIntentRow>`
    INSERT INTO financial_intents (
      id, organization_id, payload_json, status, idempotency_key
    )
    VALUES (
      ${intentId}, ${organizationId}, ${intent as unknown as Record<string, unknown>}, 'CREATED', ${idempotencyKey}
    )
    RETURNING *
  `
  if (!row) throw APIError.internal("failed to create financial intent")
  return mapRow(row)
}

export async function authorizeStoredIntent(
  organizationId: string,
  intentId: string,
): Promise<{ grant: AuthorizationGrant; status: V5ExecutionStatus }> {
  const row = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND id = ${intentId}
  `
  if (!row) throw APIError.notFound("financial intent not found")

  const intent = parseIntentPayload(row.payload_json as FinancialIntent | string)
  const auth = await authorizeIntent(intent, async (candidate) => {
    if (!isX402GuardEnabled()) {
      return {
        grantId: v5Id("grant"),
        intentId: candidate.id,
        decision: "allow",
        limits: { reservedAmount: candidate.value.amount, asset: candidate.value.asset },
        policyVersion: "railguard-v5-demo",
        validUntil: candidate.constraints.expiresAt,
        executionConstraints: {
          networks: candidate.constraints.network ? [candidate.constraints.network] : [],
          recipients: candidate.counterparty.address ? [candidate.counterparty.address] : [],
        },
        evidenceHash: hashEvidencePart(candidate),
      }
    }
    const payer = await resolveCdpPayerAddress(organizationId)
    const guardInput = buildGuardInput(
      organizationId,
      candidate.id,
      buildExecutionCorrelation({
        paymentIntentId: candidate.id,
        executionIdempotencyKey: candidate.idempotencyKey,
        organizationID: organizationId,
        payerAddress: payer,
        recipientAddress: candidate.counterparty.address ?? `0x${"00".repeat(20)}`,
        amountBaseUnits: candidate.value.amount,
        tokenAddress: candidate.value.asset,
      }),
      candidate.idempotencyKey,
    )
    const guard = await evaluatePaymentGuard(guardInput)
    const decision =
      guard.decision.decision === "allow"
        ? ("allow" as const)
        : guard.decision.decision === "escalate"
          ? ("approval_required" as const)
          : ("deny" as const)
    return {
      grantId: guard.decision.authorizationId ?? v5Id("grant"),
      intentId: candidate.id,
      decision,
      limits: { reservedAmount: candidate.value.amount, asset: candidate.value.asset },
      policyVersion: "railguard-x402-v5",
      validUntil: candidate.constraints.expiresAt,
      executionConstraints: {
        networks: candidate.constraints.network ? [candidate.constraints.network] : [],
        recipients: candidate.counterparty.address ? [candidate.counterparty.address] : [],
      },
      evidenceHash: hashEvidencePart({ guard: guard.decision, intent: candidate.id }),
    }
  })

  await db.exec`
    UPDATE financial_intents
    SET status = ${auth.status},
        authorization_grant_json = ${JSON.stringify(auth.grant)},
        updated_at = NOW()
    WHERE id = ${intentId} AND organization_id = ${organizationId}
  `
  return auth
}

export async function getStoredFinancialIntentById(
  organizationId: string,
  intentId: string,
): Promise<ReturnType<typeof mapRow>> {
  const row = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND id = ${intentId}
  `
  if (!row) throw APIError.notFound("financial intent not found")
  return mapRow(row)
}

function isExternalSettlementNetwork(network?: string): boolean {
  const n = network?.toLowerCase() ?? ""
  return n.includes("arbitrum") || (n.includes("base") && n.includes("sepolia"))
}

export async function executeExternalStoredIntent(
  organizationId: string,
  intentId: string,
): Promise<{
  executionId: string
  intentId: string
  status: V5ExecutionStatus
  broadcastSheet: Record<string, unknown>
}> {
  const row = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND id = ${intentId}
  `
  if (!row) throw APIError.notFound("financial intent not found")
  if (row.status === "DENIED" || row.status === "APPROVAL_REQUIRED") {
    throw APIError.failedPrecondition(`intent not authorized: ${row.status}`)
  }
  if (row.status !== "AUTHORIZED" && row.status !== "RESERVED") {
    throw APIError.failedPrecondition(
      `intent must be AUTHORIZED before external execute: ${row.status}`,
    )
  }
  const intent = parseIntentPayload(row.payload_json as FinancialIntent | string)
  if (!isExternalSettlementNetwork(intent.constraints.network)) {
    throw APIError.invalidArgument(
      "external execute requires network arbitrum-sepolia, arbitrum-one, or arbitrum",
    )
  }
  const { buildBroadcastSheet } = await import("./settlementVerifyIntent")
  const sheet = buildBroadcastSheet(intent)
  const executionId = row.execution_id ?? v5Id("exec")
  const context = {
    ...(intent.context ?? {}),
    broadcastSheet: sheet,
    rail: "settlement-verify",
  }
  const updatedIntent: FinancialIntent = { ...intent, context }
  await db.exec`
    UPDATE financial_intents
    SET execution_id = ${executionId},
        status = 'AWAITING_BROADCAST',
        payload_json = ${updatedIntent as unknown as Record<string, unknown>},
        updated_at = NOW()
    WHERE id = ${intentId} AND organization_id = ${organizationId}
  `
  return {
    executionId,
    intentId,
    status: "AWAITING_BROADCAST",
    broadcastSheet: sheet as unknown as Record<string, unknown>,
  }
}

export async function observeExternalStoredExecution(
  organizationId: string,
  executionId: string,
  txHash: string,
): Promise<ReturnType<typeof mapRow>> {
  const normalizedTx = txHash.trim().toLowerCase()
  if (!/^0x[a-f0-9]{64}$/.test(normalizedTx)) {
    throw APIError.invalidArgument("txHash must be a 0x-prefixed 32-byte hash")
  }
  const row = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND execution_id = ${executionId}
  `
  if (!row) throw APIError.notFound("execution not found")

  const intent = parseIntentPayload(row.payload_json as FinancialIntent | string)
  const existingTx =
    typeof intent.context?.txHash === "string" ? intent.context.txHash.trim().toLowerCase() : null
  if (row.status === "SETTLED") {
    if (existingTx === normalizedTx) {
      if (!row.evidence_json) {
        await buildAndStoreEvidence(organizationId, executionId)
      }
      return getStoredExecution(organizationId, executionId)
    }
    throw APIError.failedPrecondition("execution already settled with a different transaction")
  }
  if (
    row.status !== "AWAITING_BROADCAST" &&
    row.status !== "EXECUTING" &&
    row.status !== "SUBMITTED"
  ) {
    throw APIError.failedPrecondition(`execution not awaiting observe: ${row.status}`)
  }

  const { verifyIntentSettlementTx } = await import("./settlementVerifyIntent")
  const { getEvmChain } = await import("../../packages/settlement/src/chains.ts")
  const verified = await verifyIntentSettlementTx({ intent, txHash: normalizedTx })
  if (verified.settlementStatus !== "CONFIRMED") {
    throw APIError.failedPrecondition(
      `settlement verify ${verified.settlementStatus} for tx ${normalizedTx}`,
    )
  }
  const chainId = getEvmChain(verified.chainKey).chainId

  const context = {
    ...(intent.context ?? {}),
    txHash: normalizedTx,
    explorerUrl: verified.explorerUrl,
    chainKey: verified.chainKey,
    rail: "settlement-verify",
  }
  const updatedIntent: FinancialIntent = { ...intent, context }
  const envelope = buildEvidenceEnvelopeForIntentRow(row, updatedIntent, "SETTLED")

  const dbTx = await db.begin()
  try {
    const claimed = await dbTx.queryRow<{ execution_id: string }>`
      INSERT INTO settlement_tx_claims (chain_id, tx_hash, organization_id, execution_id, intent_id)
      VALUES (${chainId}, ${normalizedTx}, ${organizationId}, ${executionId}, ${row.id})
      ON CONFLICT (chain_id, tx_hash) DO NOTHING
      RETURNING execution_id
    `
    if (!claimed) {
      const owner = await dbTx.queryRow<{ execution_id: string; organization_id: string }>`
        SELECT execution_id, organization_id FROM settlement_tx_claims
        WHERE chain_id = ${chainId} AND tx_hash = ${normalizedTx}
      `
      if (
        !owner ||
        owner.execution_id !== executionId ||
        owner.organization_id !== organizationId
      ) {
        throw APIError.failedPrecondition(
          "txHash already claimed by another execution or organization",
        )
      }
    }

    const updated = await dbTx.queryRow<{ id: string }>`
      UPDATE financial_intents
      SET status = 'SETTLED',
          payload_json = ${updatedIntent as unknown as Record<string, unknown>},
          evidence_json = ${envelope as unknown as Record<string, unknown>},
          updated_at = NOW()
      WHERE id = ${row.id}
        AND organization_id = ${organizationId}
        AND status IN ('AWAITING_BROADCAST', 'EXECUTING', 'SUBMITTED')
      RETURNING id
    `
    if (!updated) {
      throw APIError.failedPrecondition("execution observe raced or status changed")
    }
    await dbTx.commit()
  } catch (error) {
    await dbTx.rollback()
    throw error
  }

  return getStoredExecution(organizationId, executionId)
}

export async function linkPaymentIntentToFinancialIntent(
  organizationId: string,
  intentId: string,
  paymentIntentId: string,
  paymentStatus: string,
): Promise<void> {
  const executionId = v5Id("exec")
  const status = mapLegacyPaymentStatus(paymentStatus)
  await db.exec`
    UPDATE financial_intents
    SET payment_intent_id = ${paymentIntentId},
        execution_id = ${executionId},
        status = ${status},
        updated_at = NOW()
    WHERE id = ${intentId} AND organization_id = ${organizationId}
  `
}

export interface ExecutionListItem {
  executionId: string
  intentId: string
  status: V5ExecutionStatus
  paymentIntentId?: string
  amount: string
  asset: string
  network?: string
  rail?: string
  updatedAt: string
  createdAt: string
}

export async function listStoredExecutions(
  organizationId: string,
  options?: { limit?: number; cursor?: string },
): Promise<{ items: ExecutionListItem[]; nextCursor?: string }> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100)
  const cursor = options?.cursor?.trim()

  const collected: FinancialIntentRow[] = []
  const rows = cursor
    ? await db.query<FinancialIntentRow>`
        SELECT * FROM financial_intents
        WHERE organization_id = ${organizationId}
          AND execution_id IS NOT NULL
          AND updated_at < ${new Date(cursor)}
        ORDER BY updated_at DESC
        LIMIT ${limit + 1}
      `
    : await db.query<FinancialIntentRow>`
        SELECT * FROM financial_intents
        WHERE organization_id = ${organizationId}
          AND execution_id IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT ${limit + 1}
      `
  for await (const row of rows) {
    collected.push(row)
  }

  const page = collected.slice(0, limit)
  const hasMore = collected.length > limit
  const items: ExecutionListItem[] = page.map((row) => {
    const intent = parseIntentPayload(row.payload_json as FinancialIntent | string)
    const network = intent.constraints.network
    return {
      executionId: row.execution_id ?? row.id,
      intentId: row.id,
      status: row.status,
      paymentIntentId: row.payment_intent_id ?? undefined,
      amount: intent.value.amount,
      asset: intent.value.asset,
      network,
      rail: row.payment_intent_id
        ? "cdp"
        : intent.context?.rail === "settlement-verify"
          ? String(intent.context?.chainKey ?? "settlement-verify")
          : network?.includes("stellar")
            ? "stellar"
            : network?.includes("arbitrum")
              ? "arbitrum"
              : "x402",
      updatedAt: row.updated_at.toISOString(),
      createdAt: row.created_at.toISOString(),
    }
  })

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1]?.updated_at.toISOString() : undefined,
  }
}

export async function getStoredExecution(
  organizationId: string,
  executionId: string,
): Promise<ReturnType<typeof mapRow>> {
  const row = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND execution_id = ${executionId}
  `
  if (!row) throw APIError.notFound("execution not found")
  return mapRow(row)
}

function buildEvidenceEnvelopeForIntentRow(
  row: FinancialIntentRow,
  intent: FinancialIntent,
  status: string,
): EvidenceEnvelope {
  const ctx = intent.context ?? {}
  const txHash = typeof ctx.txHash === "string" ? ctx.txHash : undefined
  const rail = typeof ctx.rail === "string" ? ctx.rail : row.payment_intent_id ? "cdp" : "x402"
  return buildEvidenceEnvelope({
    intent,
    policyDecision: { status },
    authorizationGrant: row.authorization_grant_json ?? { grantId: "none" },
    execution: {
      provider: rail,
      submissionId: row.payment_intent_id ?? undefined,
      txHash,
    },
    settlement: {
      status: status === "SETTLED" ? "FINALIZED" : "UNOBSERVED",
      observedAt: row.updated_at.toISOString(),
    },
    policyVersion: row.authorization_grant_json?.policyVersion ?? "railguard-v5",
    sequence: 1,
  })
}

export async function buildAndStoreEvidence(
  organizationId: string,
  executionId: string,
): Promise<EvidenceEnvelope> {
  const row = await db.queryRow<FinancialIntentRow>`
    SELECT * FROM financial_intents
    WHERE organization_id = ${organizationId} AND execution_id = ${executionId}
  `
  if (!row) throw APIError.notFound("execution not found")
  const intent = parseIntentPayload(row.payload_json as FinancialIntent | string)
  const envelope = buildEvidenceEnvelopeForIntentRow(row, intent, row.status)
  await db.exec`
    UPDATE financial_intents
    SET evidence_json = ${envelope as unknown as Record<string, unknown>}, updated_at = NOW()
    WHERE id = ${row.id}
  `
  return envelope
}

export function buildExplainCharge(
  row: ReturnType<typeof mapRow>,
): ReturnType<typeof explainCharge> {
  const envelope =
    row.evidence ??
    buildEvidenceEnvelope({
      intent: row.intent,
      policyDecision: { status: row.status },
      authorizationGrant: row.authorizationGrant ?? { grantId: "none" },
      execution: { provider: "unknown" },
      settlement: { status: "UNOBSERVED" },
      policyVersion: row.authorizationGrant?.policyVersion ?? "railguard-v5",
      sequence: 1,
    })
  return explainCharge(envelope, {
    agent: row.intent.principal.actorId,
    task: typeof row.intent.context?.task === "string" ? row.intent.context.task : undefined,
    requested: `${row.intent.value.amount} ${row.intent.value.asset}`,
    decision: row.authorizationGrant?.decision ?? "pending",
    rail:
      typeof row.intent.context?.rail === "string"
        ? String(row.intent.context.rail)
        : row.paymentIntentId
          ? "cdp"
          : "x402",
  })
}

export { organizationAgentId }
