/** Plain-language labels paired with internal enums (operator UI). */

const STATUS_PLAIN: Record<string, string> = {
  AWAITING_BROADCAST: "waiting for wallet transaction",
  SUBMITTED: "transaction submitted — outcome uncertain",
  SETTLED: "matching transfer verified",
  FAILED: "verification or execution failed",
  DENIED: "policy denied before broadcast",
  REVERTED: "on-chain revert observed",
  UNKNOWN: "broadcast state unknown — reconcile required",
}

export function formatExecutionStatus(status: string): string {
  const plain = STATUS_PLAIN[status]
  return plain ? `${status} — ${plain}` : status
}

export function formatRailLabel(rail?: string | null): string {
  if (!rail) return "—"
  if (rail === "arbitrum-sepolia") return "Arbitrum Sepolia (421614)"
  return rail
}

export function formatUsdcAmount(baseUnits: string | number | undefined): string | null {
  if (baseUnits === undefined || baseUnits === "") return null
  const n = typeof baseUnits === "string" ? baseUnits.replace(/,/g, "") : String(baseUnits)
  if (n === "10000") return "0.01 USDC · 10,000 base units"
  return `${n} base units`
}
