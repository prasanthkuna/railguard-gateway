import { describe, expect, test } from "bun:test"
import {
  KIT11,
  type Kit11Model,
  approvalHash,
  centsToUsdz,
  changedRoles,
  classifyPay,
  classifyPull,
  createSimulatedKit11Rail,
  createSimulatedTreasury,
  initialAllocation,
  railguardRequestId,
  rebalanceOptions,
  runKit11,
  scriptedKit11Model,
  sumBudgets,
  usdzToCents,
  validateAllocation,
} from "./index"

const ADDR = {
  upstream: "0x5100000000000000000000000000000000000002",
  bridge: "0x5100000000000000000000000000000000000003",
}
const zero = { sourcing: 0, support: 0, treasury: 0 }

describe("kit11 amounts", () => {
  test("cents round-trip and refuse sub-cent", () => {
    expect(centsToUsdz(4)).toBe("0.04")
    expect(centsToUsdz(2000)).toBe("20.00")
    expect(usdzToCents("0.04 *USDZ")).toBe(4)
    expect(usdzToCents("10")).toBe(1000)
    expect(() => usdzToCents("0.045")).toThrow()
  })
  test("initial allocation spends exactly the 20 *USDZ total", () => {
    const a = initialAllocation(ADDR)
    expect(sumBudgets(a)).toBe(KIT11.totalBudgetCents)
    expect(validateAllocation(a, zero, KIT11).ok).toBe(true)
  })
})

describe("railguard request ids", () => {
  test("deterministic and key-order independent", () => {
    const a = railguardRequestId({ kind: "refund", orderNo: 2, tx: "0xab" })
    const b = railguardRequestId({ tx: "0xab", orderNo: 2, kind: "refund" })
    expect(a).toBe(b)
    expect(a).toMatch(/^rg_[0-9a-f]{40}$/)
    expect(railguardRequestId({ kind: "refund", orderNo: 3, tx: "0xab" })).not.toBe(a)
  })
})

describe("budget guard", () => {
  test("rejects a sum above the total, budget at or below spent, sub-cap upstream", () => {
    const a = initialAllocation(ADDR)
    const over = { ...a, sourcing: { ...a.sourcing, budgetCents: 1100 } }
    expect(validateAllocation(over, zero, KIT11).errors.join()).toContain("above the 2000")
    expect(validateAllocation(a, { ...zero, support: 400 }, KIT11).ok).toBe(false)
    expect(validateAllocation(a, zero, KIT11, { sourcingCapAtLeast: 4 }).ok).toBe(false)
  })
  test("support payees must stay open, sourcing and treasury listed", () => {
    const a = initialAllocation(ADDR)
    expect(
      validateAllocation({ ...a, support: { ...a.support, payees: ["0x1"] } }, zero, KIT11).ok,
    ).toBe(false)
    expect(
      validateAllocation({ ...a, sourcing: { ...a.sourcing, payees: [] } }, zero, KIT11).ok,
    ).toBe(false)
  })
  test("every rebalance option stays inside the total and covers the new price", () => {
    const opts = rebalanceOptions(
      initialAllocation(ADDR),
      { sourcing: 6, support: 0, treasury: 0 },
      KIT11,
      4,
      5,
    )
    expect(opts.map((o) => o.id)).toEqual(["A", "B", "C"])
    for (const o of opts) {
      expect(sumBudgets(o.allocation)).toBeLessThanOrEqual(2000)
      expect(o.allocation.sourcing.capCents).toBeGreaterThanOrEqual(4)
    }
    expect(opts.find((o) => o.id === "C")?.queryPriceCents).toBe(7)
  })
  test("changed roles shrink first so the sum never passes the total mid-way", () => {
    const a = initialAllocation(ADDR)
    const opt = rebalanceOptions(a, zero, KIT11, 4, 5).find((o) => o.id === "A")
    expect(opt).toBeDefined()
    if (opt) expect(changedRoles(a, opt.allocation)).toEqual(["support", "sourcing"])
  })
  test("approval hash binds the exact terms", () => {
    const a = initialAllocation(ADDR)
    expect(approvalHash(a, 5)).toBe(approvalHash(a, 5))
    expect(approvalHash(a, 5)).not.toBe(approvalHash(a, 7))
  })
})

describe("metal-agent output", () => {
  test("pull outcomes", () => {
    expect(
      classifyPull("transaction 0xaa\noutcome paid\nspent 6.5 *USDZ of 10 *USDZ").outcome,
    ).toBe("PAID")
    const again = classifyPull("already paid, nothing sent\nspent 6.5 *USDZ of 10 *USDZ")
    expect(again.outcome).toBe("PAID")
    expect(again.alreadyPaid).toBe(true)
    const r = classifyPull("outcome refused, not sent\nreason mandate_cap_exceeded\nrecorded no")
    expect(r.outcome).toBe("REFUSED")
    expect(r.reason).toBe("mandate_cap_exceeded")
    expect(classifyPull("outcome pending").outcome).toBe("UNKNOWN")
    expect(
      classifyPull("error: the pull kept before may have been sent and can land until 12:00")
        .outcome,
    ).toBe("UNKNOWN")
    expect(classifyPull("outcome held").outcome).toBe("HELD")
  })
  test("pay outcomes: refused moved nothing, seller error after signing is UNKNOWN", () => {
    const paid = classifyPay("nonce 0x1\nstatus 200\ntransaction 0xbb\nsigned-offer abc\nbody {}")
    expect(paid.outcome).toBe("PAID")
    expect(paid.signedOffer).toBe("abc")
    const refused = classifyPay(
      "error: payment refused: mandate_cap_exceeded (the amount is above the mandate's per-payment cap) (offer: 0.04 *USDZ on eip155:63825); nothing was paid",
    )
    expect(refused.outcome).toBe("REFUSED")
    expect(refused.reason).toBe("mandate_cap_exceeded")
    expect(classifyPay("nonce 0x2\nerror: fetch failed").outcome).toBe("UNKNOWN")
    expect(classifyPay("nonce 0x2\nstatus 502\nbody {}").outcome).toBe("UNKNOWN")
  })
})

function simRail(drop: ("sourcing" | "support" | "treasury")[] = []) {
  return createSimulatedKit11Rail({
    allocation: initialAllocation(ADDR),
    addresses: ADDR,
    queryPriceCents: KIT11.queryPriceCents,
    upstreamPriceCents: KIT11.upstreamPriceCents,
    dropFirstAnswer: drop,
  })
}

describe("kit11 end to end (simulator)", () => {
  test("refusal, approved rebalance, dispute refund, earnings to Airwallex, licence fee", async () => {
    const rail = simRail()
    const r = await runKit11({
      rail,
      treasury: createSimulatedTreasury(),
      allocation: initialAllocation(ADDR),
      approve: () => true,
      runId: "test-1",
      resendEarnings: true,
    })
    const refused = r.sales.find((s) => s.outcome === "NOT_CHARGED")
    expect(refused?.refusal).toBe("mandate_cap_exceeded")
    expect(r.refusal?.reason).toBe("mandate_cap_exceeded")
    expect(r.approved).toBe(true)
    expect(sumBudgets(r.allocationAfter)).toBeLessThanOrEqual(2000)
    expect(r.sales.filter((s) => s.outcome === "SOLD" && s.upstreamPriceCents === 4)).toHaveLength(
      2,
    )
    expect(r.dispute?.verifiedOrders).toBe(3)
    expect(r.dispute?.refundOrderNos).toEqual([2])
    expect(r.dispute?.refunds[0]?.pull.outcome).toBe("PAID")
    expect(r.earnings?.pull.outcome).toBe("PAID")
    expect(r.earnings?.resend?.alreadyPaid).toBe(true)
    expect(rail.pullsLanded(r.earnings?.paymentId ?? "")).toBe(1)
    expect(r.deposit?.reference).toBe(r.earnings?.pull.transaction)
    expect(r.licence?.currency).toBe("EUR")
    expect(Object.values(r.invariants).every(Boolean)).toBe(true)
  })

  test("lost payout answer: same payment id re-run, paid once", async () => {
    const rail = simRail(["treasury"])
    const r = await runKit11({
      rail,
      treasury: createSimulatedTreasury(),
      allocation: initialAllocation(ADDR),
      approve: () => true,
      runId: "test-2",
    })
    expect(r.events.some((e) => e.step === "UNKNOWN_RERUN_SAME_ID")).toBe(true)
    expect(r.earnings?.pull.alreadyPaid).toBe(true)
    expect(rail.pullsLanded(r.earnings?.paymentId ?? "")).toBe(1)
    expect(r.invariants.noUnresolvedUnknown).toBe(true)
  })

  test("not approved: nothing replaced, escalated", async () => {
    const r = await runKit11({
      rail: simRail(),
      treasury: createSimulatedTreasury(),
      allocation: initialAllocation(ADDR),
      approve: () => false,
      runId: "test-3",
    })
    expect(r.approved).toBe(false)
    expect(r.events.some((e) => e.step === "MANDATE_REPLACED")).toBe(false)
    expect(r.events.at(-1)?.step).toBe("ESCALATED")
  })

  test("model answers out of bounds fall back to scripted rules", async () => {
    const rogue: Kit11Model = {
      name: "rogue",
      json: async () => ({ optionId: "Z", refundOrderNos: [99] }),
    }
    const r = await runKit11({
      rail: simRail(),
      treasury: createSimulatedTreasury(),
      models: [rogue],
      allocation: initialAllocation(ADDR),
      approve: () => true,
      runId: "test-4",
    })
    expect(r.proposal?.decision.decidedBy).toBe(scriptedKit11Model().name)
    expect(r.dispute?.refundOrderNos).toEqual([2])
  })

  test("a model picking option B moves budget from treasury, still inside the total", async () => {
    const pickB: Kit11Model = {
      name: "pick-b",
      json: async (sys) =>
        sys.includes("treasury agent")
          ? { optionId: "B", rationale: "keep refunds" }
          : { refundOrderNos: [], rationale: "data fine" },
    }
    const r = await runKit11({
      rail: simRail(),
      treasury: createSimulatedTreasury(),
      models: [pickB],
      allocation: initialAllocation(ADDR),
      approve: () => true,
      runId: "test-5",
    })
    expect(r.allocationAfter.treasury.budgetCents).toBeLessThan(600)
    expect(sumBudgets(r.allocationAfter)).toBeLessThanOrEqual(2000)
    expect(r.dispute?.refunds).toHaveLength(0)
  })
})
