import { describe, expect, test } from "bun:test"
import { evidenceSettlementStatus } from "./v5EvidenceStatus"

const txHash = `0x${"ab".repeat(32)}`

describe("v5 settlement evidence proof boundary", () => {
  test("only a verified external settlement gets a FINALIZED label", () => {
    expect(evidenceSettlementStatus("SETTLED", { rail: "settlement-verify", txHash })).toBe(
      "FINALIZED",
    )
  })

  test("status alone is not external settlement proof", () => {
    expect(evidenceSettlementStatus("SETTLED", {})).toBe("UNOBSERVED")
    expect(evidenceSettlementStatus("SETTLED", { rail: "cdp", txHash })).toBe("UNOBSERVED")
    expect(evidenceSettlementStatus("SETTLED", { rail: "settlement-verify" })).toBe(
      "UNOBSERVED",
    )
    expect(
      evidenceSettlementStatus("UNKNOWN", { rail: "settlement-verify", txHash }),
    ).toBe("UNOBSERVED")
    expect(
      evidenceSettlementStatus("SETTLED", { rail: "settlement-verify", txHash: "0x123" }),
    ).toBe("UNOBSERVED")
  })
})
