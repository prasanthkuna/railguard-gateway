"use client"

import { Bot, Gavel, Play, ShieldCheck, User, Wrench, Zap } from "lucide-react"
import * as React from "react"
import {
  type AgentDemo,
  type ChaosRun,
  type LiveStatus,
  type TranscriptStep,
  type WebhookEvent,
  airwallexOps,
} from "../../lib/airwallexOps"
import { SectionCard } from "../design-system"
import { Button } from "../ui/Button"

const TONE: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  PENDING: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  UNKNOWN: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  BLOCKED_DUPLICATE: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  DENIED: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  SUBMITTED: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  FAILED: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
}

export function Pill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
        TONE[label] ?? "bg-[var(--rg-bg-hover)] text-[var(--rg-text-secondary)] ring-transparent"
      }`}
    >
      {label}
    </span>
  )
}

function BigStat({
  label,
  value,
  good,
}: { label: string; value: React.ReactNode; good?: boolean }) {
  return (
    <div
      className={`rounded-[var(--rg-radius-lg)] border px-4 py-4 ${
        good ? "border-emerald-500/40 bg-emerald-500/5" : "border-[var(--rg-border)]"
      }`}
    >
      <p className="rg-caption text-[var(--rg-text-muted)]">{label}</p>
      <p
        className={`mt-1 text-4xl font-semibold tabular-nums ${good ? "text-emerald-400" : "text-[var(--rg-text-primary)]"}`}
      >
        {value}
      </p>
    </div>
  )
}

function shortJson(value: Record<string, unknown> | undefined): string {
  if (!value) return ""
  const keep = Object.entries(value).filter(([, v]) => v !== undefined && v !== null)
  return keep
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ")
    .slice(0, 420)
}

export function Transcript({ steps }: { steps: TranscriptStep[] }) {
  return (
    <ol className="space-y-2" data-testid="agent-transcript">
      {steps.map((s, i) => {
        const key = `${i}-${s.kind}`
        if (s.kind === "user")
          return (
            <li key={key} className="flex gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rg-text-muted)]" />
              <p className="rg-body-2 text-[var(--rg-text-primary)]">{s.text}</p>
            </li>
          )
        if (s.kind === "agent")
          return (
            <li key={key} className="flex gap-2">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rg-brand)]" />
              <p className="rg-body-2 text-[var(--rg-text-secondary)]">{s.text}</p>
            </li>
          )
        if (s.kind === "system")
          return (
            <li key={key} className="flex gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="rg-caption text-amber-300">{s.text}</p>
            </li>
          )
        if (s.kind === "tool_call")
          return (
            <li key={key} className="flex gap-2 pl-6">
              <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--rg-text-muted)]" />
              <p className="font-mono text-xs text-[var(--rg-text-muted)]">
                {s.tool}({shortJson(s.args)})
              </p>
            </li>
          )
        const status = typeof s.result?.status === "string" ? s.result.status : s.result?.label
        return (
          <li key={key} className="flex flex-wrap items-start gap-2 pl-6">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {typeof status === "string" ? <Pill label={status} /> : null}
            <p className="min-w-0 flex-1 break-all font-mono text-[11px] text-[var(--rg-text-muted)]">
              {shortJson(s.result)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function ChaosResult({ run }: { run: ChaosRun }) {
  return (
    <div className="space-y-5" data-testid="chaos-result">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BigStat
          label="Airwallex transfers created"
          value={run.airwallexTransfersCreated}
          good={run.airwallexTransfersCreated === 1}
        />
        <BigStat label="Create calls" value={run.createCalls} good={run.createCalls === 1} />
        <BigStat label="Retries blocked" value={run.retriesBlocked} />
        <BigStat
          label="Status"
          value={<span className="text-2xl">{run.label}</span>}
          good={run.label === "CONFIRMED"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--rg-text-muted)]">
        <Pill label={run.mode === "live" ? "LIVE SANDBOX" : "SIMULATED"} />
        <span>model {run.model}</span>
        <span>· request_id {run.requestId}</span>
        {run.transferId ? <span>· transfer {run.transferId}</span> : null}
        {run.airwallexStatus ? <span>· airwallex {run.airwallexStatus}</span> : null}
        <span>· confirmed via {run.confirmation}</span>
        <span>· wire create calls {run.wireCreateCalls}</span>
        <span>
          · forged webhook{" "}
          {run.forgedWebhook.accepted ? "ACCEPTED" : `rejected (${run.forgedWebhook.reason})`}
        </span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="rg-label-2 mb-2 text-[var(--rg-text-primary)]">Agent</p>
          <Transcript steps={run.transcript} />
        </div>
        <div>
          <p className="rg-label-2 mb-2 text-[var(--rg-text-primary)]">
            Incident timeline (hash-chained)
          </p>
          <ol className="space-y-2 border-l border-[var(--rg-border)] pl-4">
            {(run.incident?.timeline ?? []).map((t) => (
              <li key={t.hash}>
                <p className="rg-label-2 text-[var(--rg-text-primary)]">
                  {t.step.replaceAll("_", " ").toLowerCase()}
                </p>
                <p className="rg-caption text-[var(--rg-text-secondary)]">{t.detail}</p>
                <p className="font-mono text-[10px] text-[var(--rg-text-muted)]">
                  {t.hash.slice(0, 16)}…
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {run.notes.length > 0 ? (
        <p className="font-mono text-[11px] text-[var(--rg-text-muted)]">{run.notes.join(" · ")}</p>
      ) : null}
    </div>
  )
}

export function ChaosPanel() {
  const [mode, setMode] = React.useState<"simulated" | "live">("simulated")
  const [run, setRun] = React.useState<ChaosRun | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<LiveStatus | null>(null)
  const [token, setToken] = React.useState("")
  const [info, setInfo] = React.useState<string | null>(null)

  React.useEffect(() => {
    airwallexOps
      .liveStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
    setToken(window.localStorage.getItem("rg-operator-token") ?? "")
  }, [])

  React.useEffect(() => {
    if (mode !== "live") return
    airwallexOps
      .runs()
      .then((r) => {
        if (r.latestLive) {
          setRun(r.latestLive)
          setInfo(
            `Latest stored live sandbox run (${new Date(r.latestLive.finishedAt).toLocaleString()}).`,
          )
        }
      })
      .catch(() => {})
  }, [mode])

  async function force() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === "simulated") {
        const out = await airwallexOps.runSimulatedChaos()
        setRun(out.result)
        setInfo(`Simulated run stored in Postgres as ${out.id}.`)
      } else {
        if (token) window.localStorage.setItem("rg-operator-token", token)
        const out = await airwallexOps.runLiveChaos(token || undefined)
        setRun(out.result)
        setInfo(
          `Live sandbox run, slot ${out.slot}/${out.slotsPerHour} this hour. ${out.relay.relayed ? `Stored via signed relay (${out.relay.detail}).` : `Not stored: ${out.relay.detail}.`}`,
        )
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard
      title="Chaos: force a timeout after create"
      description="The agent pays a supplier. Railguard drops the Airwallex response right after the transfer is created. The agent panics and pays again. Railguard blocks it, reconciles by request_id, and confirms exactly one transfer."
      glow="accent"
      action={
        <div
          className="inline-flex rounded-full border border-[var(--rg-border)] p-0.5"
          role="tablist"
        >
          {(["simulated", "live"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                mode === m ? "bg-[var(--rg-brand)] text-black" : "text-[var(--rg-text-secondary)]"
              }`}
            >
              {m === "simulated" ? "Simulated" : "Live sandbox"}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button
          className="gap-2"
          onClick={() => void force()}
          isLoading={busy}
          data-testid="force-timeout"
        >
          <Play className="h-4 w-4" />
          Force timeout
        </Button>
        {mode === "live" ? (
          <>
            <span className="rg-caption text-[var(--rg-text-muted)]">
              {status?.configured
                ? `Real Airwallex sandbox (${status.sandboxHost}), fake money, 1.00 USD. ${status.publicRunsPerHour} public runs per hour.`
                : "Live runner not configured on this deployment."}
            </span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="operator token (optional)"
              className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] bg-transparent px-2 py-1 text-xs"
            />
          </>
        ) : (
          <span className="rg-caption text-[var(--rg-text-muted)]">
            In-memory Airwallex simulator. No keys, no money, unlimited.
          </span>
        )}
      </div>
      {error ? <p className="rg-body-2 mb-4 text-rose-400">{error}</p> : null}
      {info ? <p className="rg-caption mb-4 text-[var(--rg-text-muted)]">{info}</p> : null}
      {run ? (
        <ChaosResult run={run} />
      ) : (
        <p className="rg-body-2 text-[var(--rg-text-muted)]">Press Force timeout to run it.</p>
      )}
    </SectionCard>
  )
}

export function AgentConsole() {
  const [request, setRequest] = React.useState("Pay Acme $1,200 for invoice 42")
  const [steps, setSteps] = React.useState<TranscriptStep[]>([])
  const [approvalKey, setApprovalKey] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [model, setModel] = React.useState("")
  const [brain, setBrain] = React.useState<"gemini" | "offline">("gemini")

  async function run(approvals: string[] = []) {
    setBusy(true)
    try {
      const out = await airwallexOps.agent(request, approvals, brain)
      setSteps(out.transcript)
      setModel(out.model)
      const denial = [...out.transcript].reverse().find((s) => s.kind === "tool_result")?.result
      setApprovalKey(
        denial?.code === "APPROVAL_REQUIRED" && typeof denial.approval_key === "string"
          ? denial.approval_key
          : null,
      )
    } catch (err) {
      setSteps([{ kind: "agent", text: (err as Error).message }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard
      title="Ask the payment-ops agent"
      description="Plain-language requests. The agent can only call create_payout, get_transfer, reconcile and list_incidents. Policy and approvals live in Railguard's code."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          className="flex-1 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] bg-transparent px-3 py-2 text-sm"
          aria-label="Agent request"
        />
        <select
          value={brain}
          onChange={(e) => setBrain(e.target.value as "gemini" | "offline")}
          className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] bg-transparent px-2 py-2 text-xs"
          aria-label="Agent model"
        >
          <option value="gemini">Gemini</option>
          <option value="offline">Offline (deterministic)</option>
        </select>
        <Button className="gap-2" onClick={() => void run()} isLoading={busy}>
          <Bot className="h-4 w-4" />
          Run agent
        </Button>
        {approvalKey ? (
          <Button variant="secondary" className="gap-2" onClick={() => void run([approvalKey])}>
            <Gavel className="h-4 w-4" />
            Approve as human
          </Button>
        ) : null}
      </div>
      {steps.length > 0 ? (
        <div className="mt-4">
          <p className="rg-caption mb-2 text-[var(--rg-text-muted)]">
            model {model} · simulated Airwallex
          </p>
          <Transcript steps={steps} />
        </div>
      ) : null}
    </SectionCard>
  )
}

export function PolicyGuardPanel() {
  const [demo, setDemo] = React.useState<AgentDemo | null>(null)
  React.useEffect(() => {
    airwallexOps
      .agentDemo()
      .then((d) => setDemo(d.demo))
      .catch(() => setDemo(null))
  }, [])
  if (!demo) return null
  const p = demo.policy
  return (
    <SectionCard
      title="Policy guard the agent cannot talk past"
      description={`Approval above ${p.approvalThreshold} USD (bound to exact terms), ${p.perPayeeDailyCap} USD per payee per day, ${p.dailyCap} USD per day, new payees held ${p.newPayeeHoldHours}h. Transfers created in this story: ${demo.transfersCreated}.`}
    >
      <ol className="space-y-3">
        {demo.steps.map((s) => {
          const agent = s.transcript.filter((t) => t.kind === "agent").map((t) => t.text)
          return (
            <li
              key={s.id}
              className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rg-label-2 text-[var(--rg-text-primary)]">
                  {s.id}. {s.title}
                </span>
                <Pill label={s.outcome} />
                {s.code ? <span className="font-mono text-xs text-rose-300">{s.code}</span> : null}
              </div>
              <p className="rg-caption mt-1 text-[var(--rg-text-muted)]">“{s.request}”</p>
              <p className="rg-body-2 mt-1 text-[var(--rg-text-secondary)]">{agent.join(" ")}</p>
            </li>
          )
        })}
      </ol>
    </SectionCard>
  )
}

export function WebhookLog() {
  const [events, setEvents] = React.useState<WebhookEvent[] | null>(null)
  React.useEffect(() => {
    airwallexOps
      .webhookEvents()
      .then((e) => setEvents(e.events))
      .catch(() => setEvents([]))
  }, [])
  return (
    <SectionCard
      title="Webhook deliveries"
      description="POST /v1/airwallex/webhook verifies HMAC-SHA256(x-timestamp + raw body) before parsing. Rejected deliveries are logged without payloads."
    >
      {events && events.length > 0 ? (
        <ul className="space-y-1 font-mono text-xs">
          {events.slice(0, 10).map((e) => (
            <li key={e.id} className={e.accepted ? "text-emerald-400" : "text-rose-300"}>
              {new Date(e.received_at).toISOString().slice(0, 19)}Z · {e.source} ·{" "}
              {e.accepted ? "accepted" : "rejected"}
              {e.reason ? ` (${e.reason})` : ""} {e.event_name ?? ""} {e.transfer_id ?? ""}{" "}
              {e.status ?? ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rg-body-2 text-[var(--rg-text-muted)]">No deliveries yet.</p>
      )}
    </SectionCard>
  )
}
