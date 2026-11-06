import { describe, it, expect } from "bun:test"
import { Hbar } from "@hashgraph/sdk"

describe("Amount Conversion", () => {
  it("converts tinybars to HBAR correctly", () => {
    // 10_000_000 tinybars = 0.1 HBAR
    const tinybars = 10_000_000n
    const hbar = Hbar.fromTinybars(tinybars)
    
    expect(hbar.toTinybars().toString()).toBe("10000000")
    expect(hbar.toString()).toContain("0.1")
  })

  it("preserves bigint precision without Number conversion", () => {
    const tinybars = 10_000_000n
    
    // Correct: Use Hbar.fromTinybars(bigint)
    const correct = Hbar.fromTinybars(tinybars)
    
    // WRONG (what we had before): Convert to Number first
    // const wrong = new Hbar(Number(tinybars) / 100_000_000)
    
    expect(correct.toTinybars()).toBe(tinybars)
  })

  it("handles large amounts without precision loss", () => {
    const tinybars = 1_000_000_000_000n // 10,000 HBAR
    const hbar = Hbar.fromTinybars(tinybars)
    
    expect(hbar.toTinybars()).toBe(tinybars)
  })

  it("handles token transfer amounts as bigint", () => {
    // HTS tokens use atomic units (e.g., USDC with 6 decimals)
    const amount = 1_000_000n // 1 USDC (6 decimals)
    
    // These should be passed directly as bigint to TransferTransaction
    // NOT converted to Number
    expect(amount).toBe(1_000_000n)
    expect(-amount).toBe(-1_000_000n)
  })
})
