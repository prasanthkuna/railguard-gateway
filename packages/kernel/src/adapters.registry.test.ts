import { describe, expect, test } from "bun:test"
import { createDefaultRailRegistry, resolveRailForNetwork } from "./adapters"

describe("rail registry", () => {
  test("default registry registers core rails", () => {
    const registry = createDefaultRailRegistry()
    expect(registry.list().sort()).toEqual(["base", "cdp", "x402"])
  })

  test("resolveRailForNetwork maps ecosystems", () => {
    expect(resolveRailForNetwork("base-sepolia")).toBe("base")
    expect(resolveRailForNetwork("stellar-testnet")).toBe("stellar")
    expect(resolveRailForNetwork("arbitrum-sepolia")).toBe("cdp")
  })
})
