import { describe, expect, test } from "bun:test"
import { runChaosTimeout } from "../../packages/kernel/src/adapters/airwallex"
import {
  attemptRow,
  incidentRow,
  isChaosRun,
  overHourlyCap,
  parseJsonBody,
  runIdFor,
  runRowToSummary,
  sanitizeChaosRun,
} from "./airwallexOpsPure"

describe("airwallex ops persistence helpers", () => {
  test("chaos run maps to rows and back", async () => {
    const run = await runChaosTimeout({
      mode: "simulated",
      now: () => new Date("2026-11-13T09:00:00Z"),
    })
    expect(isChaosRun(run)).toBe(true)
    expect(isChaosRun({ kind: "x" })).toBe(false)
    const id = runIdFor(run)
    expect(id.startsWith("run_simulated_")).toBe(true)
    const a = attemptRow(run.attempts[0] as never, "simulated")
    expect(JSON.parse(a.doc).requestId).toBe(run.requestId)
    const i = incidentRow(run.incidents[0] as never, "simulated")
    expect(i.label).toBe("CONFIRMED")
    const summary = runRowToSummary({
      id,
      kind: "chaos_timeout_after_create",
      mode: "simulated",
      ok: true,
      request_id: run.requestId,
      transfer_id: run.transferId ?? null,
      create_calls: 1,
      transfers_created: 1,
      label: "CONFIRMED",
      source: "test",
      doc: JSON.stringify(run),
      created_at: new Date("2026-11-13T09:00:00Z"),
    })
    expect(summary.createCalls).toBe(1)
    expect(summary.createdAt).toBe("2026-11-13T09:00:00.000Z")
    expect(sanitizeChaosRun(run)).toBe(run)
    expect(() => sanitizeChaosRun({ ...run, notes: ["Bearer abc123"] })).toThrow()
  })

  test("caps and body parsing", () => {
    expect(overHourlyCap(119, 120)).toBe(false)
    expect(overHourlyCap(120, 120)).toBe(true)
    expect(parseJsonBody('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonBody("nope")).toBeNull()
    expect(parseJsonBody("x".repeat(10), 5)).toBeNull()
  })
})
