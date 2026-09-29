import { type ExecutionRailRegistry, createDefaultRailRegistry } from "@railguard/kernel/adapters"
import type { CdpRailConfig } from "@railguard/kernel/adapters"
import { listEvmChainIds } from "@railguard/settlement/chains"
import { createAirwallexExecutionRail } from "./airwallexRail"
import { createSettlementVerifyRail } from "./settlementVerifyRail"
import { createStellarExecutionRail } from "./stellarRail"

/** Kernel execution rails + per-chain settlement-verify adapters (Stellar, EVM, etc.). */
export function createCombinedRailRegistry(cdpConfig: CdpRailConfig): ExecutionRailRegistry {
  const registry = createDefaultRailRegistry(cdpConfig)
  registry.register(createStellarExecutionRail())
  for (const chainId of listEvmChainIds()) {
    if (chainId === "base-sepolia") continue
    const rail = createSettlementVerifyRail(chainId)
    if (!registry.get(rail.name)) registry.register(rail)
  }
  registry.register(createAirwallexExecutionRail())
  return registry
}
