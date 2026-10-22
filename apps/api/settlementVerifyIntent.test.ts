import { describe, expect, it } from "bun:test"
import type { FinancialIntent } from "../../packages/kernel/src/intent"
import {
  buildBroadcastSheet,
  resolveSettlementChainKey,
  resolveTokenAddress,
} from "./settlementVerifyIntent"

describe("settlementVerifyIntent helpers", () => {
  it("resolves arbitrum sepolia and one", () => {
    expect(resolveSettlementChainKey("arbitrum-sepolia")).toBe("arbitrum-sepolia")
    expect(resolveSettlementChainKey("arbitrum-one")).toBe("arbitrum-one")
    expect(resolveSettlementChainKey("arbitrum")).toBe("arbitrum-one")
  })

  it("resolves USDC on arbitrum sepolia", () => {
    const addr = resolveTokenAddress("arbitrum-sepolia", "USDC")
    expect(addr.toLowerCase()).toBe("0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d")
  })

  it("rejects unknown asset symbols (no silent USDC fallback)", () => {
    expect(() => resolveTokenAddress("arbitrum-sepolia", "DAI")).toThrow()
    expect(() => resolveTokenAddress("arbitrum-sepolia", "ETH")).toThrow()
  })

  it("builds broadcast sheet from intent", () => {
    const intent: FinancialIntent = {
      id: "fin_test",
      principal: { organizationId: "org", actorId: "agent", actorType: "agent" },
      action: { type: "transfer" },
      counterparty: { address: "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233" },
      value: { amount: "10000", asset: "USDC" },
      constraints: {
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        network: "arbitrum-sepolia",
      },
      idempotencyKey: "idem_test_12345678",
    }
    const sheet = buildBroadcastSheet(intent)
    expect(sheet.chainId).toBe(421614)
    expect(sheet.amount).toBe("10000")
    expect(sheet.recipient).toBe(intent.counterparty.address)
  })
})
