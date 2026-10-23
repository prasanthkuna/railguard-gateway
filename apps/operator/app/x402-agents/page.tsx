"use client"

import { Bot, CheckCircle2, ExternalLink, Play, ShieldAlert, Wallet } from "lucide-react"
import * as React from "react"
import { PageHeader, SectionCard } from "../../components/design-system"
import { Button } from "../../components/ui/Button"
import { Skeleton } from "../../components/ui/Skeleton"

const EXPLORER = "https://testnet.metalntwx.com/tx/"

interface Kit11Event {
  at: string
  step: string
  actor: string
  detail: string
  outcome?: string
  transaction?: string
  requestId?: string
}
interface Terms {
  capCents: number
  budgetCents: number
  payees: string[]
}
type Allocation = Record<"sourcing" | "support" | "treasury", Terms>
interface RunResult {
  runId: string
  chain: string
  treasuryMode: string
  events: Kit11Event[]
  allocationBefore: Allocation
  allocationAfter: Allocation
  approved: boolean
  refusal?: { reason: string; recordedTx?: string }
  proposal?: {
    approvalHash: string
    option: { id: string; title: string }
    decision: { rationale: string; decidedBy: string }
  }
  earnings?: {
    cents: number
    paymentId: string
    pull: { transaction?: string }
    resend?: { alreadyPaid: boolean }
  }
  deposit?: { depositId?: string; status: string; amount: string }
  conversion?: { conversionId: string; buyAmount: string; sellAmount?: string; status: string }
  licence?: { transferId: string; status: string; amount: string; requestId: string }
  invariants: Record<string, boolean>
}
interface Recorded {
  runId: string
  generatedAt: string
  model: string
  treasury: string
  addresses: { account: string; customerAccount: string; upstream: string; bridge: string }
  mandates: Record<string, string>
  bindTx: Record<string, string>
  result: RunResult
}

const usdz = (c: number) => (c / 100).toFixed(2)
const short = (h?: string) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "")

const ROLE_COPY: Record<keyof Allocation, { title: string; job: string }> = {
  sourcing: {
    title: "Sourcing agent",
    job: "Buys each query's input from the upstream seller (listed payee only).",
  },
  support: {
    title: "Support agent",
    job: "Refunds buyers within its per-refund cap (payees open).",
  },
  treasury: {
    title: "Treasury agent",
    job: "Moves earnings to Airwallex and pays the EUR licence fee.",
  },
}

const TONE: Record<string, string> = {
  SOLD: "text-emerald-400",
  PAID: "text-emerald-400",
  VERIFIED: "text-emerald-400",
  PLACED_BY_BUYER: "text-emerald-400",
  BLOCKED: "text-sky-400",
  NOT_CHARGED: "text-amber-400",
  REFUSED: "text-rose-400",
  UNKNOWN: "text-amber-400",
}

function AgentCards({ before, after }: { before: Allocation; after: Allocation }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(Object.keys(ROLE_COPY) as Array<keyof Allocation>).map((r) => {
        const changed =
          before[r].budgetCents !== after[r].budgetCents || before[r].capCents !== after[r].capCents
        return (
          <div
            key={r}
            className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--rg-brand)]" />
              <p className="rg-label-2 text-[var(--rg-text-primary)]">{ROLE_COPY[r].title}</p>
            </div>
            <p className="rg-caption mt-1 text-[var(--rg-text-muted)]">{ROLE_COPY[r].job}</p>
            <p className="mt-2 font-mono text-xs text-[var(--rg-text-secondary)]">
              budget {usdz(before[r].budgetCents)}
              {changed ? ` → ${usdz(after[r].budgetCents)}` : ""} *USDZ
            </p>
            <p className="font-mono text-xs text-[var(--rg-text-secondary)]">
              cap {usdz(before[r].capCents)}
              {before[r].capCents !== after[r].capCents ? ` → ${usdz(after[r].capCents)}` : ""} per
              payment
            </p>
          </div>
        )
      })}
    </div>
  )
}

function Timeline({ events, live }: { events: Kit11Event[]; live: boolean }) {
  return (
    <ol className="mt-4 space-y-3 border-l border-[var(--rg-border)] pl-4">
      {events.map((e, i) => (
        <li key={`${e.step}-${i}`} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--rg-brand)]" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="rg-label-2 text-[var(--rg-text-primary)]">
              {e.step.replaceAll("_", " ").toLowerCase()}
            </span>
            <span className="rg-caption text-[var(--rg-text-muted)]">{e.actor}</span>
            {e.outcome ? (
              <span
                className={`rg-caption font-medium ${TONE[e.outcome] ?? "text-[var(--rg-text-secondary)]"}`}
              >
                {e.outcome}
              </span>
            ) : null}
          </div>
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">{e.detail}</p>
          {e.transaction ? (
            live ? (
              <a
                className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--rg-brand)] hover:underline"
                href={`${EXPLORER}${e.transaction}`}
                target="_blank"
                rel="noreferrer"
              >
                tx {short(e.transaction)} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="font-mono text-[11px] text-[var(--rg-text-muted)]">
                sim tx {short(e.transaction)}
              </p>
            )
          ) : null}
          {e.requestId ? (
            <p className="font-mono text-[10px] text-[var(--rg-text-muted)]">{e.requestId}</p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function Invariants({ inv }: { inv: Record<string, boolean> }) {
  const label: Record<string, string> = {
    budgetsWithinTotal: "Three budgets stay inside 20 *USDZ",
    customerNotChargedOnRefusal: "Buyer not charged when sourcing is refused",
    earningsPaidOnce: "Earnings payout paid once (re-send blocked)",
    noUnresolvedUnknown: "No payment left UNKNOWN",
  }
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {Object.entries(inv).map(([k, v]) => (
        <div
          key={k}
          className="flex items-center gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] px-3 py-2"
        >
          {v ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          )}
          <span className="rg-body-2 text-[var(--rg-text-secondary)]">{label[k] ?? k}</span>
        </div>
      ))}
    </div>
  )
}

export default function X402AgentsPage() {
  const [recorded, setRecorded] = React.useState<Recorded | null>(null)
  const [sim, setSim] = React.useState<{ result: RunResult; model: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [approve, setApprove] = React.useState(true)
  const [lostAnswer, setLostAnswer] = React.useState(false)

  React.useEffect(() => {
    fetch("/x402-agents/data")
      .then((r) => r.json())
      .then((d) => setRecorded(d as Recorded))
      .catch(() => setError("Could not load the recorded run"))
  }, [])

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch("/x402-agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, lostAnswer }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      setSim(d)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const live = recorded?.result
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-16">
      <PageHeader
        eyebrow="Airwallex Kit 11 · x402 Business Agents · Metal testnet"
        title="Three agents, one account, limits that move"
        description="A data business sells market data per query over x402 in *USDZ. Three agents spend from one Metal account under on-chain mandates. When the upstream seller raises its price past the sourcing cap, the purchase is refused, the treasury agent proposes new limits inside the 20 *USDZ total, a person approves, and Railguard replaces the mandates. Earnings then move to Airwallex, get converted, and pay a EUR licence fee. Testnet and sandbox only."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-start gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3">
          <Wallet className="mt-0.5 h-4 w-4 text-[var(--rg-brand)]" />
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">
            The account caps each agent on chain. Railguard holds their sum to 20 *USDZ in code.
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-400" />
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">
            A lost answer is UNKNOWN: the same payout is re-sent with the same rg_ id and pays once.
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
          <p className="rg-body-2 text-[var(--rg-text-secondary)]">
            Every payment and refusal is checked from the chain with mandate verify.
          </p>
        </div>
      </div>

      <SectionCard
        title="Run it (simulator)"
        description="Same Railguard code as the testnet run, with an in-memory chain that enforces the same mandate rules. Gemini decides when configured, scripted rules otherwise."
        action={
          <Button className="gap-2" onClick={() => void run()} disabled={busy}>
            <Play className="h-4 w-4" />
            {busy ? "Running…" : "Run Kit 11"}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 rg-body-2 text-[var(--rg-text-secondary)]">
            <input
              type="checkbox"
              checked={approve}
              onChange={(e) => setApprove(e.target.checked)}
            />
            Approve the new limits when asked
          </label>
          <label className="flex items-center gap-2 rg-body-2 text-[var(--rg-text-secondary)]">
            <input
              type="checkbox"
              checked={lostAnswer}
              onChange={(e) => setLostAnswer(e.target.checked)}
            />
            Lose the earnings payout's answer (UNKNOWN drill)
          </label>
        </div>
        {error ? <p className="mt-3 rg-body-2 text-rose-400">{error}</p> : null}
        {sim ? (
          <div className="mt-4 space-y-4">
            <AgentCards before={sim.result.allocationBefore} after={sim.result.allocationAfter} />
            <Invariants inv={sim.result.invariants} />
            <p className="rg-caption text-[var(--rg-text-muted)]">decided by {sim.model}</p>
            <Timeline events={sim.result.events} live={false} />
          </div>
        ) : null}
      </SectionCard>

      {!recorded ? (
        <Skeleton className="h-96 w-full rounded-[var(--rg-radius-xl)]" />
      ) : live ? (
        <SectionCard
          title={`Recorded run on Metal testnet (${recorded.runId})`}
          description={`Real *USDZ on Metal testnet (eip155:63825) and the Airwallex sandbox (${recorded.treasury}). Model: ${recorded.model}. Every tx links to the Metal explorer.`}
        >
          <AgentCards before={live.allocationBefore} after={live.allocationAfter} />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] px-3 py-2">
              <p className="rg-caption text-[var(--rg-text-muted)]">Refusal</p>
              <p className="rg-label-2 text-[var(--rg-text-primary)]">
                {live.refusal?.reason.split(" ")[0] ?? "-"}
              </p>
            </div>
            <div className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] px-3 py-2">
              <p className="rg-caption text-[var(--rg-text-muted)]">Approved option</p>
              <p className="rg-label-2 text-[var(--rg-text-primary)]">
                {live.proposal?.option.id ?? "-"}
              </p>
            </div>
            <div className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] px-3 py-2">
              <p className="rg-caption text-[var(--rg-text-muted)]">Earnings to Airwallex</p>
              <p className="rg-label-2 text-[var(--rg-text-primary)]">
                {live.earnings ? `${usdz(live.earnings.cents)} USD` : "-"}
              </p>
            </div>
            <div className="rounded-[var(--rg-radius-md)] border border-[var(--rg-border)] px-3 py-2">
              <p className="rg-caption text-[var(--rg-text-muted)]">EUR licence fee</p>
              <p className="rg-label-2 text-[var(--rg-text-primary)]">
                {live.licence ? `${live.licence.amount} (${live.licence.status})` : "-"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Invariants inv={live.invariants} />
          </div>
          <p className="mt-4 break-all font-mono text-[11px] text-[var(--rg-text-muted)]">
            account {recorded.addresses.account} · customer {recorded.addresses.customerAccount} ·
            upstream {recorded.addresses.upstream}
          </p>
          <Timeline events={live.events} live />
        </SectionCard>
      ) : null}
    </div>
  )
}
