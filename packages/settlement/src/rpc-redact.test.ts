import { describe, expect, it } from "bun:test"
import { redactRpcUrlForEvidence } from "./rpc-redact"

describe("redactRpcUrlForEvidence", () => {
  const pub = "https://sepolia-rollup.arbitrum.io/rpc"

  it("keeps public default RPC", () => {
    expect(redactRpcUrlForEvidence(pub, pub)).toBe(pub)
  })

  it("redacts alchemy path keys", () => {
    expect(
      redactRpcUrlForEvidence("https://arb-sepolia.g.alchemy.com/v2/secret-key-here", pub),
    ).toBe(pub)
  })
})
