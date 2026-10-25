import { describe, expect, test } from "bun:test"
import type { EvidenceEnvelope } from "@railguard/kernel"
import { assertFinalizedPayment } from "./paymentSafety"

const evidence = (status: EvidenceEnvelope["settlement"]["status"]): EvidenceEnvelope => ({
  intentHash: "intent",
  policyDecisionHash: "decision",
  authorizationGrantHash: "grant",
  execution: { provider: "cdp" },
  settlement: { status },
  policyVersion: "v1",
  sequence: 1,
})

describe("SDK pay completion contract", () => {
  test("accepts only finalized settlement and a settled execution state", () => {
    expect(() => assertFinalizedPayment("SETTLED", evidence("FINALIZED"))).not.toThrow()
    expect(() => assertFinalizedPayment("SETTLED", evidence("UNOBSERVED"))).toThrow()
    expect(() => assertFinalizedPayment("UNKNOWN", evidence("FINALIZED"))).toThrow()
  })
})
