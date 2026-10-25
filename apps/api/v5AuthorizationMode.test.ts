import { describe, expect, test } from "bun:test"
import { requiresLivePolicy } from "./v5AuthorizationMode"

describe("v5 policy enforcement boundary", () => {
  test("live mode refuses demo-only grants", () => {
    expect(requiresLivePolicy("live", false)).toBe(true)
  })

  test("live mode permits configured guard evaluation", () => {
    expect(requiresLivePolicy("live", true)).toBe(false)
  })

  test("explicit demo mode may use the demo grant", () => {
    expect(requiresLivePolicy("demo", false)).toBe(false)
  })
})
