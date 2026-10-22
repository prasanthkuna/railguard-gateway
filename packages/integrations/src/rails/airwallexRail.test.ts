import { describe, expect, test } from "bun:test"
import { createAirwallexExecutionRail } from "./airwallexRail"

describe("integrations airwallex rail", () => {
  test("without sandbox keys the rail is registered but not configured", () => {
    const rail = createAirwallexExecutionRail({})
    expect(rail.name).toBe("airwallex")
    expect(rail.configured).toBe(false)
  })

  test("with keys the rail is configured (no network call at construction)", () => {
    const rail = createAirwallexExecutionRail({
      AIRWALLEX_CLIENT_ID: "id",
      AIRWALLEX_API_KEY: "key",
    })
    expect(rail.configured).toBe(true)
  })
})
