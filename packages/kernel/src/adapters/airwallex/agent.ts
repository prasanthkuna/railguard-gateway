/**
 * Payment-ops agent. The model plans; Railguard executes. Every money action goes through the policy
 * guard and the incident commander; the agent never holds Airwallex credentials or calls Airwallex.
 *
 * Models:
 *  - createScriptedPaymentOpsModel(): deterministic, offline (tests, public demo, no keys).
 *  - createGeminiPaymentOpsModel(): Gemini function calling over REST (GEMINI_API_KEY).
 */
import type { IncidentCommander, PayoutIncident } from "./incidentCommander"
import type { PayoutPolicyGuard } from "./policy"
import type { AirwallexExecutionRail } from "./rail"

export const DEFAULT_GEMINI_AGENT_MODEL = "gemini-3.8-flash"

export type AgentToolName = "create_payout" | "get_transfer" | "reconcile" | "list_incidents"

export interface AgentToolCall {
  name: AgentToolName | string
  args: Record<string, unknown>
}

export interface AgentToolResult {
  name: string
  result: Record<string, unknown>
}

export type AgentMessage =
  | { role: "user"; text: string }
  | {
      role: "model"
      text?: string | undefined
      calls: AgentToolCall[]
      raw?: unknown[] | undefined
    }
  | { role: "tool"; results: AgentToolResult[] }

export interface AgentModelReply {
  text?: string | undefined
  calls: AgentToolCall[]
  /** Provider parts echoed back verbatim on the next turn (Gemini thought signatures). */
  raw?: unknown[] | undefined
}

export interface PaymentOpsModel {
  readonly name: string
  next(history: AgentMessage[]): Promise<AgentModelReply>
}

export interface AgentTranscriptStep {
  kind: "user" | "agent" | "tool_call" | "tool_result" | "system"
  text?: string | undefined
  tool?: string | undefined
  args?: Record<string, unknown> | undefined
  result?: Record<string, unknown> | undefined
}

export const PAYMENT_OPS_SYSTEM_PROMPT = [
  "You are a payment operations agent for a business paying suppliers through Airwallex.",
  "Use the tools to act. You never see bank details or API keys; payees are resolved by name.",
  "create_payout returns a structured decision. If it is DENIED, explain the reason and the next step in one or two sentences and stop. Never change the amount, payee or invoice to get around a policy.",
  "If a payout is UNKNOWN or BLOCKED_DUPLICATE, do not create a new payout. Call reconcile with the incident_id, then get_transfer, and report the result.",
  "Keep replies short and factual. Use the words CONFIRMED or PENDING for status; never say settled.",
].join(" ")

export const PAYMENT_OPS_TOOLS = [
  {
    name: "create_payout",
    description:
      "Request a supplier payout. Railguard checks policy (caps, new-payee hold, human approval) and sends it to Airwallex with a deterministic request_id.",
    parameters: {
      type: "object",
      properties: {
        payee: { type: "string", description: "Payee name, e.g. Acme Supplies" },
        amount: { type: "string", description: "Decimal amount, e.g. 1200.00" },
        currency: { type: "string", description: "ISO currency, default USD" },
        invoice: { type: "string", description: "Invoice number or reference" },
      },
      required: ["payee", "amount", "invoice"],
    },
  },
  {
    name: "get_transfer",
    description:
      "Get the current status of a payout. Pass the execution_id from create_payout (a transfer_id or request_id also works).",
    parameters: {
      type: "object",
      properties: {
        execution_id: { type: "string" },
        transfer_id: { type: "string" },
        request_id: { type: "string" },
      },
    },
  },
  {
    name: "reconcile",
    description:
      "Reconcile an open payout incident by request_id at Airwallex. Adopts an existing transfer instead of creating a new one.",
    parameters: {
      type: "object",
      properties: { incident_id: { type: "string" } },
      required: ["incident_id"],
    },
  },
  {
    name: "list_incidents",
    description: "List payout incidents (UNKNOWN, stuck, mismatched) and their status.",
    parameters: { type: "object", properties: {} },
  },
] as const

function incidentSummary(incident: PayoutIncident) {
  return {
    incident_id: incident.id,
    execution_id: incident.executionId,
    kind: incident.kind,
    status: incident.status,
    label: incident.label,
    request_id: incident.requestId,
    transfer_id: incident.transferId,
    create_calls: incident.createCalls,
    retries_blocked: incident.retriesBlocked,
  }
}

export interface PaymentOpsToolbox {
  run(call: AgentToolCall): Promise<Record<string, unknown>>
}

/** The only door from the model to money. Arguments outside the schema are ignored. */
export function createPaymentOpsToolbox(deps: {
  guard: PayoutPolicyGuard
  commander: IncidentCommander
  rail: AirwallexExecutionRail
}): PaymentOpsToolbox {
  const { guard, commander, rail } = deps
  const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "")

  return {
    async run(call) {
      const args = call.args ?? {}
      switch (call.name) {
        case "create_payout": {
          const decision = guard.evaluate({
            payee: str(args.payee),
            amount: str(args.amount),
            currency: str(args.currency) || "USD",
            invoice: str(args.invoice),
          })
          if (!decision.allow) {
            return {
              status: "DENIED",
              code: decision.code,
              reason: decision.reason,
              next_step: decision.nextStep,
              approval_key: decision.approvalKey,
              limit: decision.limit,
              used: decision.used,
              requested: decision.requested,
              policy_version: decision.policyVersion,
            }
          }
          const result = await commander.pay(decision.intent, decision.grant)
          const attempt = rail.getAttempt(result.executionId)
          if (result.outcome === "REJECTED") guard.release(decision.intent.id)
          const base = {
            execution_id: result.executionId,
            request_id: attempt?.requestId,
            transfer_id: attempt?.transferId,
            create_calls: attempt?.createCalls,
            approved_by: decision.approvedBy,
          }
          switch (result.outcome) {
            case "SUBMITTED":
              return { status: "SUBMITTED", ...base, airwallex_status: attempt?.airwallexStatus }
            case "UNKNOWN":
              return {
                status: "UNKNOWN",
                ...base,
                incident_id: result.incident?.id,
                message:
                  "Create call timed out. The transfer may exist. Payout is UNKNOWN; do not create another, reconcile.",
              }
            case "BLOCKED_DUPLICATE":
              return {
                status: "BLOCKED_DUPLICATE",
                ...base,
                incident_id: result.incident?.id,
                reason: `Railguard refused a second payout for this invoice (first attempt is ${attempt?.state}). No new Airwallex transfer was created.`,
              }
            default:
              return { status: "REJECTED", ...base, error: attempt?.lastError }
          }
        }
        case "get_transfer": {
          // Accept an execution_id, transfer_id or request_id: models mix them up.
          const ref = str(args.execution_id) || str(args.transfer_id) || str(args.request_id)
          const attempt =
            rail.getAttempt(ref) ??
            rail.listAttempts().find((a) => a.transferId === ref || a.requestId === ref)
          if (!attempt) return { status: "NOT_FOUND", reference: ref }
          const executionId = attempt.executionId
          const incident = commander.list().find((i) => i.executionId === executionId)
          if (incident && incident.status === "OPEN" && attempt.transferId) {
            await commander.refresh(incident.id)
          }
          const now = rail.getAttempt(executionId) ?? attempt
          return {
            status: now.state,
            execution_id: executionId,
            request_id: now.requestId,
            transfer_id: now.transferId,
            airwallex_status: now.airwallexStatus,
            create_calls: now.createCalls,
          }
        }
        case "reconcile": {
          const incidentId = str(args.incident_id)
          if (!commander.get(incidentId)) return { status: "NOT_FOUND", incident_id: incidentId }
          const incident = await commander.reconcile(incidentId)
          return incidentSummary(incident)
        }
        case "list_incidents":
          return { incidents: commander.list().map(incidentSummary) }
        default:
          return { status: "UNKNOWN_TOOL", tool: call.name }
      }
    },
  }
}

export interface RunAgentOptions {
  model: PaymentOpsModel
  toolbox: PaymentOpsToolbox
  history: AgentMessage[]
  request: string
  maxSteps?: number | undefined
  transcript?: AgentTranscriptStep[] | undefined
}

/** One user turn: the model calls tools until it answers in text (or maxSteps). */
export async function runPaymentOpsAgent(options: RunAgentOptions): Promise<{
  reply: string
  history: AgentMessage[]
  transcript: AgentTranscriptStep[]
}> {
  const history = options.history
  const transcript = options.transcript ?? []
  history.push({ role: "user", text: options.request })
  transcript.push({ kind: "user", text: options.request })
  const maxSteps = options.maxSteps ?? 6
  for (let step = 0; step < maxSteps; step += 1) {
    const reply = await options.model.next(history)
    history.push({ role: "model", text: reply.text, calls: reply.calls, raw: reply.raw })
    if (reply.calls.length === 0) {
      const text = reply.text?.trim() || "(no reply)"
      transcript.push({ kind: "agent", text })
      return { reply: text, history, transcript }
    }
    const results: AgentToolResult[] = []
    for (const call of reply.calls) {
      transcript.push({ kind: "tool_call", tool: call.name, args: call.args })
      const result = await options.toolbox.run(call)
      transcript.push({ kind: "tool_result", tool: call.name, result })
      results.push({ name: call.name, result })
    }
    history.push({ role: "tool", results })
  }
  const text = "Stopping: step limit reached. Escalating to a human."
  transcript.push({ kind: "agent", text })
  return { reply: text, history, transcript }
}

const CCY = "USD|EUR|GBP|AUD|SGD|HKD|INR|CAD|JPY|CNY|NZD"
const PAY_RE = new RegExp(
  `pay\\s+(.+?)\\s+(?:(${CCY})\\s*)?\\$?\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:(${CCY})\\s+)?(?:for\\s+)?(?:invoice|inv)\\s*#?\\s*([\\w-]+)`,
  "i",
)

export function parsePayRequest(text: string) {
  const m = text.match(PAY_RE)
  if (!m) return null
  const currency = (m[2] ?? m[4] ?? "USD").toUpperCase()
  return {
    payee: (m[1] ?? "").trim(),
    amount: (m[3] ?? "").replace(/,/g, ""),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    invoice: m[5] ?? "",
  }
}

function lastTool(history: AgentMessage[]) {
  const last = history[history.length - 1]
  return last?.role === "tool" ? last.results : null
}

function lastPayArgs(history: AgentMessage[]): Record<string, unknown> | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i]
    if (m?.role === "model") {
      const call = m.calls.find((c) => c.name === "create_payout")
      if (call) return call.args
    }
  }
  return null
}

/**
 * Deterministic offline model. It behaves like an eager agent: on "try again" it re-sends the
 * same payout (the naive retry Railguard must block), then reconciles and reports.
 */
export function createScriptedPaymentOpsModel(): PaymentOpsModel {
  return {
    name: "scripted-offline",
    async next(history) {
      const results = lastTool(history)
      if (!results) {
        const last = history[history.length - 1]
        const text = last?.role === "user" ? last.text : ""
        const pay = parsePayRequest(text)
        if (pay) return { calls: [{ name: "create_payout", args: pay }] }
        if (/again|retry|resend/i.test(text)) {
          const args = lastPayArgs(history)
          if (args) return { calls: [{ name: "create_payout", args }] }
        }
        if (/incident|status|reconcile/i.test(text))
          return { calls: [{ name: "list_incidents", args: {} }] }
        return {
          text: "I can pay a supplier invoice, check a payout, or reconcile an incident.",
          calls: [],
        }
      }
      const r = results[0]
      const out = r?.result ?? {}
      if (r?.name === "create_payout") {
        if (out.status === "DENIED") {
          return { text: `Not paid: ${String(out.reason)} ${String(out.next_step)}`, calls: [] }
        }
        if (out.status === "UNKNOWN") {
          return {
            text: `The create call timed out, so the payout is UNKNOWN (incident ${String(out.incident_id)}). Railguard has frozen this invoice until it is reconciled.`,
            calls: [],
          }
        }
        if (out.status === "BLOCKED_DUPLICATE") {
          return { calls: [{ name: "reconcile", args: { incident_id: out.incident_id } }] }
        }
        if (out.status === "SUBMITTED") {
          return {
            text: `Payout sent to Airwallex as ${String(out.transfer_id)} (PENDING).`,
            calls: [],
          }
        }
        return {
          text: `Airwallex rejected the payout before sending: ${String(out.error)}.`,
          calls: [],
        }
      }
      if (r?.name === "reconcile") {
        const exec = [...history]
          .reverse()
          .flatMap((m) => (m.role === "tool" ? m.results : []))
          .find((x) => x.name === "create_payout")?.result.execution_id
        if (exec) return { calls: [{ name: "get_transfer", args: { execution_id: exec } }] }
        return { text: `Reconciled ${String(out.incident_id)}: ${String(out.label)}.`, calls: [] }
      }
      if (r?.name === "get_transfer") {
        const label = out.status === "CONFIRMED" ? "CONFIRMED" : "PENDING"
        return {
          text: `Railguard blocked a second payout for this invoice, and it was right: Airwallex already has transfer ${String(out.transfer_id)}. Status ${label}. Create calls: ${String(out.create_calls)}. One payment, not two.`,
          calls: [],
        }
      }
      if (r?.name === "list_incidents") {
        const list = (out.incidents as unknown[] | undefined) ?? []
        return { text: `${list.length} payout incident(s) on file.`, calls: [] }
      }
      return { text: "Done.", calls: [] }
    },
  }
}

type GeminiPart = {
  text?: string
  functionCall?: { name: string; args?: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
  thoughtSignature?: string
}

export function toGeminiContents(history: AgentMessage[]) {
  return history.map((m) => {
    if (m.role === "user") return { role: "user", parts: [{ text: m.text }] }
    if (m.role === "model") {
      const parts: GeminiPart[] = (m.raw as GeminiPart[] | undefined) ?? [
        ...(m.text ? [{ text: m.text }] : []),
        ...m.calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })),
      ]
      return { role: "model", parts }
    }
    return {
      role: "user",
      parts: m.results.map((r) => ({ functionResponse: { name: r.name, response: r.result } })),
    }
  })
}

export function createGeminiPaymentOpsModel(options: {
  apiKey: string
  model?: string | undefined
  fetch?: ((url: string, init: RequestInit) => Promise<Response>) | undefined
  timeoutMs?: number | undefined
}): PaymentOpsModel {
  const model = options.model ?? DEFAULT_GEMINI_AGENT_MODEL
  const doFetch = options.fetch ?? ((url, init) => fetch(url, init))
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
              systemInstruction: { parts: [{ text: PAYMENT_OPS_SYSTEM_PROMPT }] },
              contents: toGeminiContents(history),
              tools: [{ functionDeclarations: PAYMENT_OPS_TOOLS }],
            }),
          },
        )
        if (!res.ok) throw new Error(`gemini: HTTP ${res.status}`)
        const body = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
        }
        const parts = body.candidates?.[0]?.content?.parts ?? []
        const calls = parts
          .filter((p) => p.functionCall?.name)
          .map((p) => ({ name: p.functionCall?.name ?? "", args: p.functionCall?.args ?? {} }))
        const text = parts
          .filter((p) => typeof p.text === "string")
          .map((p) => p.text)
          .join("")
        return { text, calls, raw: parts }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

/**
 * Tries each provider model in order (e.g. gemini-3.8-flash, then gemini-2.5-flash) and falls back to
 * the scripted model if all fail. `name` reports the models that actually answered.
 */
export function createResilientPaymentOpsModel(
  primary: PaymentOpsModel | PaymentOpsModel[] | undefined,
): PaymentOpsModel & { fallbacks: () => number } {
  const scripted = createScriptedPaymentOpsModel()
  const chain = (Array.isArray(primary) ? primary : primary ? [primary] : []).slice()
  const used = new Set<string>()
  let fallbacks = 0
  return {
    get name() {
      return used.size > 0
        ? [...used].join("+")
        : chain.length > 0
          ? (chain[0]?.name ?? scripted.name)
          : scripted.name
    },
    fallbacks: () => fallbacks,
    async next(history) {
      for (const model of chain) {
        try {
          const reply = await model.next(history)
          used.add(model.name)
          return reply
        } catch {
          fallbacks += 1
        }
      }
      used.add(scripted.name)
      const clean = history.map((m) => (m.role === "model" ? { ...m, raw: undefined } : m))
      return scripted.next(clean)
    },
  }
}

/** Gemini models from env: AIRWALLEX_AGENT_MODEL (default gemini-3.8-flash), then gemini-2.5-flash. */
export function geminiModelChain(
  apiKey: string | undefined,
  preferred?: string | undefined,
): PaymentOpsModel[] {
  if (!apiKey) return []
  const names = [preferred || DEFAULT_GEMINI_AGENT_MODEL, "gemini-2.5-flash"]
  return [...new Set(names)].map((model) =>
    createGeminiPaymentOpsModel({ apiKey, model, timeoutMs: 20_000 }),
  )
}
