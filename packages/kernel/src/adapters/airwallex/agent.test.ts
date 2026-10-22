import { describe, expect, test } from "bun:test"
import {
  type AgentMessage,
  DEFAULT_PAYOUT_POLICY,
  approvalKeyFor,
  chaosPayees,
  createAirwallexClient,
  createAirwallexExecutionRail,
  createAirwallexSimulator,
  createGeminiPaymentOpsModel,
  createInMemoryPayoutAttemptStore,
  createIncidentCommander,
  createPaymentOpsToolbox,
  createPayoutPolicyGuard,
  createResilientPaymentOpsModel,
  createScriptedPaymentOpsModel,
  geminiModelChain,
  parsePayRequest,
  payoutIntentId,
  pickLiveChaosSlot,
  redactChaosRun,
  runAgentPolicyDemo,
  runChaosTimeout,
  runPaymentOpsAgent,
  runSimulatedAgentRequest,
  toGeminiContents,
} from "./index"

const START = new Date("2026-11-13T09:00:00.000Z")

function stack() {
  let clock = START.getTime()
  const now = () => new Date(clock)
  const sim = createAirwallexSimulator({ now })
  const client = createAirwallexClient({
    credentials: { clientId: "c", apiKey: "k" },
    fetch: sim.fetch,
    now: () => clock,
  })
  const rail = createAirwallexExecutionRail({ client, now })
  const commander = createIncidentCommander({ rail, now })
  const guard = createPayoutPolicyGuard({ payees: chaosPayees("ben_acme", now()), now })
  const toolbox = createPaymentOpsToolbox({ guard, commander, rail })
  return {
    sim,
    rail,
    commander,
    guard,
    toolbox,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

describe("payout policy guard", () => {
  test("allows a verified payee under every limit and mints a matching grant", () => {
    const { guard } = stack()
    const d = guard.evaluate({ payee: "Acme", amount: "250", currency: "USD", invoice: "1" })
    expect(d.allow).toBe(true)
    if (!d.allow) return
    expect(d.intent.counterparty.id).toBe("ben_acme")
    expect(d.grant.limits.reservedAmount).toBe("250.00")
    expect(d.grant.intentId).toBe(payoutIntentId("acme", "1"))
  })

  test("structured denials: approval, new payee, unknown payee, currency, amount", () => {
    const { guard } = stack()
    const cases: Array<[string, string, string, string]> = [
      ["Acme", "1200", "USD", "APPROVAL_REQUIRED"],
      ["Globex", "10", "USD", "NEW_PAYEE_HOLD"],
      ["Initech", "10", "USD", "UNKNOWN_PAYEE"],
      ["Acme", "10", "EUR", "CURRENCY_NOT_ALLOWED"],
      ["Acme", "-5", "USD", "INVALID_AMOUNT"],
    ]
    for (const [payee, amount, currency, code] of cases) {
      const d = guard.evaluate({ payee, amount, currency, invoice: `i-${code}` })
      expect(d.allow).toBe(false)
      if (!d.allow) {
        expect(d.code).toBe(code as never)
        expect(d.reason.length).toBeGreaterThan(5)
        expect(d.nextStep.length).toBeGreaterThan(5)
      }
    }
  })

  test("approval is bound to exact terms; a cap still wins over an approval", () => {
    const { guard } = stack()
    const d1 = guard.evaluate({ payee: "Acme", amount: "1200", currency: "USD", invoice: "42" })
    expect(d1.allow).toBe(false)
    if (d1.allow || !d1.approvalKey) throw new Error("expected approval key")
    expect(d1.approvalKey).toBe(approvalKeyFor("acme", 1200, "USD", "42"))
    guard.approve(d1.approvalKey, "human")
    // Different amount on the same invoice is a different approval.
    const changed = guard.evaluate({
      payee: "Acme",
      amount: "1300",
      currency: "USD",
      invoice: "42",
    })
    expect(changed.allow).toBe(false)
    if (!changed.allow) expect(changed.code).toBe("APPROVAL_REQUIRED")
    expect(
      guard.evaluate({ payee: "Acme", amount: "1200", currency: "USD", invoice: "42" }).allow,
    ).toBe(true)
    const key2 = approvalKeyFor("acme", 2000, "USD", "43")
    guard.approve(key2, "human")
    const capped = guard.evaluate({ payee: "Acme", amount: "2000", currency: "USD", invoice: "43" })
    expect(capped.allow).toBe(false)
    if (!capped.allow) expect(capped.code).toBe("PER_PAYEE_CAP")
    expect(() => guard.approve("not-a-key", "x")).toThrow()
  })

  test("daily cap across payees, and retries of the same intent are not double counted", () => {
    let clock = START.getTime()
    const now = () => new Date(clock)
    const payees = [
      ...chaosPayees("ben_acme", now()),
      {
        id: "umbrella",
        name: "Umbrella Co",
        beneficiaryId: "ben_u",
        verifiedAt: "2026-01-01T00:00:00Z",
      },
    ]
    const guard = createPayoutPolicyGuard({ payees, now, config: { dailyCap: 1500 } })
    expect(
      guard.evaluate({ payee: "Acme", amount: "900", currency: "USD", invoice: "a" }).allow,
    ).toBe(true)
    expect(
      guard.evaluate({ payee: "Acme", amount: "900", currency: "USD", invoice: "a" }).allow,
    ).toBe(true)
    const d = guard.evaluate({ payee: "Umbrella", amount: "700", currency: "USD", invoice: "b" })
    expect(d.allow).toBe(false)
    if (!d.allow) {
      expect(d.code).toBe("DAILY_CAP")
      expect(d.used).toBe(900)
    }
    clock += 24 * 3_600_000
    expect(
      guard.evaluate({ payee: "Umbrella", amount: "700", currency: "USD", invoice: "b" }).allow,
    ).toBe(true)
    expect(guard.usage().dailyCap).toBe(1500)
    expect(DEFAULT_PAYOUT_POLICY.approvalThreshold).toBe(1000)
  })

  test("state snapshot round-trips (persisted between requests)", () => {
    const { guard } = stack()
    guard.evaluate({ payee: "Acme", amount: "2000", currency: "USD", invoice: "x" })
    const key = approvalKeyFor("acme", 2000, "USD", "x")
    guard.approve(key, "human")
    const restored = createPayoutPolicyGuard({
      payees: chaosPayees("ben_acme", START),
      now: () => START,
      state: guard.snapshot(),
    })
    expect(
      restored.evaluate({ payee: "Acme", amount: "2000", currency: "USD", invoice: "x" }).allow,
    ).toBe(true)
    const capped = restored.evaluate({
      payee: "Acme",
      amount: "600",
      currency: "USD",
      invoice: "y",
    })
    expect(capped.allow).toBe(false)
  })
})

describe("payment-ops agent", () => {
  test("parses plain requests", () => {
    expect(parsePayRequest("pay Acme $1,200 for invoice 42")).toEqual({
      payee: "Acme",
      amount: "1200",
      currency: "USD",
      invoice: "42",
    })
    expect(parsePayRequest("Pay Acme Supplies EUR 30.50 for invoice #INV-7")?.currency).toBe("EUR")
    expect(parsePayRequest("hello")).toBeNull()
  })

  test("the model cannot bypass policy with extra arguments", async () => {
    const { toolbox, sim } = stack()
    const out = await toolbox.run({
      name: "create_payout",
      args: {
        payee: "Acme",
        amount: "5000",
        invoice: "99",
        approved: true,
        approval_key: "apr_00000000000000000000",
        beneficiary_id: "attacker_account",
      },
    })
    expect(out.status).toBe("DENIED")
    expect(sim.transfers()).toHaveLength(0)
    const unknown = await toolbox.run({ name: "approve_payout", args: {} })
    expect(unknown.status).toBe("UNKNOWN_TOOL")
  })

  test("scripted agent: denial is explained, not worked around", async () => {
    const { toolbox, sim } = stack()
    const res = await runPaymentOpsAgent({
      model: createScriptedPaymentOpsModel(),
      toolbox,
      history: [],
      request: "pay Acme $1,200 for invoice 42",
    })
    expect(res.reply).toContain("approval threshold")
    expect(sim.transfers()).toHaveLength(0)
  })

  test("policy demo: approval, re-pay blocked, caps and holds, one transfer total", async () => {
    const demo = await runAgentPolicyDemo(createScriptedPaymentOpsModel(), START)
    expect(demo.steps.map((s) => s.code ?? s.outcome)).toEqual([
      "APPROVAL_REQUIRED",
      "SUBMITTED",
      "BLOCKED_DUPLICATE",
      "PER_PAYEE_CAP",
      "NEW_PAYEE_HOLD",
      "UNKNOWN_PAYEE",
    ])
    expect(demo.transfersCreated).toBe(1)
  })

  test("free-form simulated request honours human approvals only", async () => {
    const denied = await runSimulatedAgentRequest({ request: "pay Acme $1,200 for invoice 42" })
    expect(denied.transfersCreated).toBe(0)
    const approved = await runSimulatedAgentRequest({
      request: "pay Acme $1,200 for invoice 42",
      approvals: [approvalKeyFor("acme", 1200, "USD", "42"), "garbage"],
    })
    expect(approved.transfersCreated).toBe(1)
  })

  test("list_incidents and get_transfer tools", async () => {
    const { toolbox, sim } = stack()
    sim.queueCreateFault("timeout_after_create")
    const paid = await toolbox.run({
      name: "create_payout",
      args: { payee: "Acme", amount: "10", invoice: "5" },
    })
    expect(paid.status).toBe("UNKNOWN")
    const list = (await toolbox.run({ name: "list_incidents", args: {} })) as {
      incidents: unknown[]
    }
    expect(list.incidents).toHaveLength(1)
    const rec = await toolbox.run({ name: "reconcile", args: { incident_id: paid.incident_id } })
    expect(rec.transfer_id).toBeDefined()
    const t = await toolbox.run({ name: "get_transfer", args: { execution_id: paid.execution_id } })
    expect(t.create_calls).toBe(1)
    expect(
      (await toolbox.run({ name: "get_transfer", args: { execution_id: "nope" } })).status,
    ).toBe("NOT_FOUND")
  })
})

describe("gemini model (mocked HTTP)", () => {
  test("function calling round trip echoes thought signatures", async () => {
    const bodies: Array<Record<string, unknown>> = []
    let turn = 0
    const fetch = async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)))
      turn += 1
      const parts =
        turn === 1
          ? [
              {
                functionCall: {
                  name: "create_payout",
                  args: { payee: "Acme", amount: "20", invoice: "8" },
                },
                thoughtSignature: "sig-1",
              },
            ]
          : [{ text: "Paid Acme 20.00 USD, PENDING." }]
      return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts } }] }))
    }
    const model = createGeminiPaymentOpsModel({ apiKey: "test", fetch })
    const { toolbox, sim } = stack()
    const res = await runPaymentOpsAgent({
      model,
      toolbox,
      history: [],
      request: "pay Acme $20 for invoice 8",
    })
    expect(res.reply).toContain("PENDING")
    expect(sim.transfers()).toHaveLength(1)
    const second = bodies[1] as { contents: Array<{ parts: Array<Record<string, unknown>> }> }
    expect(second.contents[1]?.parts[0]?.thoughtSignature).toBe("sig-1")
    expect(second.contents[2]?.parts[0]?.functionResponse).toBeDefined()
    expect(JSON.stringify(bodies[0])).toContain("create_payout")
  })

  test("resilient model falls back to scripted on provider errors", async () => {
    const broken = createGeminiPaymentOpsModel({
      apiKey: "x",
      fetch: async () => new Response("quota", { status: 429 }),
    })
    const model = createResilientPaymentOpsModel(broken)
    const history: AgentMessage[] = [{ role: "user", text: "pay Acme $5 for invoice 1" }]
    const reply = await model.next(history)
    expect(reply.calls[0]?.name).toBe("create_payout")
    expect(model.fallbacks()).toBe(1)
    expect(model.name).toBe("scripted-offline")
    expect(createResilientPaymentOpsModel(undefined).name).toBe("scripted-offline")
    const ok = createGeminiPaymentOpsModel({
      apiKey: "x",
      model: "gemini-2.5-flash",
      fetch: async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "hi" }] } }] })),
    })
    const chained = createResilientPaymentOpsModel([broken, ok])
    expect((await chained.next(history)).text).toBe("hi")
    expect(chained.name).toBe("gemini-2.5-flash")
    expect(geminiModelChain(undefined)).toHaveLength(0)
    expect(geminiModelChain("k").map((m) => m.name)).toEqual([
      "gemini-3.8-flash",
      "gemini-2.5-flash",
    ])
    expect(
      toGeminiContents([{ role: "tool", results: [{ name: "x", result: {} }] }])[0]?.role,
    ).toBe("user")
  })
})

describe("chaos: timeout after create", () => {
  test("simulated: agent retries, Railguard blocks, one transfer CONFIRMED", async () => {
    const r = await runChaosTimeout({ mode: "simulated", now: () => START })
    expect(r.ok).toBe(true)
    expect(r.airwallexTransfersCreated).toBe(1)
    expect(r.createCalls).toBe(1)
    expect(r.wireCreateCalls).toBe(1)
    expect(r.injectedTimeouts).toBe(1)
    expect(r.retriesBlocked).toBe(2)
    expect(r.label).toBe("CONFIRMED")
    expect(r.confirmation).toBe("webhook")
    expect(r.forgedWebhook).toEqual({
      accepted: false,
      reason: "bad_signature",
      stateUnchanged: true,
    })
    const steps = r.incident?.timeline.map((t) => t.step) ?? []
    expect(steps).toContain("RETRY_BLOCKED")
    expect(steps).toContain("RECONCILE_FOUND")
    expect(steps.at(-1)).toBe("RESOLVED")
  })

  test("live code path against a sandbox-shaped server: poll confirms after simulated PAID", async () => {
    let clock = START.getTime()
    const sim = createAirwallexSimulator({ now: () => new Date(clock) })
    const r = await runChaosTimeout({
      mode: "live",
      credentials: { clientId: "sim", apiKey: "sim" },
      beneficiaryId: "ben_live",
      fetch: sim.fetch,
      now: () => new Date(clock),
      sleep: async (ms) => {
        clock += ms
      },
      invoice: "CHAOS-TEST-1",
    })
    expect(r.ok).toBe(true)
    expect(r.confirmation).toBe("poll")
    expect(r.label).toBe("CONFIRMED")
    expect(r.notes.some((n) => n.includes("PAID accepted"))).toBe(true)
    expect(sim.transfers()).toHaveLength(1)
    const redacted = redactChaosRun(r, "ben_live")
    expect(JSON.stringify(redacted)).not.toContain('ben_live"')
    expect(redacted.createCalls).toBe(1)
  })

  test("a well-behaved model that never retries still gets the queue redelivery blocked", async () => {
    const polite = {
      name: "polite",
      async next(history: AgentMessage[]) {
        const last = history[history.length - 1]
        if (last?.role === "user" && /^Pay/.test(last.text)) {
          return {
            calls: [
              {
                name: "create_payout",
                args: { payee: "Acme", amount: "1.00", invoice: "POLITE-1" },
              },
            ],
          }
        }
        return { text: "Already in flight; not paying again.", calls: [] }
      },
    }
    const r = await runChaosTimeout({
      mode: "simulated",
      now: () => START,
      invoice: "POLITE-1",
      model: polite,
    })
    expect(r.retriesBlocked).toBe(1)
    expect(r.ok).toBe(true)
    expect(r.createCalls).toBe(1)
  })

  test("live mode refuses production hosts and missing credentials", async () => {
    await expect(runChaosTimeout({ mode: "live" })).rejects.toThrow("live mode needs")
    await expect(
      runChaosTimeout({
        mode: "live",
        credentials: { clientId: "a", apiKey: "b" },
        beneficiaryId: "x",
        baseUrl: "https://api.airwallex.com",
      }),
    ).rejects.toThrow("non-sandbox")
  })

  test("hourly live slots are capped by request_id dedupe", async () => {
    const sim = createAirwallexSimulator({ now: () => START })
    const credentials = { clientId: "sim", apiKey: "sim" }
    const first = await pickLiveChaosSlot({
      credentials,
      maxSlots: 2,
      now: START,
      fetch: sim.fetch,
    })
    expect(first?.slot).toBe(1)
    for (const slot of [1, 2]) {
      await runChaosTimeout({
        mode: "live",
        credentials,
        beneficiaryId: "b",
        fetch: sim.fetch,
        now: () => START,
        sleep: async () => {},
        invoice: `CHAOS-${START.toISOString().slice(0, 13).replace(/[-T]/g, "")}-${slot}`,
        pollAttempts: 1,
      })
    }
    expect(
      await pickLiveChaosSlot({ credentials, maxSlots: 2, now: START, fetch: sim.fetch }),
    ).toBeNull()
  })

  test("state survives a restart: attempts and incidents rehydrate and still block", async () => {
    const r = await runChaosTimeout({ mode: "simulated", now: () => START, invoice: "PERSIST-1" })
    const saved = JSON.parse(JSON.stringify({ attempts: r.attempts, incidents: r.incidents }))
    const sim = createAirwallexSimulator({ now: () => START })
    const client = createAirwallexClient({
      credentials: { clientId: "c", apiKey: "k" },
      fetch: sim.fetch,
    })
    const rail = createAirwallexExecutionRail({
      client,
      store: createInMemoryPayoutAttemptStore(saved.attempts),
      now: () => START,
    })
    const commander = createIncidentCommander({ rail, now: () => START })
    commander.restore(saved.incidents)
    expect(commander.list()).toHaveLength(1)
    const guard = createPayoutPolicyGuard({
      payees: chaosPayees("sim_beneficiary_acme", START),
      now: () => START,
    })
    const toolbox = createPaymentOpsToolbox({ guard, commander, rail })
    const again = await toolbox.run({
      name: "create_payout",
      args: { payee: "Acme", amount: "1.00", invoice: "PERSIST-1" },
    })
    expect(again.status).toBe("BLOCKED_DUPLICATE")
    expect(sim.transfers()).toHaveLength(0)
  })
})
