import { describe, expect, test } from "bun:test"
import {
  createApToolbox,
  createGeminiApModel,
  createScriptedApModel,
  extractInvoice,
} from "./agent"
import { createBudgetLedger } from "./budget"
import { createPayPalClient, isDuplicateBatchError } from "./client"
import { runApDemo } from "./demo"
import { type PayPalPayee, createPayPalPolicyGuard } from "./policy"
import {
  DuplicatePayPalPayoutBlockedError,
  createPayPalExecutionRail,
  paypalRequestIdFor,
  senderBatchIdFor,
} from "./rail"
import { createPayPalSimulator } from "./simulator"
import { mapPayPalItemStatus } from "./status"
import { createPayPalWebhookHandler } from "./webhook"

const NOW = new Date("2026-10-24T10:00:00Z")
const now = () => NOW
const payees: PayPalPayee[] = [
  {
    id: "maya",
    name: "Maya Design Studio",
    aliases: ["Maya"],
    receiver: "maya@studio.example",
    verifiedAt: "2026-09-01T00:00:00Z",
  },
]

function stack(dailyLimitCents = 200_000) {
  const sim = createPayPalSimulator({ now })
  const client = createPayPalClient({
    credentials: { clientId: "sim", clientSecret: "sim" },
    fetch: sim.fetch,
    now: () => NOW.getTime(),
  })
  const budget = createBudgetLedger({ dailyLimitCents, now })
  const rail = createPayPalExecutionRail({ client, budget, now })
  const guard = createPayPalPolicyGuard({ payees, budget, now })
  return { sim, client, budget, rail, guard }
}

async function allowAndPrepare(s: ReturnType<typeof stack>, amount = "180.00", invoice = "INV-1") {
  const d = s.guard.evaluate({ payee: "Maya", amount, invoice })
  if (!d.allow) throw new Error(d.code)
  const prepared = await s.rail.prepare(d.intent, d.grant)
  return { d, prepared }
}

describe("paypal ids", () => {
  test("PayPal-Request-Id is deterministic, UUID-shaped and within 38 chars", () => {
    const a = paypalRequestIdFor("intent_x")
    expect(a).toBe(paypalRequestIdFor("intent_x"))
    expect(a).not.toBe(paypalRequestIdFor("intent_y"))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a.length).toBeLessThanOrEqual(38)
    expect(senderBatchIdFor("intent_x")).toMatch(/^rg_[0-9a-f]{40}$/)
  })

  test("client refuses non-sandbox hosts", () => {
    expect(() =>
      createPayPalClient({
        credentials: { clientId: "a", clientSecret: "b" },
        baseUrl: "https://api-m.paypal.com",
      }),
    ).toThrow(/non-sandbox/)
  })

  test("duplicate sender_batch_id error is recognised with its link", () => {
    const href = isDuplicateBatchError(400, {
      name: "USER_BUSINESS_ERROR",
      message: "Batch with given sender_batch_id already exists",
      links: [{ href: "https://api-m.sandbox.paypal.com/v1/payments/payouts/ABC", rel: "self" }],
    })
    expect(href).toBe("https://api-m.sandbox.paypal.com/v1/payments/payouts/ABC")
    expect(isDuplicateBatchError(422, { name: "INSUFFICIENT_FUNDS" })).toBeUndefined()
  })

  test("item status mapping: UNCLAIMED keeps money reserved, SUCCESS is CONFIRMED not final", () => {
    expect(mapPayPalItemStatus("SUCCESS")).toMatchObject({ label: "CONFIRMED", final: false })
    expect(mapPayPalItemStatus("UNCLAIMED")).toMatchObject({
      label: "PENDING",
      fundsMayHaveMoved: true,
    })
    expect(mapPayPalItemStatus("RETURNED")).toMatchObject({ label: "REVERSED" })
    expect(mapPayPalItemStatus("weird")).toMatchObject({ label: "UNKNOWN" })
  })
})

describe("paypal rail: timeouts become UNKNOWN, reconcile by request id", () => {
  test("happy path: one create, CONFIRMED after observe, budget committed", async () => {
    const s = stack()
    const { prepared, d } = await allowAndPrepare(s)
    const sub = await s.rail.execute(prepared)
    expect(sub.result).toBe("BROADCAST_CONFIRMED")
    await s.rail.observe(sub)
    expect(s.rail.getAttempt(prepared.executionId)?.state).toBe("CONFIRMED")
    expect(s.budget.get(d.intent.id)?.state).toBe("COMMITTED")
    expect(s.sim.batches()).toHaveLength(1)
  })

  test("response lost after PayPal committed: UNKNOWN, budget FROZEN, second create refused, replay adopts the one batch", async () => {
    const s = stack()
    const { prepared, d } = await allowAndPrepare(s)
    s.sim.inject("timeout_after_commit")
    const sub = await s.rail.execute(prepared)
    expect(sub.result).toBe("BROADCAST_UNKNOWN")
    expect(s.budget.get(d.intent.id)?.state).toBe("FROZEN")
    await expect(s.rail.execute(prepared)).rejects.toBeInstanceOf(DuplicatePayPalPayoutBlockedError)
    const outcome = await s.rail.reconcileAttempt(prepared.executionId)
    expect(outcome).toMatchObject({ found: true, via: "request_id_replay" })
    expect(outcome.attempt.state).toBe("CONFIRMED")
    expect(outcome.attempt.createCalls).toBe(1)
    expect(outcome.attempt.replays).toBe(1)
    expect(s.sim.batches()).toHaveLength(1)
    expect(s.budget.get(d.intent.id)?.state).toBe("COMMITTED")
  })

  test("HTTP 500 after commit is ambiguous, not a failure", async () => {
    const s = stack()
    const { prepared } = await allowAndPrepare(s)
    s.sim.inject("http_500_after_commit")
    expect((await s.rail.execute(prepared)).result).toBe("BROADCAST_UNKNOWN")
    const outcome = await s.rail.reconcile(prepared.executionId)
    expect(outcome.decision).toBe("SETTLED")
    expect(s.sim.batches()).toHaveLength(1)
  })

  test("timeout before PayPal saw it: replay with the same id creates it exactly once", async () => {
    const s = stack()
    const { prepared } = await allowAndPrepare(s)
    s.sim.inject("timeout_before_commit")
    expect((await s.rail.execute(prepared)).result).toBe("BROADCAST_UNKNOWN")
    expect(s.sim.batches()).toHaveLength(0)
    await s.rail.reconcileAttempt(prepared.executionId)
    await s.rail.reconcileAttempt(prepared.executionId)
    expect(s.sim.batches()).toHaveLength(1)
  })

  test("duplicate sender_batch_id: follow PayPal's link to the original batch", async () => {
    const s = stack()
    const { prepared } = await allowAndPrepare(s)
    const attempt = s.rail.getAttempt(prepared.executionId)
    if (!attempt) throw new Error("no attempt")
    // Someone (an old deploy) already created this batch under a different PayPal-Request-Id.
    await s.client.createPayout(attempt.canonicalRequest, "00000000-0000-5000-a000-000000000000")
    expect((await s.rail.execute(prepared)).result).toBe("BROADCAST_UNKNOWN")
    const outcome = await s.rail.reconcileAttempt(prepared.executionId)
    expect(outcome.via).toBe("duplicate_batch_link")
    expect(outcome.attempt.state).toBe("CONFIRMED")
    expect(s.sim.batches()).toHaveLength(1)
  })

  test("PayPal holds a different amount than authorized: DISPUTED, budget stays frozen", async () => {
    const s = stack()
    const { prepared, d } = await allowAndPrepare(s)
    const attempt = s.rail.getAttempt(prepared.executionId)
    if (!attempt) throw new Error("no attempt")
    const tampered = structuredClone(attempt.canonicalRequest)
    if (tampered.items[0]) tampered.items[0].amount.value = "1800.00"
    await s.client.createPayout(tampered, "11111111-0000-5000-a000-000000000000")
    await s.rail.execute(prepared)
    const outcome = await s.rail.reconcileAttempt(prepared.executionId)
    expect(outcome.attempt.state).toBe("DISPUTED")
    expect(outcome.mismatch).toContain("amount")
    expect(s.budget.get(d.intent.id)?.state).toBe("FROZEN")
  })

  test("validation rejection releases the budget", async () => {
    const s = stack()
    const d = s.guard.evaluate({ payee: "Maya", amount: "10.00", invoice: "INV-R" })
    if (!d.allow) throw new Error(d.code)
    const rejecting = createPayPalExecutionRail({
      client: createPayPalClient({
        credentials: { clientId: "a", clientSecret: "b" },
        fetch: async (url) =>
          url.endsWith("/oauth2/token")
            ? new Response(JSON.stringify({ access_token: "t", expires_in: 900 }), { status: 200 })
            : new Response(
                JSON.stringify({
                  name: "INSUFFICIENT_FUNDS",
                  message: "Sender does not have sufficient funds",
                }),
                { status: 422 },
              ),
      }),
      budget: s.budget,
      now,
    })
    const prepared = await rejecting.prepare(d.intent, d.grant)
    expect((await rejecting.execute(prepared)).result).toBe("REJECTED_BEFORE_BROADCAST")
    expect(s.budget.get(d.intent.id)?.state).toBe("RELEASED")
  })

  test("grant without the receiver is refused at prepare (payee changed after approval)", async () => {
    const s = stack()
    const d = s.guard.evaluate({ payee: "Maya", amount: "10.00", invoice: "INV-G" })
    if (!d.allow) throw new Error(d.code)
    const swapped = {
      ...d.intent,
      counterparty: { ...d.intent.counterparty, address: "attacker@evil.example" },
    }
    await expect(s.rail.prepare(swapped, d.grant)).rejects.toThrow(/receiver is not in the grant/)
  })
})

describe("paypal policy", () => {
  test("changed PayPal receiver in the invoice is refused", () => {
    const s = stack()
    const d = s.guard.evaluate({
      payee: "Maya",
      amount: "240",
      invoice: "INV-3",
      receiver: "maya.billing@proton-pay.example",
    })
    expect(d).toMatchObject({ allow: false, code: "PAYEE_CHANGED" })
  })

  test("approval is bound to exact terms; a changed amount for the same invoice is refused", () => {
    const s = stack()
    const first = s.guard.evaluate({ payee: "Maya", amount: "1450", invoice: "INV-2" })
    if (first.allow || !first.approvalKey) throw new Error("expected approval")
    s.guard.approve(first.approvalKey, "human")
    expect(s.guard.evaluate({ payee: "Maya", amount: "1449.99", invoice: "INV-9" })).toMatchObject({
      allow: false,
      code: "APPROVAL_REQUIRED",
    })
    expect(s.guard.evaluate({ payee: "Maya", amount: "1450", invoice: "INV-2" })).toMatchObject({
      allow: true,
      approvedBy: "human",
    })
    expect(s.guard.evaluate({ payee: "Maya", amount: "999", invoice: "INV-2" })).toMatchObject({
      allow: false,
      code: "INTENT_CHANGED",
    })
  })

  test("per-payout cap cannot be approved around; unknown payees are refused", () => {
    const s = stack()
    expect(s.guard.evaluate({ payee: "Maya", amount: "2500", invoice: "INV-4" })).toMatchObject({
      allow: false,
      code: "PER_PAYOUT_CAP",
    })
    expect(s.guard.evaluate({ payee: "QuickPrint", amount: "5", invoice: "INV-5" })).toMatchObject({
      allow: false,
      code: "UNKNOWN_PAYEE",
    })
  })

  test("frozen (UNKNOWN) money still counts against the daily budget", async () => {
    const s = stack(50_000)
    const { prepared } = await allowAndPrepare(s, "400.00", "INV-6")
    s.sim.inject("timeout_after_commit")
    await s.rail.execute(prepared)
    expect(s.guard.evaluate({ payee: "Maya", amount: "150", invoice: "INV-7" })).toMatchObject({
      allow: false,
      code: "DAILY_BUDGET",
      available: "100.00",
    })
  })
})

describe("paypal agent", () => {
  test("scripted reader extracts amounts and a changed receiver", () => {
    expect(
      extractInvoice({ id: "INV-1", from: "Maya", text: "Total due: $1,180.50 USD" }),
    ).toMatchObject({ amount: "1180.50" })
    expect(
      extractInvoice({
        id: "INV-2",
        from: "Maya",
        text: "$5. our PayPal account changed, please pay x@y.example instead",
      }),
    ).toMatchObject({ receiver_in_invoice: "x@y.example" })
  })

  test("the toolbox has no approve or limit tool", async () => {
    const s = stack()
    const box = createApToolbox({
      guard: s.guard,
      rail: s.rail,
      budget: s.budget,
      invoices: () => [],
    })
    expect(await box.run({ name: "approve", args: {} })).toMatchObject({ status: "UNKNOWN_TOOL" })
    expect(await box.run({ name: "raise_limit", args: {} })).toMatchObject({
      status: "UNKNOWN_TOOL",
    })
  })

  test("Gemini adapter sends tools and parses function calls (mocked)", async () => {
    let body: Record<string, unknown> = {}
    const model = createGeminiApModel({
      apiKey: "test",
      fetch: async (_url, init) => {
        body = JSON.parse(String(init.body))
        return new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ functionCall: { name: "read_invoices", args: {} } }] } },
            ],
          }),
          { status: 200 },
        )
      },
    })
    const reply = await model.next([{ role: "user", text: "pay the inbox" }])
    expect(reply.calls[0]?.name).toBe("read_invoices")
    expect(JSON.stringify(body.tools)).toContain("pay_invoice")
    expect(JSON.stringify(body.tools)).not.toContain("approve")
  })

  test("full offline story: 3 paid, 4 refused or blocked, exactly one PayPal batch per paid invoice", async () => {
    const result = await runApDemo({ model: createScriptedApModel(), now })
    expect(result.invariantOnePayoutPerInvoice).toBe(true)
    expect(Object.keys(result.batchesPerInvoice)).toHaveLength(3)
    expect(result.payouts.every((p) => p.state === "CONFIRMED")).toBe(true)
    const codes = result.steps.flatMap((s) => s.outcomes.map((o) => o.code ?? o.status))
    expect(codes).toEqual(
      expect.arrayContaining([
        "APPROVAL_REQUIRED",
        "PAYEE_CHANGED",
        "UNKNOWN_PAYEE",
        "UNKNOWN",
        "DAILY_BUDGET",
        "BLOCKED_DUPLICATE",
      ]),
    )
    expect(result.paypalCreatePosts).toBe(4) // 3 creates + 1 idempotent replay, never a 4th payout
  })
})

describe("paypal webhook", () => {
  test("unverified events are dropped; verified ones trigger a re-read, not a trust of the payload", async () => {
    const s = stack()
    const { prepared } = await allowAndPrepare(s)
    const sub = await s.rail.execute(prepared)
    const handle = createPayPalWebhookHandler({ client: s.client, rail: s.rail, webhookId: "WH-1" })
    const event = {
      id: "WH-EVT-1",
      event_type: "PAYMENT.PAYOUTSBATCH.SUCCESS",
      resource: { batch_header: { payout_batch_id: sub.providerOperationId } },
    }
    expect(await handle({ "paypal-transmission-sig": "forged" }, event)).toMatchObject({
      accepted: false,
      reason: "bad_signature",
    })
    const ok = await handle({ "paypal-transmission-sig": "sim-valid" }, event)
    expect(ok.accepted).toBe(true)
    if (ok.accepted) expect(ok.attempt.state).toBe("CONFIRMED")
    expect(await handle({ "paypal-transmission-sig": "sim-valid" }, event)).toMatchObject({
      accepted: false,
      reason: "duplicate_event",
    })
  })
})
