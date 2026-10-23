/**
 * Airwallex hackathon Kit 11 "x402 Business Agents" on Metal testnet.
 *
 * A data business sells market data per query over x402 in *USDZ. Three agents draw on one Metal
 * account, each under its own on-chain mandate: sourcing buys upstream data, support refunds
 * customers, treasury moves earnings to Airwallex and pays a EUR licence fee. Every price, budget and
 * the licence fee live here, in code, in whole cents. The model only weighs trade-offs.
 */

export type AgentRole = "sourcing" | "support" | "treasury"
export const AGENT_ROLES: readonly AgentRole[] = ["sourcing", "support", "treasury"]

/** Mandate terms in whole cents of *USDZ (mandates pay whole cents only). */
export interface MandateTerms {
  capCents: number
  budgetCents: number
  /** Allowed payees. Empty = any address (the support agent refunds any buyer). */
  payees: string[]
}

export type Allocation = Record<AgentRole, MandateTerms>

export interface Kit11Config {
  /** The most the three budgets may add up to. The account caps each budget, not the sum. */
  totalBudgetCents: number
  queryPriceCents: number
  upstreamPriceCents: number
  raisedUpstreamPriceCents: number
  /** Monthly licence fee, invoiced in EUR (major units, Airwallex convention). */
  licenceFeeEur: string
  /** Margin the business wants to keep per query when deciding whether to raise its price. */
  targetMarginCents: number
}

export const KIT11: Kit11Config = {
  totalBudgetCents: 2000,
  queryPriceCents: 5,
  upstreamPriceCents: 2,
  raisedUpstreamPriceCents: 4,
  licenceFeeEur: "25.00",
  targetMarginCents: 3,
}

export function initialAllocation(addresses: { upstream: string; bridge: string }): Allocation {
  return {
    sourcing: { capCents: 3, budgetCents: 1000, payees: [addresses.upstream] },
    support: { capCents: 25, budgetCents: 400, payees: [] },
    treasury: { capCents: 600, budgetCents: 600, payees: [addresses.bridge] },
  }
}

export function sumBudgets(a: Allocation): number {
  return AGENT_ROLES.reduce((s, r) => s + a[r].budgetCents, 0)
}

/** "0.04" for 4 cents. Mandate CLI amounts are decimal *USDZ to the cent. */
export function centsToUsdz(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`bad cents ${cents}`)
  const whole = Math.floor(cents / 100)
  const frac = String(cents % 100).padStart(2, "0")
  return `${whole}.${frac}`
}

/** Parses "4", "0.04", "4 *USDZ" into cents; throws on sub-cent precision. */
export function usdzToCents(value: string): number {
  const m = /^\s*(\d+)(?:\.(\d{1,18}))?/.exec(value)
  if (!m) throw new Error(`bad *USDZ amount ${value}`)
  const frac = (m[2] ?? "").padEnd(2, "0")
  if (/[1-9]/.test(frac.slice(2))) throw new Error(`sub-cent *USDZ amount ${value}`)
  return Number(m[1]) * 100 + Number(frac.slice(0, 2))
}

export const METAL_TESTNET = {
  network: "eip155:63825",
  usdz: "0x000000000000000000000000000000000000B5d5",
  explorer: "https://testnet.metalntwx.com",
  facilitator: "https://x402-testnet.metalntwx.com/x402/facilitator",
} as const

export function explorerTx(hash: string): string {
  return `${METAL_TESTNET.explorer}/tx/${hash}`
}
