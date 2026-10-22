import { describe, expect, test } from "bun:test"
import {
  AirwallexApiError,
  DuplicatePayoutBlockedError,
  airwallexRequestId,
  assertSandboxBaseUrl,
  createAirwallexClient,
  createAirwallexExecutionRail,
  createAirwallexSimulator,
  createIncidentCommander,
  demoGrant,
  demoPayoutIntent,
  mapAirwallexStatus,
  runAirwallexIncidentDemo,
  signAirwallexWebhook,
  verifyAirwallexWebhook,
} from "./index"

const SECRET = "test-webhook-secret"

function setup() {
  let clock = Date.parse("2026-11-13T09:00:00.000Z")
  const now = () => new Date(clock)
  const advance = (ms: number) => {
    clock += ms
  }
  const sim = createAirwallexSimulator({ now })
  const client = createAirwallexClient({
    credentials: { clientId: "c", apiKey: "k" },
    fetch: sim.fetch,
    now: () => clock,
  })
  const rail = createAirwallexExecutionRail({ client, now })
  const commander = createIncidentCommander({ rail, now, webhookSecret: SECRET })
  return { sim, rail, commander, advance, now: () => clock }
}

describe("airwallex request_id", () => {
  test("deterministic per intent and within Airwallex limits", () => {
    const a = airwallexRequestId("intent_1")
    expect(a).toBe(airwallexRequestId("intent_1"))
    expect(a).not.toBe(airwallexRequestId("intent_2"))
    expect(a.length).toBeLessThanOrEqual(50)
  })

  test("prepare uses the same request_id as provider idempotency key", async () => {
    const { rail } = setup()
    const intent = demoPayoutIntent("intent_p")
    const prepared = await rail.prepare(intent, demoGrant(intent))
    expect(prepared.providerIdempotencyKey).toBe(airwallexRequestId("intent_p"))
    expect(prepared.canonicalRequest.request_id).toBe(prepared.providerIdempotencyKey)
  })

  test("prepare refuses grants that do not cover the payout", async () => {
    const { rail } = setup()
    const intent = demoPayoutIntent("intent_g", "500.00")
    const grant = { ...demoGrant(intent), limits: { reservedAmount: "100.00", asset: "USD" } }
    await expect(rail.prepare(intent, grant)).rejects.toThrow("exceeds reserved")
    await expect(rail.prepare(intent, { ...demoGrant(intent), decision: "deny" })).rejects.toThrow()
  })
})

describe("airwallex happy path", () => {
  test("create -> PROCESSING -> PAID reconciles as CONFIRMED", async () => {
    const { sim, rail } = setup()
    const intent = demoPayoutIntent("intent_ok")
    const prepared = await rail.prepare(intent, demoGrant(intent))
    const sub = await rail.execute(prepared)
    expect(sub.result).toBe("BROADCAST_CONFIRMED")
    expect(rail.getAttempt(prepared.executionId)?.state).toBe("SUBMITTED")
    sim.setStatus(sub.providerOperationId as string, "PAID")
    const result = await rail.reconcile(prepared.executionId)
    expect(result.status).toBe("RESOLVED")
    expect(rail.getAttempt(prepared.executionId)?.state).toBe("CONFIRMED")
    await expect(rail.execute(prepared)).rejects.toBeInstanceOf(DuplicatePayoutBlockedError)
    expect(sim.transfers().length).toBe(1)
  })
})

describe("incident commander: timeout -> UNKNOWN", () => {
  test("reconcile finds the transfer; second payout is blocked; no duplicate", async () => {
    const { sim, rail, commander, advance } = setup()
    const intent = demoPayoutIntent("intent_t1")
    sim.queueCreateFault("timeout_after_create")
    const first = await commander.pay(intent, demoGrant(intent))
    expect(first.outcome).toBe("UNKNOWN")
    expect(first.incident?.label).toBe("UNKNOWN")

    const second = await commander.pay(intent, demoGrant(intent))
    expect(second.outcome).toBe("BLOCKED_DUPLICATE")
    expect(second.incident?.retriesBlocked).toBe(1)

    advance(60_000)
    const incident = await commander.reconcile(first.incident?.id as string)
    expect(incident.timeline.map((e) => e.step)).toContain("RECONCILE_FOUND")
    expect(rail.getAttempt(first.executionId)?.state).toBe("SUBMITTED")

    const transferId = rail.getAttempt(first.executionId)?.transferId as string
    sim.setStatus(transferId, "PAID")
    const hook = sim.webhookFor(transferId, "payout.transfer.paid", SECRET, Date.now())
    const res = commander.handleWebhook({ ...hook, nowMs: Number(hook.timestamp) })
    expect(res.accepted).toBe(true)
    expect(res.incident?.status).toBe("RESOLVED")
    expect(res.incident?.outcome).toBe("CONFIRMED")
    expect(res.incident?.label).toBe("CONFIRMED")

    const requestId = airwallexRequestId(intent.id)
    expect(sim.transfers().filter((t) => t.request_id === requestId).length).toBe(1)
    expect(sim.createCallsFor(requestId)).toBe(1)
  })

  test("503 after create is UNKNOWN, then adopted by reconcile", async () => {
    const { sim, rail, commander, advance } = setup()
    const intent = demoPayoutIntent("intent_503")
    sim.queueCreateFault("503_after_create")
    const first = await commander.pay(intent, demoGrant(intent))
    expect(first.outcome).toBe("UNKNOWN")
    advance(10_000)
    await commander.reconcile(first.incident?.id as string)
    expect(rail.getAttempt(first.executionId)?.transferId).toBeDefined()
    expect(sim.transfers().length).toBe(1)
  })

  test("reconcile not found -> safe single retry with the same request_id", async () => {
    const { sim, rail, commander, advance } = setup()
    const intent = demoPayoutIntent("intent_t2")
    sim.queueCreateFault("timeout_before_create")
    const first = await commander.pay(intent, demoGrant(intent))
    expect(first.outcome).toBe("UNKNOWN")
    const incidentId = first.incident?.id as string

    // Inside the grace window: wait, do not retry.
    advance(30_000)
    let incident = await commander.reconcile(incidentId)
    expect(incident.timeline.at(-1)?.step).toBe("RECONCILE_NOT_FOUND_WAIT")
    expect(sim.transfers().length).toBe(0)

    advance(180_000)
    incident = await commander.reconcile(incidentId)
    const steps = incident.timeline.map((e) => e.step)
    expect(steps).toContain("RECONCILE_NOT_FOUND")
    expect(steps).toContain("SAFE_RETRY_SAME_REQUEST_ID")

    const requestId = airwallexRequestId(intent.id)
    expect(sim.createCallsFor(requestId)).toBe(2)
    expect(sim.transfers().length).toBe(1)
    expect(sim.transfers()[0]?.request_id).toBe(requestId)
    expect(rail.getAttempt(first.executionId)?.safeRetries).toBe(1)
    await expect(rail.safeRetry(first.executionId)).rejects.toBeInstanceOf(
      DuplicatePayoutBlockedError,
    )
  })

  test("safe retry refused without a not-found reconcile", async () => {
    const { sim, rail, commander } = setup()
    const intent = demoPayoutIntent("intent_t3")
    sim.queueCreateFault("timeout_before_create")
    const first = await commander.pay(intent, demoGrant(intent))
    await expect(rail.safeRetry(first.executionId)).rejects.toThrow("requires a reconcile")
  })

  test("duplicate request_id from Airwallex stays UNKNOWN until reconcile", async () => {
    const { sim, rail, advance } = setup()
    const intent = demoPayoutIntent("intent_dup")
    sim.queueCreateFault("timeout_before_create")
    const prepared = await rail.prepare(intent, demoGrant(intent))
    await rail.execute(prepared)
    advance(180_000)
    await rail.reconcileAttempt(prepared.executionId)
    // Someone else creates the transfer before our retry lands.
    const client = createAirwallexClient({
      credentials: { clientId: "c", apiKey: "k" },
      fetch: sim.fetch,
    })
    await client.createTransfer(prepared.canonicalRequest as never)
    const retry = await rail.safeRetry(prepared.executionId)
    expect(retry.result).toBe("BROADCAST_UNKNOWN")
    const outcome = await rail.reconcileAttempt(prepared.executionId)
    expect(outcome.found).toBe(true)
    expect(sim.transfers().length).toBe(1)
  })

  test("scan opens incidents for UNKNOWN and stuck payouts", async () => {
    const { sim, rail, commander, advance } = setup()
    const a = demoPayoutIntent("intent_scan_a")
    const b = demoPayoutIntent("intent_scan_b")
    const pa = await rail.prepare(a, demoGrant(a))
    sim.queueCreateFault("timeout_after_create")
    await rail.execute(pa)
    const pb = await rail.prepare(b, demoGrant(b))
    await rail.execute(pb)
    expect(commander.scan().map((i) => i.kind)).toEqual(["UNKNOWN_AFTER_SUBMIT"])
    advance(16 * 60_000)
    expect(commander.scan().map((i) => i.kind)).toEqual(["STUCK_PENDING"])
    expect(commander.list().length).toBe(2)
  })

  test("amount mismatch escalates as DISPUTED", async () => {
    const { sim, rail, commander, advance } = setup()
    const intent = demoPayoutIntent("intent_mm", "100.00")
    sim.queueCreateFault("timeout_after_create")
    const first = await commander.pay(intent, demoGrant(intent))
    const transfer = sim.transfers()[0]
    if (!transfer) throw new Error("expected transfer")
    sim.setStatus(transfer.id, "PAID")
    const tampered = sim.transfers()[0] as { transfer_amount?: number }
    tampered.transfer_amount = 999
    advance(10_000)
    const incident = await commander.reconcile(first.incident?.id as string)
    expect(rail.getAttempt(first.executionId)?.state).toBe("DISPUTED")
    expect(incident.status).toBe("ESCALATED")
    expect(incident.kind).toBe("AMOUNT_MISMATCH")
  })

  test("timeline is hash chained", async () => {
    const { sim, commander } = setup()
    const intent = demoPayoutIntent("intent_chain")
    sim.queueCreateFault("timeout_after_create")
    await commander.pay(intent, demoGrant(intent))
    const second = await commander.pay(intent, demoGrant(intent))
    const timeline = second.incident?.timeline ?? []
    expect(timeline.length).toBe(2)
    expect(timeline[0]?.hash).not.toBe(timeline[1]?.hash)
    expect(second.incident?.evidenceHead).toBe(timeline[1]?.hash as string)
  })
})

describe("airwallex webhook signature", () => {
  const body = JSON.stringify({
    name: "payout.transfer.paid",
    data: { object: { id: "t", request_id: "r" } },
  })
  const ts = "1762000000000"

  test("valid signature accepted", () => {
    const signature = signAirwallexWebhook(body, ts, SECRET)
    expect(
      verifyAirwallexWebhook({
        rawBody: body,
        timestamp: ts,
        signature,
        secret: SECRET,
        nowMs: Number(ts),
      }),
    ).toEqual({ ok: true })
  })

  test("bad signature, tampered body, missing headers, stale timestamp rejected", () => {
    const signature = signAirwallexWebhook(body, ts, SECRET)
    const base = { secret: SECRET, nowMs: Number(ts) }
    expect(
      verifyAirwallexWebhook({ ...base, rawBody: body, timestamp: ts, signature: "00".repeat(32) }),
    ).toEqual({
      ok: false,
      reason: "bad_signature",
    })
    expect(
      verifyAirwallexWebhook({ ...base, rawBody: `${body} `, timestamp: ts, signature }),
    ).toEqual({
      ok: false,
      reason: "bad_signature",
    })
    expect(
      verifyAirwallexWebhook({ ...base, rawBody: body, timestamp: ts, signature: null }),
    ).toEqual({
      ok: false,
      reason: "missing_headers",
    })
    expect(
      verifyAirwallexWebhook({
        ...base,
        rawBody: body,
        timestamp: ts,
        signature,
        nowMs: Number(ts) + 600_000,
      }),
    ).toEqual({ ok: false, reason: "stale_timestamp" })
    expect(verifyAirwallexWebhook({ rawBody: body, timestamp: ts, signature, secret: "" })).toEqual(
      {
        ok: false,
        reason: "missing_secret",
      },
    )
  })

  test("commander rejects forged webhook and leaves state untouched", async () => {
    const { sim, rail, commander, now } = setup()
    const intent = demoPayoutIntent("intent_wh")
    const prepared = await rail.prepare(intent, demoGrant(intent))
    const sub = await rail.execute(prepared)
    const forged = sim.webhookFor(
      sub.providerOperationId as string,
      "payout.transfer.paid",
      "attacker",
      now(),
    )
    const result = commander.handleWebhook(forged)
    expect(result).toEqual({ accepted: false, reason: "bad_signature" })
    expect(rail.getAttempt(prepared.executionId)?.state).toBe("SUBMITTED")
  })
})

describe("airwallex status mapping", () => {
  test.each([
    ["IN_APPROVAL", "PENDING", "SUBMITTED"],
    ["SCHEDULED", "PENDING", "SUBMITTED"],
    ["PROCESSING", "PENDING", "SUBMITTED"],
    ["SENT", "PENDING", "SUBMITTED"],
    ["PAID", "CONFIRMED", "SETTLED"],
    ["FAILED", "FAILED", "FAILED_SAFE"],
    ["CANCELLED", "FAILED", "FAILED_SAFE"],
    ["APPROVAL_REJECTED", "FAILED", "FAILED_SAFE"],
    ["SOMETHING_NEW", "UNKNOWN", "UNKNOWN"],
  ])("%s -> %s", (status, label, lifecycle) => {
    const mapped = mapAirwallexStatus(status)
    expect(String(mapped.label)).toBe(label)
    expect(String(mapped.lifecycle)).toBe(lifecycle)
  })

  test("PAID is not final (can still fail)", () => {
    expect(mapAirwallexStatus("PAID").final).toBe(false)
  })

  test("PAID then FAILED becomes REVERSED", async () => {
    const { sim, rail } = setup()
    const intent = demoPayoutIntent("intent_rev")
    const prepared = await rail.prepare(intent, demoGrant(intent))
    const sub = await rail.execute(prepared)
    rail.applyTransferUpdate(sim.setStatus(sub.providerOperationId as string, "PAID"))
    expect(rail.getAttempt(prepared.executionId)?.state).toBe("CONFIRMED")
    rail.applyTransferUpdate(sim.setStatus(sub.providerOperationId as string, "FAILED"))
    expect(rail.getAttempt(prepared.executionId)?.state).toBe("REVERSED")
  })
})

describe("airwallex client safety", () => {
  test("refuses non-sandbox base URLs for smoke runs", () => {
    expect(() => assertSandboxBaseUrl("https://api.airwallex.com")).toThrow()
    expect(() => assertSandboxBaseUrl("https://api-demo.airwallex.com")).not.toThrow()
  })

  test("4xx validation is REJECTED and allows a fresh attempt", async () => {
    const fetchLike = async (url: string) =>
      url.endsWith("/login")
        ? new Response(JSON.stringify({ token: "x", expires_at: "2099-01-01T00:00:00Z" }), {
            status: 201,
          })
        : new Response(JSON.stringify({ code: "invalid_argument" }), { status: 400 })
    const client = createAirwallexClient({
      credentials: { clientId: "c", apiKey: "k" },
      fetch: fetchLike,
    })
    const err = await client.getTransfer("t").catch((e) => e)
    expect(err).toBeInstanceOf(AirwallexApiError)
    expect((err as AirwallexApiError).kind).toBe("REJECTED")
  })

  test("unconfigured rail fails closed", async () => {
    const rail = createAirwallexExecutionRail()
    const intent = demoPayoutIntent("intent_nc")
    const prepared = await rail.prepare(intent, demoGrant(intent))
    await expect(rail.execute(prepared)).rejects.toThrow("not configured")
  })
})

describe("airwallex incident demo", () => {
  test("both scenarios end CONFIRMED with exactly one transfer each", async () => {
    const demo = await runAirwallexIncidentDemo()
    expect(demo.scenarios.length).toBe(2)
    for (const s of demo.scenarios) {
      expect(s.airwallexTransfersCreated).toBe(1)
      expect(s.incident.outcome).toBe("CONFIRMED")
    }
    expect(demo.scenarios[0]?.createCallsSent).toBe(1)
    expect(demo.scenarios[0]?.incident.retriesBlocked).toBe(1)
    expect(demo.scenarios[1]?.createCallsSent).toBe(2)
    expect(demo.webhookRejection).toEqual({ accepted: false, reason: "bad_signature" })
  })
})

describe("airwallex error classification (live API shapes)", () => {
  const login = () =>
    new Response(JSON.stringify({ token: "t", expires_at: "2099-01-01T00:00:00Z" }), {
      status: 201,
    })
  const clientReturning = (status: number, body: unknown) =>
    createAirwallexClient({
      credentials: { clientId: "c", apiKey: "k" },
      fetch: async (url) =>
        url.endsWith("/authentication/login")
          ? login()
          : new Response(JSON.stringify(body), { status }),
    })
  const req = {
    request_id: "rg_x",
    beneficiary_id: "b",
    transfer_amount: "1.00",
    transfer_currency: "USD",
    source_currency: "USD",
    reason: "payment_to_supplier",
    reference: "RG x",
  }

  test("duplicate_request_id (live sandbox code) is DUPLICATE_REQUEST, not REJECTED", async () => {
    const client = clientReturning(400, { code: "duplicate_request_id", message: "dup" })
    const err = await client.createTransfer(req).catch((e) => e)
    expect(err).toBeInstanceOf(AirwallexApiError)
    expect((err as AirwallexApiError).kind).toBe("DUPLICATE_REQUEST")
  })

  test("validation_failed surfaces the failing field so a bad beneficiary is diagnosable", async () => {
    const client = clientReturning(400, {
      code: "validation_failed",
      details: { errors: [{ code: "045", source: "beneficiary_id" }] },
    })
    const err = (await client.createTransfer(req).catch((e) => e)) as AirwallexApiError
    expect(err.kind).toBe("REJECTED")
    expect(err.code).toBe("validation_failed")
    expect(err.message).toContain("beneficiary_id#045")
  })
})
