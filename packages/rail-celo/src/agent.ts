/**
 * Due-diligence buyer agent: before a business pays a supplier, the agent buys small paid checks
 * (FX quote, address risk) from x402 services on Celo Sepolia. The model chooses what to buy;
 * Railguard decides whether it may pay, signs, and verifies settlement on-chain.
 */
import {
  type AgentMessage,
  type AgentModelReply,
  type PaymentOpsModel,
  type PaymentOpsToolbox,
  toGeminiContents,
} from "@railguard/kernel/airwallex"
import { atomicToUsdc } from "./chain"
import type { CeloX402Rail } from "./rail"

export interface CeloService {
  id: string
  name: string
  url: string
  priceHint: string
  seller: string
}

export const CELO_AGENT_SYSTEM_PROMPT = [
  "You are a due-diligence agent for a small business that pays suppliers in stablecoins on Celo.",
  "Before a supplier is paid you buy small paid checks from x402 services: an FX quote and an address risk score.",
  "Call list_services, then buy_service with a service_id and a short task id. Railguard checks policy, signs the payment and verifies it on Celo. If a purchase is DENIED, say why in one sentence and do not try to get around it (no other seller for the same thing unless the user asks, never ask to use mainnet).",
  "If a payment is UNKNOWN or BLOCKED_DUPLICATE, never buy it again; call reconcile_payment with its execution_id.",
  "Report results in one line each. Use CONFIRMED for payments verified on-chain; never say settled.",
].join(" ")

export const CELO_AGENT_TOOLS = [
  {
    name: "list_services",
    description: "List x402 services this agent may consider (id, name, seller, price hint).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "buy_service",
    description:
      "Call a paid x402 service. Railguard enforces testnet-only, ERC-8004 payee identity, per-call cap and daily budget.",
    parameters: {
      type: "object",
      properties: {
        service_id: { type: "string" },
        task: {
          type: "string",
          description:
            "Short task id, e.g. supplier-check-1; the same task + service is one payment intent",
        },
        query: { type: "string", description: "Optional query, e.g. the supplier address" },
      },
      required: ["service_id", "task"],
    },
  },
  {
    name: "reconcile_payment",
    description: "Reconcile an UNKNOWN payment by its on-chain request id (EIP-3009 nonce).",
    parameters: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
    },
  },
  {
    name: "budget_status",
    description: "Payments made and their states.",
    parameters: { type: "object", properties: {} },
  },
] as const

function view(a: ReturnType<CeloX402Rail["listAttempts"]>[number] | undefined) {
  if (!a) return {}
  return {
    execution_id: a.executionId,
    status: a.state,
    amount_usdc: atomicToUsdc(BigInt(a.amount)),
    pay_to: a.payTo,
    seller_agent_id: a.sellerAgentId,
    nonce: a.nonce,
    tx: a.txHash,
    finality: a.verify?.finality,
    paid_requests: a.paidRequests,
    replays: a.replays,
  }
}

export function createCeloToolbox(deps: {
  rail: CeloX402Rail
  services: CeloService[]
}): PaymentOpsToolbox {
  const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "")
  return {
    async run(call) {
      const args = call.args ?? {}
      switch (call.name) {
        case "list_services":
          return {
            services: deps.services.map(({ id, name, seller, priceHint }) => ({
              id,
              name,
              seller,
              price_hint: priceHint,
            })),
          }
        case "buy_service": {
          const svc = deps.services.find((s) => s.id === str(args.service_id))
          if (!svc) return { status: "NOT_FOUND", service_id: str(args.service_id) }
          const task = str(args.task) || "task"
          const url = new URL(svc.url)
          if (str(args.query)) url.searchParams.set("q", str(args.query))
          const intentId = `${task}:${svc.id}`.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 80)
          const out = await deps.rail.pay({
            url: url.toString(),
            intentId,
            purpose: `${task} via ${svc.name}`,
          })
          if (out.status === "DENIED")
            return {
              service_id: svc.id,
              status: "DENIED",
              code: out.code,
              reason: out.reason,
              next_step: out.nextStep,
            }
          if (out.status === "FREE") return { service_id: svc.id, status: "FREE" }
          if (out.status === "BLOCKED_DUPLICATE") {
            return {
              service_id: svc.id,
              ...view(out.attempt),
              status: "BLOCKED_DUPLICATE",
              first_attempt: out.attempt.state,
            }
          }
          const a = "attempt" in out ? out.attempt : undefined
          return { service_id: svc.id, ...view(a), data: (out as { body?: unknown }).body }
        }
        case "reconcile_payment": {
          const a = await deps.rail.reconcile(str(args.execution_id))
          return { ...view(a), via: a.txHash ? "eip3009_nonce_on_chain" : "pending" }
        }
        case "budget_status":
          return { payments: deps.rail.listAttempts().map(view) }
        default:
          return { status: "UNKNOWN_TOOL", tool: call.name }
      }
    },
  }
}

function lastResults(history: AgentMessage[]) {
  const last = history[history.length - 1]
  return last?.role === "tool" ? last.results : null
}

function priorBuy(history: AgentMessage[], serviceId: string) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i]
    if (m?.role === "model") {
      const c = m.calls.find((x) => x.name === "buy_service" && x.args.service_id === serviceId)
      if (c) return c.args
    }
  }
  return null
}

function line(r: Record<string, unknown>) {
  const id = String(r.service_id ?? r.execution_id)
  if (r.status === "DENIED") return `${id}: NOT PAID (${String(r.code)}). ${String(r.reason)}`
  if (r.status === "CONFIRMED")
    return `${id}: paid ${String(r.amount_usdc)} USDC, CONFIRMED, settlement verified on-chain (tx ${String(r.tx)}, ${String(r.finality)}).`
  if (r.status === "UNKNOWN")
    return `${id}: UNKNOWN. The payment was signed but no answer came back; budget frozen, will reconcile.`
  if (r.status === "BLOCKED_DUPLICATE") return `${id}: second payment BLOCKED by Railguard.`
  return `${id}: ${String(r.status)}.`
}

/** Deterministic offline model with the same tool contract as the LLM. */
export function createScriptedCeloModel(): PaymentOpsModel {
  return {
    name: "scripted-offline",
    async next(history): Promise<AgentModelReply> {
      const results = lastResults(history)
      const lastUser = [...history].reverse().find((m) => m.role === "user")
      const text = lastUser?.role === "user" ? lastUser.text : ""
      const supplier = text.match(/0x[0-9a-fA-F]{40}/)?.[0]
      const task = text.match(/task\s+([\w-]+)/i)?.[1] ?? "supplier-check-1"
      if (!results) {
        if (/retry|again/i.test(text)) {
          const sid = /risk/i.test(text) ? "risk-score" : "fx-usd-brl"
          const args = priorBuy(history, sid)
          if (args) return { calls: [{ name: "buy_service", args }] }
        }
        if (/full|report/i.test(text))
          return { calls: [{ name: "buy_service", args: { service_id: "full-report", task } }] }
        if (/fastfx|mirror|cheaper/i.test(text))
          return { calls: [{ name: "buy_service", args: { service_id: "fastfx-usd-brl", task } }] }
        if (/mainnet|premium/i.test(text))
          return { calls: [{ name: "buy_service", args: { service_id: "premium-mainnet", task } }] }
        if (/quote only|fx only/i.test(text))
          return { calls: [{ name: "buy_service", args: { service_id: "fx-usd-brl", task } }] }
        if (/check|supplier|quote|risk/i.test(text))
          return { calls: [{ name: "list_services", args: {} }] }
        return { text: "I can buy an FX quote or a risk score for a supplier check.", calls: [] }
      }
      const first = results[0]
      if (first?.name === "list_services") {
        return {
          calls: [
            { name: "buy_service", args: { service_id: "fx-usd-brl", task } },
            {
              name: "buy_service",
              args: { service_id: "risk-score", task, ...(supplier ? { query: supplier } : {}) },
            },
          ],
        }
      }
      if (first?.name === "buy_service") {
        const blocked = results.map((r) => r.result).filter((r) => r.status === "BLOCKED_DUPLICATE")
        if (blocked.length)
          return {
            calls: blocked.map((r) => ({
              name: "reconcile_payment",
              args: { execution_id: r.execution_id },
            })),
          }
        return { text: results.map((r) => line(r.result)).join("\n"), calls: [] }
      }
      if (first?.name === "reconcile_payment") {
        return {
          text: results
            .map((r) => {
              const o = r.result
              return `Reconciled ${String(o.execution_id)} by its EIP-3009 nonce: USDC shows the authorization was used once, in tx ${String(o.tx)}. Status ${String(o.status)}. One payment, not two.`
            })
            .join("\n"),
          calls: [],
        }
      }
      return { text: results.map((r) => line(r.result)).join("\n"), calls: [] }
    },
  }
}

type GeminiPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }

export function createGeminiCeloModel(options: {
  apiKey: string
  model?: string | undefined
  timeoutMs?: number | undefined
  fetch?: typeof fetch | undefined
}): PaymentOpsModel {
  const model = options.model ?? "gemini-2.5-flash"
  const doFetch = options.fetch ?? fetch
  return {
    name: model,
    async next(history) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000)
      try {
        const res = await doFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json", "x-goog-api-key": options.apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: CELO_AGENT_SYSTEM_PROMPT }] },
              contents: toGeminiContents(history),
              tools: [{ functionDeclarations: CELO_AGENT_TOOLS }],
              generationConfig: { temperature: 0 },
            }),
          },
        )
        if (!res.ok) throw new Error(`gemini: HTTP ${res.status}`)
        const body = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
        }
        const parts = body.candidates?.[0]?.content?.parts ?? []
        return {
          text: parts
            .filter((p) => typeof p.text === "string")
            .map((p) => p.text)
            .join(""),
          calls: parts
            .filter((p) => p.functionCall?.name)
            .map((p) => ({ name: p.functionCall?.name ?? "", args: p.functionCall?.args ?? {} })),
          raw: parts,
        }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

export function createCeloAgentModel(env: {
  GEMINI_API_KEY?: string | undefined
  CELO_AGENT_MODEL?: string | undefined
}): PaymentOpsModel {
  const scripted = createScriptedCeloModel()
  const chain = env.GEMINI_API_KEY
    ? [...new Set([env.CELO_AGENT_MODEL || "gemini-2.5-flash", "gemini-2.5-flash"])].map((m) =>
        createGeminiCeloModel({
          apiKey: env.GEMINI_API_KEY as string,
          model: m,
          timeoutMs: 25_000,
        }),
      )
    : []
  const used = new Set<string>()
  // A model that failed once is skipped for the rest of the run, so a blocked network costs one timeout, not one per turn.
  const dead = new Set<string>()
  return {
    get name() {
      return used.size ? [...used].join("+") : (chain[0]?.name ?? scripted.name)
    },
    async next(history) {
      for (const m of chain) {
        if (dead.has(m.name)) continue
        try {
          const r = await m.next(history)
          used.add(m.name)
          return r
        } catch (error) {
          dead.add(m.name)
          console.error(
            `[agent] ${m.name} failed (${error instanceof Error ? error.message : String(error)}); falling back`,
          )
        }
      }
      used.add(scripted.name)
      return scripted.next(history.map((h) => (h.role === "model" ? { ...h, raw: undefined } : h)))
    },
  }
}
