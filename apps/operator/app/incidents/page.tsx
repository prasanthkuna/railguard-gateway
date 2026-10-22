"use client"

import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react"
import * as React from "react"
import { PageHeader, SectionCard } from "../../components/design-system"
import { Button } from "../../components/ui/Button"
import { Skeleton } from "../../components/ui/Skeleton"
import {
  type AirwallexIncidentDemoResponse,
  type AirwallexPayoutIncident,
  api,
} from "../../lib/api"
import { getErrorMessage } from "../../lib/errors"

const LABEL_TONE: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  PENDING: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  UNKNOWN: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  FAILED: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  DISPUTED: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
}

const STEP_LABEL: Record<string, string> = {
  INCIDENT_OPENED: "Incident opened",
  RETRY_BLOCKED: "Duplicate payout blocked",
  RECONCILE_FOUND: "Reconciled by request_id",
  RECONCILE_NOT_FOUND_WAIT: "Not found yet - waiting",
  RECONCILE_NOT_FOUND: "Not found after grace window",
  SAFE_RETRY_SAME_REQUEST_ID: "Safe retry (same request_id)",
  WEBHOOK: "Signed webhook applied",
  RESOLVED: "Resolved",
  ESCALATED: "Escalated to a human",
}

function Pill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
        LABEL_TONE[label] ??
        "bg-[var(--rg-bg-hover)] text-[var(--rg-text-secondary)] ring-transparent"
      }`}
    >
      {label}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] px-3 py-2">
      <p className="rg-caption text-[var(--rg-text-muted)]">{label}</p>
      <p className="rg-label-1 text-[var(--rg-text-primary)]">{value}</p>
    </div>
  )
}

function IncidentCard({
  title,
  summary,
  transfers,
  createCalls,
  incident,
}: {
  title: string
  summary: string
  transfers: number
  createCalls: number
  incident: AirwallexPayoutIncident
}) {
  return (
    <SectionCard title={title} description={summary} action={<Pill label={incident.label} />}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Airwallex transfers created" value={transfers} />
        <Stat label="Create calls sent" value={createCalls} />
        <Stat label="Retries blocked" value={incident.retriesBlocked} />
        <Stat label="Incident" value={`${incident.status} · ${incident.kind}`} />
      </div>
      <p className="mt-3 break-all font-mono text-xs text-[var(--rg-text-muted)]">
        request_id {incident.requestId}
        {incident.transferId ? ` · transfer ${incident.transferId}` : ""}
      </p>

      <ol className="mt-5 space-y-3 border-l border-[var(--rg-border)] pl-4">
        {incident.timeline.map((entry) => (
          <li key={entry.hash} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--rg-brand)]" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="rg-label-2 text-[var(--rg-text-primary)]">
                {STEP_LABEL[entry.step] ?? entry.step}
              </span>
              <span className="rg-caption text-[var(--rg-text-muted)]">
                {new Date(entry.at).toISOString().slice(11, 19)} UTC
              </span>
              {entry.attemptState ? (
                <span className="rg-caption text-[var(--rg-text-muted)]">
                  state {entry.attemptState}
                  {entry.airwallexStatus ? ` · airwallex ${entry.airwallexStatus}` : ""}
                </span>
              ) : null}
            </div>
            <p className="rg-body-2 text-[var(--rg-text-secondary)]">{entry.detail}</p>
            <p className="font-mono text-[10px] text-[var(--rg-text-muted)]">
              hash {entry.hash.slice(0, 16)}…
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-5">
        <p className="rg-label-2 text-[var(--rg-text-primary)]">Runbook</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 rg-body-2 text-[var(--rg-text-secondary)]">
          {incident.runbook.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </SectionCard>
  )
}

export default function IncidentsPage() {
  const [data, setData] = React.useState<AirwallexIncidentDemoResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await api.getAirwallexIncidentDemo())
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load incident demo"))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-16">
      <PageHeader
        eyebrow="Airwallex payouts · Incident Commander"
        title="Payout incidents"
        description="When an Airwallex transfer goes UNKNOWN, Railguard blocks the second payout, reconciles by request_id, and only then marks it CONFIRMED. Simulated sandbox run, no real money."
        actions={
          <Button variant="secondary" className="gap-2" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Re-run
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-start gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">
            Timeout or 5xx on create means UNKNOWN, never failed.
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-400" />
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">
            Retries are blocked while a payout claim is open.
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">
            One deterministic request_id per intent, so there is at most one transfer.
          </p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-[var(--rg-radius-xl)]" />
      ) : error ? (
        <SectionCard title="Could not load incidents" description={error}>
          <Button onClick={() => void load()}>Try again</Button>
        </SectionCard>
      ) : data ? (
        <>
          {data.demo.scenarios.map((s) => (
            <IncidentCard
              key={s.id}
              title={`${s.id}. ${s.title}`}
              summary={s.summary}
              transfers={s.airwallexTransfersCreated}
              createCalls={s.createCallsSent}
              incident={s.incident}
            />
          ))}
          <SectionCard
            title="C. Forged webhook rejected"
            description="A payout.transfer.failed event signed with the wrong secret is dropped before it can touch payout state."
            action={
              data.demo.webhookRejection.accepted ? (
                <Pill label="FAILED" />
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  rejected: {data.demo.webhookRejection.reason}
                </span>
              )
            }
          >
            <p className="rg-body-2 text-[var(--rg-text-secondary)]">
              Signature check: HMAC-SHA256 of x-timestamp + raw body with the webhook secret, a
              constant-time compare, and a 5 minute replay window.
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
