/** v5 §5 — rail registry (Core + x402 + CDP/Base only for now) */

import { createBaseExecutionRail } from "./adapters/baseRail"
import { type CdpRailConfig, createCdpExecutionRail } from "./adapters/cdpRail"
import type { ExecutionRail } from "./executionRail"

export type { CdpRailConfig } from "./adapters/cdpRail"
import { createX402ExecutionRail } from "./adapters/x402Rail"

export type SupportedRailName = "x402" | "cdp" | "base" | "stellar"

export const V5_SUPPORTED_RAILS: readonly SupportedRailName[] = [
  "x402",
  "cdp",
  "base",
  "stellar",
] as const

/** Settlement-verify + grant rails — see @railguard/integrations */
export const V5_DEFERRED_RAILS = [
  "arbitrum-sepolia",
  "arbitrum",
  "monad-testnet",
  "arc",
  "celo",
  "stellar",
  "airwallex",
  "solana",
  "stripe",
  "mandates/ap2",
] as const

export class ExecutionRailRegistry {
  private readonly rails = new Map<string, ExecutionRail>()

  register(rail: ExecutionRail): void {
    this.rails.set(rail.name, rail)
  }

  get(name: string): ExecutionRail | undefined {
    return this.rails.get(name)
  }

  list(): string[] {
    return [...this.rails.keys()]
  }
}

const REGISTRY_CDP_PLACEHOLDER: CdpRailConfig = {
  organizationId: "registry",
  payerAddress: `0x${"00".repeat(20)}`,
}

export function resolveRailForNetwork(network?: string): SupportedRailName {
  const normalized = network?.trim().toLowerCase() ?? ""
  if (normalized.includes("stellar")) return "stellar"
  if (normalized.includes("base")) return "base"
  if (normalized.includes("x402") || normalized.includes("http")) return "x402"
  if (normalized) return "cdp"
  return "x402"
}

export function createDefaultRailRegistry(
  cdpConfig: CdpRailConfig = REGISTRY_CDP_PLACEHOLDER,
): ExecutionRailRegistry {
  const registry = new ExecutionRailRegistry()
  registry.register(createX402ExecutionRail())
  registry.register(createCdpExecutionRail(cdpConfig))
  registry.register(createBaseExecutionRail(cdpConfig))
  return registry
}
