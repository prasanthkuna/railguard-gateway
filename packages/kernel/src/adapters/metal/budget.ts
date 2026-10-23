import { createHash } from "node:crypto"
import { AGENT_ROLES, type AgentRole, type Allocation, type Kit11Config, sumBudgets } from "./kit11"
import { canonicalJson } from "./requestId"

export type SpentByRole = Record<AgentRole, number>

export interface AllocationCheck {
  ok: boolean
  errors: string[]
}

/**
 * The account enforces each mandate on chain, but not their sum, so Railguard holds the total here.
 * A replacement carries what the agent already spent, so its budget must be above that.
 */
export function validateAllocation(
  next: Allocation,
  spent: SpentByRole,
  config: Pick<Kit11Config, "totalBudgetCents">,
  needs: { sourcingCapAtLeast?: number; supportCapAtLeast?: number } = {},
): AllocationCheck {
  const errors: string[] = []
  const total = sumBudgets(next)
  if (total > config.totalBudgetCents) {
    errors.push(`budgets add up to ${total} cents, above the ${config.totalBudgetCents} cent total`)
  }
  for (const role of AGENT_ROLES) {
    const t = next[role]
    if (!Number.isInteger(t.capCents) || !Number.isInteger(t.budgetCents)) {
      errors.push(`${role}: mandates pay whole cents only`)
      continue
    }
    if (t.capCents < 1) errors.push(`${role}: cap must be at least 1 cent`)
    if (t.capCents > t.budgetCents)
      errors.push(`${role}: cap ${t.capCents} above budget ${t.budgetCents}`)
    if (t.budgetCents <= spent[role]) {
      errors.push(
        `${role}: budget ${t.budgetCents} must be above the ${spent[role]} cents already spent`,
      )
    }
  }
  if (needs.sourcingCapAtLeast !== undefined && next.sourcing.capCents < needs.sourcingCapAtLeast) {
    errors.push(
      `sourcing: cap ${next.sourcing.capCents} is below the upstream price ${needs.sourcingCapAtLeast}`,
    )
  }
  if (needs.supportCapAtLeast !== undefined && next.support.capCents < needs.supportCapAtLeast) {
    errors.push(
      `support: cap ${next.support.capCents} cannot refund one query (${needs.supportCapAtLeast})`,
    )
  }
  if (next.support.payees.length > 0)
    errors.push("support: payees must stay open to refund any buyer")
  if (next.sourcing.payees.length === 0) errors.push("sourcing: payees must be listed")
  if (next.treasury.payees.length === 0) errors.push("treasury: payees must be listed")
  return { ok: errors.length === 0, errors }
}

export interface RebalanceOption {
  id: "A" | "B" | "C"
  title: string
  allocation: Allocation
  queryPriceCents: number
  marginCents: number
  /** What the business gives up, for the model to weigh. */
  tradeOff: string
}

function cloneAllocation(a: Allocation): Allocation {
  return {
    sourcing: { ...a.sourcing, payees: [...a.sourcing.payees] },
    support: { ...a.support, payees: [...a.support.payees] },
    treasury: { ...a.treasury, payees: [...a.treasury.payees] },
  }
}

/**
 * The upstream price rose past the sourcing cap. Deterministic options, all inside the total; the
 * treasury agent picks one (or none) and a person approves the exact terms.
 */
export function rebalanceOptions(
  current: Allocation,
  spent: SpentByRole,
  config: Kit11Config,
  newUpstreamCents: number,
  queryPriceCents: number,
): RebalanceOption[] {
  // Keep the same number of purchases the sourcing budget was sized for.
  const purchases = Math.floor(current.sourcing.budgetCents / config.upstreamPriceCents)
  const extraNeeded = Math.max(0, purchases * (newUpstreamCents - config.upstreamPriceCents))
  const shift = Math.min(extraNeeded, 200)

  const a = cloneAllocation(current)
  a.sourcing.capCents = newUpstreamCents
  a.sourcing.budgetCents += shift
  a.support.budgetCents -= shift

  const b = cloneAllocation(current)
  b.sourcing.capCents = newUpstreamCents
  b.sourcing.budgetCents += shift
  b.treasury.budgetCents -= shift
  b.treasury.capCents = Math.min(b.treasury.capCents, b.treasury.budgetCents)

  const raisedPrice = newUpstreamCents + config.targetMarginCents
  const c = cloneAllocation(current)
  c.sourcing.capCents = newUpstreamCents
  c.sourcing.budgetCents += shift / 2
  c.support.budgetCents -= shift / 2
  c.support.capCents = Math.max(c.support.capCents, raisedPrice)

  const options: RebalanceOption[] = [
    {
      id: "A",
      title: `Move ${shift} cents from refunds to sourcing`,
      allocation: a,
      queryPriceCents,
      marginCents: queryPriceCents - newUpstreamCents,
      tradeOff: "Less room to refund buyers this month; margin per query drops.",
    },
    {
      id: "B",
      title: `Move ${shift} cents from the licence-fee budget to sourcing`,
      allocation: b,
      queryPriceCents,
      marginCents: queryPriceCents - newUpstreamCents,
      tradeOff: "Less earnings moved to Airwallex; the EUR licence fee may be paid late.",
    },
    {
      id: "C",
      title: `Raise the query price to ${raisedPrice} cents and move ${shift / 2} cents from refunds`,
      allocation: c,
      queryPriceCents: raisedPrice,
      marginCents: raisedPrice - newUpstreamCents,
      tradeOff: "Keeps the margin, but buyers pay more and some may leave.",
    },
  ]
  return options.filter(
    (o) =>
      validateAllocation(o.allocation, spent, config, {
        sourcingCapAtLeast: newUpstreamCents,
        supportCapAtLeast: o.queryPriceCents,
      }).ok,
  )
}

/** The approval is bound to the exact terms shown to the approver. */
export function approvalHash(allocation: Allocation, queryPriceCents: number): string {
  return `apr_${createHash("sha256")
    .update(canonicalJson({ allocation, queryPriceCents }))
    .digest("hex")
    .slice(0, 24)}`
}

/**
 * Roles whose mandate must be replaced to move from `from` to `to`, shrinking budgets first so the
 * sum never goes above the total between two replace transactions.
 */
export function changedRoles(from: Allocation, to: Allocation): AgentRole[] {
  return AGENT_ROLES.filter((r) => canonicalJson(from[r]) !== canonicalJson(to[r])).sort(
    (x, y) => to[x].budgetCents - from[x].budgetCents - (to[y].budgetCents - from[y].budgetCents),
  )
}
