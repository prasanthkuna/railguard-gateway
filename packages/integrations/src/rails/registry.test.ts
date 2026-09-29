import { describe, expect, test } from "bun:test"
import { createCombinedRailRegistry } from "./registry"

describe("combined rail registry", () => {
  test("includes stellar and core rails", () => {
    const registry = createCombinedRailRegistry({
      organizationId: "org_test",
      payerAddress: `0x${"11".repeat(20)}`,
    })
    const names = registry.list()
    expect(names).toContain("stellar")
    expect(names).toContain("x402")
    expect(names).toContain("base")
  })
})
