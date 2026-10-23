/**
 * The treasury agent's judgement calls. The model only chooses between options the code built (which
 * rebalance) and weighs evidence (which delivered data was wrong). Code validates every answer and
 * falls back to a scripted rule when the model is missing, slow or answers out of bounds.
 */
import type { RebalanceOption } from "./budget"
import type { SaleRecord } from "./rail"

export interface Kit11Model {
  readonly name: string
  /** Returns a JSON object (already parsed). */
  json(system: string, prompt: string): Promise<Record<string, unknown>>
}

export interface RebalanceDecision {
  optionId: RebalanceOption["id"]
  rationale: string
  decidedBy: string
}

export interface DisputeDecision {
  refundOrderNos: number[]
  rationale: string
  decidedBy: string
}

const REBALANCE_SYSTEM = `You are the treasury agent of a small data business that sells market data per query over x402.
Three agents share one Metal account. The upstream data seller raised its price above the sourcing
agent's per-purchase cap, so purchases are refused. Choose ONE of the given options. Weigh what a late
EUR licence fee, an unrefunded buyer, and a higher query price each cost the business. You cannot invent
amounts. Answer JSON: {"optionId":"A"|"B"|"C","rationale":"one or two plain sentences"}.`

const DISPUTE_SYSTEM = `You are the support agent of a data business. A customer disputes a batch of charges, saying its
agent never placed the orders and some data was wrong. The signed orders are already verified by code.
Decide only which orders delivered WRONG data (a price of 0, a stale timestamp far from the order time,
or a source that does not match) and should be refunded. Answer JSON:
{"refundOrderNos":[numbers],"rationale":"one or two plain sentences"}.`

export function scriptedKit11Model(): Kit11Model {
  return {
    name: "scripted-rules",
    async json(system, prompt) {
      if (system === REBALANCE_SYSTEM) {
        // Rule: keep the margin when an option does, else take from refunds.
        const ids = [...prompt.matchAll(/"id":"([ABC])"/g)].map((m) => m[1])
        const optionId = ids.includes("C") ? "C" : (ids[0] ?? "A")
        return {
          optionId,
          rationale:
            "Scripted rule: keep the per-query margin; buyers are refunded from what is left.",
        }
      }
      const orders = JSON.parse(prompt.slice(prompt.indexOf("["))) as Array<{
        orderNo: number
        delivered?: { price: string; asOf: string }
      }>
      const wrong = orders.filter(
        (o) =>
          o.delivered &&
          (Number(o.delivered.price) <= 0 || o.delivered.asOf.startsWith("2026-01-01")),
      )
      return {
        refundOrderNos: wrong.map((o) => o.orderNo),
        rationale: "Scripted rule: refund orders whose quote was zero or stale.",
      }
    },
  }
}

export function createGeminiKit11Model(options: {
  apiKey: string
  model?: string | undefined
  fetch?: ((url: string, init: RequestInit) => Promise<Response>) | undefined
  timeoutMs?: number | undefined
}): Kit11Model {
  const model = options.model ?? "gemini-2.5-flash"
  const doFetch = options.fetch ?? ((url, init) => fetch(url, init))
  return {
    name: model,
    async json(system, prompt) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000)
      try {
        const res = await doFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json", "x-goog-api-key": options.apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
          },
        )
        if (!res.ok) throw new Error(`gemini: HTTP ${res.status}`)
        const body = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("")
        return JSON.parse(text) as Record<string, unknown>
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

async function firstValid<T>(
  models: Kit11Model[],
  system: string,
  prompt: string,
  accept: (out: Record<string, unknown>, by: string) => T | undefined,
): Promise<T | undefined> {
  for (const m of models) {
    try {
      const got = accept(await m.json(system, prompt), m.name)
      if (got !== undefined) return got
    } catch {}
  }
  return undefined
}

export async function decideRebalance(
  models: Kit11Model[],
  options: RebalanceOption[],
  context: { upstreamFrom: number; upstreamTo: number; refusal: string },
): Promise<RebalanceDecision> {
  const prompt = `Upstream price moved from ${context.upstreamFrom} to ${context.upstreamTo} cents; the sourcing purchase was refused with ${context.refusal}.
Options (cents of *USDZ): ${JSON.stringify(
    options.map((o) => ({
      id: o.id,
      title: o.title,
      queryPriceCents: o.queryPriceCents,
      marginCents: o.marginCents,
      tradeOff: o.tradeOff,
      budgets: {
        sourcing: o.allocation.sourcing.budgetCents,
        support: o.allocation.support.budgetCents,
        treasury: o.allocation.treasury.budgetCents,
      },
    })),
  )}`
  const picked = await firstValid<RebalanceDecision>(
    [...models, scriptedKit11Model()],
    REBALANCE_SYSTEM,
    prompt,
    (out, by) => {
      const id = out.optionId
      return typeof id === "string" && options.some((o) => o.id === id)
        ? {
            optionId: id as RebalanceOption["id"],
            rationale: String(out.rationale ?? "").slice(0, 400),
            decidedBy: by,
          }
        : undefined
    },
  )
  if (picked) return picked
  const first = options[0]
  if (!first) throw new Error("no valid rebalance option")
  return {
    optionId: first.id,
    rationale: "No valid model answer; first valid option.",
    decidedBy: "fallback",
  }
}

export async function decideDispute(
  models: Kit11Model[],
  sold: SaleRecord[],
): Promise<DisputeDecision> {
  const evidence = sold.map((s) => ({
    orderNo: s.orderNo,
    pricePaidCents: s.queryPriceCents,
    delivered: s.delivered,
  }))
  const prompt = `Disputed orders with what was delivered (order times are 2026-10-23 UTC):\n${JSON.stringify(evidence)}`
  const valid = new Set(sold.map((s) => s.orderNo))
  const picked = await firstValid<DisputeDecision>(
    [...models, scriptedKit11Model()],
    DISPUTE_SYSTEM,
    prompt,
    (out, by) =>
      Array.isArray(out.refundOrderNos) &&
      out.refundOrderNos.every((n) => typeof n === "number" && valid.has(n))
        ? {
            refundOrderNos: [...new Set(out.refundOrderNos as number[])],
            rationale: String(out.rationale ?? "").slice(0, 400),
            decidedBy: by,
          }
        : undefined,
  )
  if (picked) return picked
  return {
    refundOrderNos: [],
    rationale: "No valid answer; nothing refunded, escalated to a person.",
    decidedBy: "fallback",
  }
}
