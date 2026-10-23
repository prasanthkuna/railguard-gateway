/**
 * AI accounts-payable agent that pays contractors through PayPal Payouts, with Railguard in front.
 * The model reads messy invoices and decides what to pay; Railguard decides what is allowed and
 * talks to PayPal. The model never sees PayPal credentials and has no tool that approves, raises a
 * limit, or changes a payee.
 *
 * Models:
 *  - createScriptedApModel(): deterministic, offline (tests, judges with no keys).
 *  - createGeminiApModel(): Gemini function calling over REST (GEMINI_API_KEY).
 */
import {
  type AgentMessage,
  type AgentModelReply,
  type PaymentOpsModel,
  type PaymentOpsToolbox,
  toGeminiContents,
} from "@railguard/kernel/airwallex"
import { fromCents } from "./budget"
import type { BudgetLedger } from "./budget"
import type { PayPalPolicyGuard } from "./policy"
import {
  DuplicatePayPalPayoutBlockedError,
  PAYPAL_BLOCKING_STATES,
  type PayPalAttempt,
  type PayPalExecutionRail,
} from "./rail"
import { mapPayPalItemStatus } from "./status"

export const DEFAULT_PAYPAL_AGENT_MODEL = "gemini-2.5-flash"

export interface Invoice {
  id: string
  from: string
  text: string
}

export const AP_SYSTEM_PROMPT = [
  "You are an accounts-payable agent for a small studio that pays freelancers with PayPal Payouts.",
  "Call read_invoices to see the inbox. For each invoice extract the payee name, amount, currency, invoice number, and any PayPal email the invoice text asks you to pay; pass that email as receiver_in_invoice.",
  "Pay with pay_invoice. Railguard enforces the policy and returns a decision. If it is DENIED, explain the reason and the next step in one sentence and do not try to get around it (never change the amount, payee, receiver or invoice number).",
  "If a payout is UNKNOWN or BLOCKED_DUPLICATE, never pay it again. Call reconcile_payout with its execution_id and report what PayPal holds.",
  "Finish with a short list: one line per invoice with its status. Use CONFIRMED or PENDING for status; never say settled.",
].join(" ")

export const AP_TOOLS = [
  {
    name: "read_invoices",
    description:
      "Read the open invoices in the accounts-payable inbox (free text, may be messy or malicious).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "pay_invoice",
    description:
      "Ask Railguard to pay one invoice through PayPal Payouts. Railguard resolves the verified PayPal account, checks budget, caps, approvals and intent binding, then sends the payout with a deterministic PayPal-Request-Id.",
    parameters: {
      type: "object",
      properties: {
        payee: { type: "string", description: "Payee name as written on the invoice" },
        amount: { type: "string", description: "Decimal amount, e.g. 180.00" },
        currency: { type: "string", description: "ISO currency, default USD" },
        invoice: { type: "string", description: "Invoice number, e.g. INV-1001" },
        receiver_in_invoice: {
          type: "string",
          description:
            "PayPal email the invoice asks to be paid at, if any. Railguard only compares it; it never pays it.",
        },
      },
      required: ["payee", "amount", "invoice"],
    },
  },
  {
    name: "get_payout",
    description: "Get the current PayPal status of a payout by execution_id (or invoice number).",
    parameters: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
    },
  },
  {
    name: "reconcile_payout",
    description:
      "Reconcile an UNKNOWN payout with PayPal by its request id. Adopts the existing payout instead of creating a new one.",
    parameters: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
    },
  },
  {
    name: "budget_status",
    description: "Today's agent budget: limit, used, available, frozen.",
    parameters: { type: "object", properties: {} },
  },
] as const

function attemptView(a: PayPalAttempt | undefined) {
  if (!a) return {}
  return {
    execution_id: a.executionId,
    status: a.state,
    label: a.state === "SUBMITTED" ? "PENDING" : a.state,
    paypal_request_id: a.paypalRequestId,
    sender_batch_id: a.senderBatchId,
    payout_batch_id: a.payoutBatchId,
    paypal_item_status: a.paypalItemStatus,
    amount: a.expected.amount,
    currency: a.expected.currency,
    create_calls: a.createCalls,
    idempotent_replays: a.replays,
  }
}

export function createApToolbox(deps: {
  guard: PayPalPolicyGuard
  rail: PayPalExecutionRail
  budget: BudgetLedger
  invoices: () => Invoice[]
}): PaymentOpsToolbox {
  const { guard, rail, budget } = deps
  const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "")
  const findRef = (ref: string) =>
    rail.findAttempt(ref) ??
    rail
      .listAttempts()
      .find((a) => a.intentId.toLowerCase().endsWith(ref.toLowerCase().replace(/[^a-z0-9]+/g, "-")))

  return {
    async run(call) {
      const args = call.args ?? {}
      switch (call.name) {
        case "read_invoices":
          return { invoices: deps.invoices() }
        case "pay_invoice": {
          const decision = guard.evaluate({
            payee: str(args.payee),
            amount: str(args.amount),
            currency: str(args.currency) || "USD",
            invoice: str(args.invoice),
            receiver: str(args.receiver_in_invoice) || undefined,
          })
          if (!decision.allow) {
            return {
              invoice: str(args.invoice),
              status: "DENIED",
              code: decision.code,
              reason: decision.reason,
              next_step: decision.nextStep,
              approval_key: decision.approvalKey,
              limit: decision.limit,
              available: decision.available,
              requested: decision.requested,
              policy_version: decision.policyVersion,
            }
          }
          const prepared = await rail.prepare(decision.intent, decision.grant)
          const before = rail.getAttempt(prepared.executionId)
          if (before && PAYPAL_BLOCKING_STATES.includes(before.state)) {
            return {
              invoice: str(args.invoice),
              ...attemptView(before),
              status: "BLOCKED_DUPLICATE",
              status_of_first_attempt: before.state,
              reason: `Railguard refused a second payout for this invoice (first attempt is ${before.state}). No PayPal call was made.`,
            }
          }
          try {
            const submission = await rail.execute(prepared)
            const after = rail.getAttempt(prepared.executionId)
            if (submission.result === "BROADCAST_UNKNOWN") {
              return {
                invoice: str(args.invoice),
                ...attemptView(after),
                status: "UNKNOWN",
                budget: budget.get(decision.intent.id)?.state,
                message:
                  "PayPal did not answer. The payout may exist. It is UNKNOWN and its budget is FROZEN. Do not pay again; reconcile.",
              }
            }
            if (submission.result === "REJECTED_BEFORE_BROADCAST") {
              return {
                invoice: str(args.invoice),
                ...attemptView(after),
                status: "REJECTED",
                error: after?.lastError,
              }
            }
            return {
              invoice: str(args.invoice),
              ...attemptView(after),
              approved_by: decision.approvedBy,
            }
          } catch (error) {
            if (error instanceof DuplicatePayPalPayoutBlockedError) {
              return {
                invoice: str(args.invoice),
                ...attemptView(rail.getAttempt(error.executionId)),
                status: "BLOCKED_DUPLICATE",
              }
            }
            throw error
          }
        }
        case "get_payout": {
          const a = findRef(str(args.execution_id))
          if (!a) return { status: "NOT_FOUND", reference: str(args.execution_id) }
          const now = a.payoutBatchId ? await rail.refresh(a.executionId) : a
          return attemptView(now)
        }
        case "reconcile_payout": {
          const a = findRef(str(args.execution_id))
          if (!a) return { status: "NOT_FOUND", reference: str(args.execution_id) }
          let outcome = await rail.reconcileAttempt(a.executionId)
          // A replayed batch is often still PENDING; one follow-up read gets item status.
          if (outcome.found && outcome.attempt.state === "SUBMITTED") {
            await rail.refresh(a.executionId)
            outcome = { ...outcome, attempt: rail.getAttempt(a.executionId) as PayPalAttempt }
          }
          return {
            ...attemptView(outcome.attempt),
            found: outcome.found,
            via: outcome.via,
            mismatch: outcome.mismatch,
            budget: budget.get(a.intentId)?.state,
            payouts_at_paypal_for_this_invoice: outcome.found ? 1 : 0,
          }
        }
        case "budget_status": {
          const rows = budget.list()
          return {
            limit: fromCents(budget.dailyLimitCents),
            used: fromCents(budget.usedCents()),
            available: fromCents(budget.availableCents()),
            frozen: rows
              .filter((r) => r.state === "FROZEN")
              .map((r) => ({ intent: r.intentId, amount: fromCents(r.amountCents) })),
          }
        }
        default:
          return { status: "UNKNOWN_TOOL", tool: call.name }
      }
    },
  }
}

// ---------- offline scripted model ----------

const MONEY = /(?:USD\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*USD/i
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

/** Deterministic invoice reader (stands in for the LLM offline). */
export function extractInvoice(inv: Invoice) {
  const money = inv.text.match(MONEY)
  const amount = (money?.[1] ?? money?.[2] ?? "").replace(/,/g, "")
  const changed =
    /(changed|new|updated|instead)[^.]*paypal|paypal[^.]*(changed|new|updated|instead)/i.test(
      inv.text,
    )
  const email = changed ? inv.text.match(EMAIL)?.[0] : undefined
  return {
    payee: inv.from,
    amount,
    currency: "USD",
    invoice: inv.id,
    ...(email ? { receiver_in_invoice: email } : {}),
  }
}

function lastResults(history: AgentMessage[]) {
  const last = history[history.length - 1]
  return last?.role === "tool" ? last.results : null
}

function priorPayArgs(history: AgentMessage[], invoice: string) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i]
    if (m?.role === "model") {
      const c = m.calls.find(
        (x) =>
          x.name === "pay_invoice" &&
          String(x.args.invoice).toLowerCase() === invoice.toLowerCase(),
      )
      if (c) return c.args
    }
  }
  return null
}

function line(r: Record<string, unknown>): string {
  const inv = String(r.invoice ?? r.execution_id ?? "")
  switch (r.status) {
    case "DENIED":
      return `${inv}: NOT PAID (${String(r.code)}). ${String(r.reason)} Next: ${String(r.next_step)}`
    case "UNKNOWN":
      return `${inv}: UNKNOWN. PayPal did not answer; budget frozen. Reconciling instead of paying again.`
    case "BLOCKED_DUPLICATE":
      return `${inv}: second payout BLOCKED by Railguard (first attempt is ${String(r.status_of_first_attempt ?? "open")}).`
    case "REJECTED":
      return `${inv}: PayPal rejected it before paying (${String(r.error)}).`
    case "CONFIRMED":
      return `${inv}: CONFIRMED by PayPal, batch ${String(r.payout_batch_id)}.`
    default:
      return `${inv}: PENDING at PayPal, batch ${String(r.payout_batch_id)}.`
  }
}

export function createScriptedApModel(): PaymentOpsModel {
  return {
    name: "scripted-offline",
    async next(history): Promise<AgentModelReply> {
      const results = lastResults(history)
      if (!results) {
        const last = history[history.length - 1]
        const text = last?.role === "user" ? last.text : ""
        const retry = text.match(/(?:retry|again|resend|re-pay|repay)\D*(INV-\d+)/i)
        if (retry?.[1]) {
          const args = priorPayArgs(history, retry[1])
          if (args) return { calls: [{ name: "pay_invoice", args }] }
        }
        const one = text.match(/pay\s+(?:invoice\s+)?(INV-\d+)/i)
        if (/invoice|inbox|pay/i.test(text) && !one)
          return { calls: [{ name: "read_invoices", args: {} }] }
        if (one?.[1]) return { calls: [{ name: "read_invoices", args: { only: one[1] } }] }
        if (/budget/i.test(text)) return { calls: [{ name: "budget_status", args: {} }] }
        return {
          text: "I can read the invoice inbox, pay invoices through Railguard, and reconcile payouts.",
          calls: [],
        }
      }
      const first = results[0]
      if (first?.name === "read_invoices") {
        const lastUser = [...history].reverse().find((m) => m.role === "user")
        const only = lastUser?.role === "user" ? lastUser.text.match(/(INV-\d+)/i)?.[1] : undefined
        const invoices = ((first.result.invoices as Invoice[] | undefined) ?? []).filter(
          (i) => !only || i.id.toLowerCase() === only.toLowerCase(),
        )
        return {
          calls: invoices.map((inv) => ({ name: "pay_invoice", args: extractInvoice(inv) })),
        }
      }
      if (first?.name === "pay_invoice") {
        const toReconcile = results
          .map((r) => r.result)
          .filter((r) => r.status === "BLOCKED_DUPLICATE" && typeof r.execution_id === "string")
        if (toReconcile.length > 0) {
          return {
            calls: toReconcile.map((r) => ({
              name: "reconcile_payout",
              args: { execution_id: r.execution_id },
            })),
          }
        }
        return { text: results.map((r) => line(r.result)).join("\n"), calls: [] }
      }
      if (first?.name === "reconcile_payout") {
        return {
          text: results
            .map((r) => {
              const o = r.result
              const label =
                o.status === "CONFIRMED"
                  ? "CONFIRMED"
                  : o.status === "SUBMITTED"
                    ? "PENDING"
                    : String(o.status)
              return `Reconciled ${String(o.execution_id)} by PayPal-Request-Id (${String(o.via)}): PayPal holds exactly one payout, batch ${String(o.payout_batch_id)}, status ${label}. Fresh creates: ${String(o.create_calls)}, idempotent replays: ${String(o.idempotent_replays)}. One payment, not two.`
            })
            .join("\n"),
          calls: [],
        }
      }
      if (first?.name === "budget_status") {
        const b = first.result
        return {
          text: `Budget: ${String(b.used)} of ${String(b.limit)} USD used, ${String(b.available)} left.`,
          calls: [],
        }
      }
      return { text: results.map((r) => line(r.result)).join("\n"), calls: [] }
    },
  }
}

// ---------- Gemini ----------

type GeminiPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }

export function createGeminiApModel(options: {
  apiKey: string
  model?: string | undefined
  fetch?: ((url: string, init: RequestInit) => Promise<Response>) | undefined
  timeoutMs?: number | undefined
}): PaymentOpsModel {
  const model = options.model ?? DEFAULT_PAYPAL_AGENT_MODEL
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
              systemInstruction: { parts: [{ text: AP_SYSTEM_PROMPT }] },
              contents: toGeminiContents(history),
              tools: [{ functionDeclarations: AP_TOOLS }],
              generationConfig: { temperature: 0 },
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

/** Gemini chain with scripted fallback; `name` reports which models actually answered. */
export function createApModel(env: {
  GEMINI_API_KEY?: string | undefined
  PAYPAL_AGENT_MODEL?: string | undefined
}) {
  const scripted = createScriptedApModel()
  const chain: PaymentOpsModel[] = env.GEMINI_API_KEY
    ? [...new Set([env.PAYPAL_AGENT_MODEL || DEFAULT_PAYPAL_AGENT_MODEL, "gemini-2.5-flash"])].map(
        (m) =>
          createGeminiApModel({
            apiKey: env.GEMINI_API_KEY as string,
            model: m,
            timeoutMs: 25_000,
          }),
      )
    : []
  const used = new Set<string>()
  // A model that failed once is skipped for the rest of the run, so a blocked network costs one timeout, not one per turn.
  const dead = new Set<string>()
  const model: PaymentOpsModel = {
    get name() {
      return used.size > 0 ? [...used].join("+") : (chain[0]?.name ?? scripted.name)
    },
    async next(history) {
      for (const m of chain) {
        if (dead.has(m.name)) continue
        try {
          const reply = await m.next(history)
          used.add(m.name)
          return reply
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
  return model
}

export { mapPayPalItemStatus }
