/**
 * Agent budget ledger in integer cents. A reservation is made before PayPal is called and is only
 * released when PayPal proves no money moved. UNKNOWN freezes the reservation (INV-005): frozen money
 * still counts as spent, so an agent cannot "retry around" an unknown payout.
 */
export type ReservationState = "RESERVED" | "FROZEN" | "COMMITTED" | "RELEASED"

export interface BudgetReservation {
  intentId: string
  amountCents: number
  state: ReservationState
  day: string
  updatedAt: string
  reason?: string | undefined
}

export interface BudgetLedger {
  readonly dailyLimitCents: number
  reserve(intentId: string, amountCents: number): BudgetReservation
  freeze(intentId: string, reason: string): BudgetReservation | undefined
  commit(intentId: string): BudgetReservation | undefined
  release(intentId: string, reason: string): BudgetReservation | undefined
  get(intentId: string): BudgetReservation | undefined
  /** Cents held today by RESERVED + FROZEN + COMMITTED reservations. */
  usedCents(): number
  availableCents(): number
  list(): BudgetReservation[]
}

export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100)
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function createBudgetLedger(options: {
  dailyLimitCents: number
  now?: () => Date
}): BudgetLedger {
  const now = options.now ?? (() => new Date())
  const rows = new Map<string, BudgetReservation>()
  const day = () => now().toISOString().slice(0, 10)

  function patch(intentId: string, next: Partial<BudgetReservation>) {
    const row = rows.get(intentId)
    if (!row) return undefined
    // COMMITTED and RELEASED are terminal for budget purposes.
    if (row.state === "COMMITTED" || row.state === "RELEASED") return row
    const updated = { ...row, ...next, updatedAt: now().toISOString() }
    rows.set(intentId, updated)
    return updated
  }

  const used = () => {
    let total = 0
    for (const r of rows.values())
      if (r.day === day() && r.state !== "RELEASED") total += r.amountCents
    return total
  }

  return {
    dailyLimitCents: options.dailyLimitCents,
    reserve(intentId, amountCents) {
      const existing = rows.get(intentId)
      if (existing && existing.state !== "RELEASED") return existing
      const row: BudgetReservation = {
        intentId,
        amountCents,
        state: "RESERVED",
        day: day(),
        updatedAt: now().toISOString(),
      }
      rows.set(intentId, row)
      return row
    },
    freeze: (intentId, reason) => patch(intentId, { state: "FROZEN", reason }),
    commit: (intentId) => patch(intentId, { state: "COMMITTED", reason: undefined }),
    release: (intentId, reason) => patch(intentId, { state: "RELEASED", reason }),
    get: (intentId) => rows.get(intentId),
    usedCents: used,
    availableCents: () => options.dailyLimitCents - used(),
    list: () => [...rows.values()].map((r) => ({ ...r })),
  }
}
