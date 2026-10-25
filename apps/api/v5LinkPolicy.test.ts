import { describe, expect, test } from "bun:test"
import { canLinkV5Intent } from "./v5LinkPolicy"

describe("v5 legacy payment intent binding", () => {
  test("linkage succeeds only for the payment pre-bound in the authorized intent", () => {
    expect(canLinkV5Intent("AUTHORIZED", "pi_1", undefined, "pi_1")).toBe(true)
    expect(canLinkV5Intent("RESERVED", "pi_1", "pi_1", "pi_1")).toBe(true)
  })

  test("rejects payment substitution and missing context", () => {
    expect(canLinkV5Intent("AUTHORIZED", "pi_2", undefined, "pi_1")).toBe(false)
    expect(canLinkV5Intent("AUTHORIZED", "pi_1", "pi_2", "pi_1")).toBe(false)
    expect(canLinkV5Intent("AUTHORIZED", "pi_1", undefined, undefined)).toBe(false)
    expect(canLinkV5Intent("AUTHORIZED", "", undefined, "")).toBe(false)
  })

  test("never relinks in an executing, settled, or ambiguous state", () => {
    for (const status of ["EXECUTING", "SUBMITTED", "UNKNOWN", "SETTLED", "DISPUTED"] as const) {
      expect(canLinkV5Intent(status, "pi_1", "pi_1", "pi_1")).toBe(false)
    }
  })
})
