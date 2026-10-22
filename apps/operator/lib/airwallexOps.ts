/** Client helpers for the Airwallex Track 3 views (public endpoints, no auth session side effects). */
import { publicApiUrl } from "./api"

export interface TranscriptStep {
  kind: "user" | "agent" | "tool_call" | "tool_result" | "system"
  text?: string
  tool?: string
  args?: Record<string, unknown>
  result?: Record<string, unknown>
}

export interface TimelineEntry {
  at: string
  step: string
  detail: string
  attemptState?: string
  airwallexStatus?: string
  hash: string
}

export interface ChaosIncident {
  id: string
  kind: string
  status: string
  label: string
  requestId: string
  transferId?: string
  createCalls: number
  retriesBlocked: number
  timeline: TimelineEntry[]
  runbook: string[]
}

export interface ChaosRun {
  mode: "simulated" | "live"
  model: string
  startedAt: string
  finishedAt: string
  request: string
  invoice: string
  amount: string
  currency: string
  requestId: string
  transferId?: string
  airwallexStatus?: string
  label: string
  airwallexTransfersCreated: number
  createCalls: number
  wireCreateCalls: number
  injectedTimeouts: number
  retriesBlocked: number
  confirmation: "webhook" | "poll" | "none"
  forgedWebhook: { accepted: boolean; reason?: string; stateUnchanged: boolean }
  transcript: TranscriptStep[]
  incident?: ChaosIncident
  notes: string[]
  ok: boolean
}

export interface LiveStatus {
  configured: boolean
  sandboxHost: string
  gemini: boolean
  relay: boolean
  webhookSecret: boolean
  publicRunsPerHour: number
  operatorRunsPerHour: number
}

export interface AgentDemoStep {
  id: string
  title: string
  request: string
  outcome: string
  code?: string
  transcript: TranscriptStep[]
}

export interface AgentDemo {
  model: string
  policy: {
    approvalThreshold: number
    perPayeeDailyCap: number
    dailyCap: number
    newPayeeHoldHours: number
    version: string
  }
  steps: AgentDemoStep[]
  transfersCreated: number
}

export interface WebhookEvent {
  id: string
  received_at: string
  source: string
  accepted: boolean
  reason?: string
  event_name?: string
  transfer_id?: string
  status?: string
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

export const airwallexOps = {
  runSimulatedChaos: async () =>
    json<{ id: string; result: ChaosRun }>(
      await fetch(`${publicApiUrl()}/v1/airwallex/chaos`, { method: "POST" }),
    ),
  runLiveChaos: async (token?: string) =>
    json<{
      result: ChaosRun
      slot: number
      slotsPerHour: number
      relay: { relayed: boolean; detail: string }
    }>(
      await fetch("/airwallex-live/chaos", {
        method: "POST",
        headers: token ? { "x-railguard-operator-token": token } : {},
      }),
    ),
  liveStatus: async () =>
    json<LiveStatus>(await fetch("/airwallex-live/status", { cache: "no-store" })),
  runs: async () =>
    json<{
      runs: Array<{
        id: string
        mode: string
        ok: boolean
        transferId?: string
        createCalls?: number
        transfersCreated?: number
        label?: string
        createdAt: string
        source: string
      }>
      latestLive: ChaosRun | null
    }>(await fetch(`${publicApiUrl()}/v1/airwallex/runs`, { cache: "no-store" })),
  agentDemo: async () =>
    json<{ demo: AgentDemo }>(await fetch(`${publicApiUrl()}/v1/airwallex/agent-demo`)),
  agent: async (
    request: string,
    approvals: string[] = [],
    model: "gemini" | "offline" = "gemini",
  ) =>
    json<{ reply: string; model: string; transcript: TranscriptStep[]; transfersCreated: number }>(
      await fetch(`${publicApiUrl()}/v1/airwallex/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, approvals, model }),
      }),
    ),
  webhookEvents: async () =>
    json<{ events: WebhookEvent[] }>(
      await fetch(`${publicApiUrl()}/v1/airwallex/webhook-events`, { cache: "no-store" }),
    ),
}
