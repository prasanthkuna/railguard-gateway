/** Offline incident demo against the simulator (fake money, no network, no credentials). */
import type { AuthorizationGrant } from "../../authority"
import type { FinancialIntent } from "../../intent"
import { createAirwallexClient } from "./client"
import { type PayoutIncident, createIncidentCommander } from "./incidentCommander"
import { createAirwallexExecutionRail } from "./rail"
import { createAirwallexSimulator } from "./simulator"

export const DEMO_BENEFICIARY_ID = "sim_beneficiary_supplier_01"

export function demoPayoutIntent(id: string, amount = "250.00", currency = "USD"): FinancialIntent {
  return {
    id,
    principal: { organizationId: "org_demo", actorId: "agent_ap_bot", actorType: "agent" },
    action: { type: "pay", purpose: "Supplier invoice payout" },
    counterparty: { id: DEMO_BENEFICIARY_ID },
    value: { amount, asset: currency },
    constraints: { expiresAt: "2099-01-01T00:00:00.000Z" },
    idempotencyKey: `idem_${id}`,
  }
}

export function demoGrant(intent: FinancialIntent): AuthorizationGrant {
  return {
    grantId: `grant_${intent.id}`,
    intentId: intent.id,
    decision: "allow",
    limits: { reservedAmount: intent.value.amount, asset: intent.value.asset },
    policyVersion: "demo-v1",
    validUntil: intent.constraints.expiresAt,
    executionConstraints: { rails: ["airwallex"], recipients: [DEMO_BENEFICIARY_ID] },
    evidenceHash: "demo",
  }
}

export interface AirwallexIncidentDemoScenario {
  id: string
  title: string
  summary: string
  airwallexTransfersCreated: number
  createCallsSent: number
  incident: PayoutIncident
}

export interface AirwallexIncidentDemoResult {
  mode: "simulated"
  generatedAt: string
  scenarios: AirwallexIncidentDemoScenario[]
  webhookRejection: { accepted: boolean; reason?: string | undefined }
}

/** Runs the Track 3 scenarios end to end on a virtual clock. */
export async function runAirwallexIncidentDemo(
  start = new Date("2026-11-13T09:00:00.000Z"),
): Promise<AirwallexIncidentDemoResult> {
  let clock = start.getTime()
  const now = () => new Date(clock)
  const advance = (ms: number) => {
    clock += ms
  }
  const secret = "demo-webhook-secret-not-real"
  const sim = createAirwallexSimulator({ now })
  const client = createAirwallexClient({
    credentials: { clientId: "sim", apiKey: "sim" },
    baseUrl: "https://api-demo.airwallex.com",
    fetch: sim.fetch,
    now: () => clock,
  })
  const rail = createAirwallexExecutionRail({ client, now })
  const commander = createIncidentCommander({ rail, now, webhookSecret: secret })
  const scenarios: AirwallexIncidentDemoScenario[] = []

  // A: create lands at Airwallex, response lost -> UNKNOWN -> retry blocked -> reconcile adopts -> PAID webhook.
  const intentA = demoPayoutIntent("intent_demo_timeout_after_create")
  sim.queueCreateFault("timeout_after_create")
  const first = await commander.pay(intentA, demoGrant(intentA))
  advance(30_000)
  await commander.pay(intentA, demoGrant(intentA))
  advance(60_000)
  const incA = first.incident
  if (!incA) throw new Error("demo: expected incident for scenario A")
  await commander.reconcile(incA.id)
  const transferA = rail.getAttempt(first.executionId)?.transferId
  if (transferA) {
    advance(120_000)
    sim.setStatus(transferA, "PAID")
    const hook = sim.webhookFor(transferA, "payout.transfer.paid", secret, clock)
    commander.handleWebhook({ ...hook })
  }
  const reqA = rail.requestIdFor(intentA.id)
  scenarios.push({
    id: "A",
    title: "Timeout after create: duplicate payout blocked",
    summary:
      "The first create reached Airwallex but the response timed out. Railguard marked it UNKNOWN, refused the second payout, found the transfer by request_id, and confirmed it once.",
    airwallexTransfersCreated: sim.transfers().filter((t) => t.request_id === reqA).length,
    createCallsSent: sim.createCallsFor(reqA),
    incident: incA,
  })

  // B: request never reached Airwallex -> reconcile not found after grace -> one safe retry, same request_id.
  const intentB = demoPayoutIntent("intent_demo_timeout_before_create", "75.50")
  sim.queueCreateFault("timeout_before_create")
  const b = await commander.pay(intentB, demoGrant(intentB))
  const incB = b.incident
  if (!incB) throw new Error("demo: expected incident for scenario B")
  advance(30_000)
  await commander.reconcile(incB.id)
  advance(150_000)
  await commander.reconcile(incB.id)
  const transferB = rail.getAttempt(b.executionId)?.transferId
  if (transferB) {
    advance(60_000)
    sim.setStatus(transferB, "PAID")
    commander.handleWebhook(sim.webhookFor(transferB, "payout.transfer.paid", secret, clock))
  }
  const reqB = rail.requestIdFor(intentB.id)
  scenarios.push({
    id: "B",
    title: "Timeout before create: one safe retry",
    summary:
      "The create never reached Airwallex. Reconcile found nothing after the grace window, so Railguard retried once with the same request_id and confirmed one transfer.",
    airwallexTransfersCreated: sim.transfers().filter((t) => t.request_id === reqB).length,
    createCallsSent: sim.createCallsFor(reqB),
    incident: incB,
  })

  // C: forged webhook (bad signature) is rejected before parsing.
  const forged = transferA
    ? sim.webhookFor(transferA, "payout.transfer.failed", "wrong-secret", clock)
    : null
  const webhookRejection = forged
    ? commander.handleWebhook(forged)
    : { accepted: false, reason: "no_transfer" }

  return {
    mode: "simulated",
    generatedAt: now().toISOString(),
    scenarios,
    webhookRejection: { accepted: webhookRejection.accepted, reason: webhookRejection.reason },
  }
}
