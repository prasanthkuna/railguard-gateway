"use client"

import type { TelemetryMode } from "../lib/telemetry"

const STAGES = [
  { key: "policy", label: "POLICY" },
  { key: "reserve", label: "RESERVE" },
  { key: "execute", label: "EXECUTE" },
  { key: "observe", label: "OBSERVE" },
  { key: "reconcile", label: "RECONCILE" },
  { key: "evidence", label: "EVIDENCE" },
] as const

type Props = {
  mode: TelemetryMode
  agent?: string
  amount?: string
}

export function ExecutionRail({ mode, agent = "agent_17", amount = "500 USDC" }: Props) {
  const attack = mode === "attack"
  const failure = mode === "failure"

  const stageState = (label: string): { value: string; tone: string } => {
    if (attack) {
      if (label === "POLICY") return { value: "DENY", tone: "red" }
      if (label === "EXECUTE") return { value: "BLOCKED", tone: "red" }
      return { value: "—", tone: "muted" }
    }
    if (failure) {
      if (label === "OBSERVE") return { value: "UNKNOWN → CONFIRMED", tone: "amber" }
      if (label === "RECONCILE") return { value: "FINALIZED", tone: "mint" }
      if (label === "EVIDENCE") return { value: "SEALED", tone: "mint" }
    }
    if (label === "POLICY") return { value: "ALLOW", tone: "mint" }
    if (label === "RESERVE") return { value: amount, tone: "amber" }
    if (label === "EXECUTE") return { value: "tx_82af", tone: "neutral" }
    if (label === "OBSERVE") return { value: "CONFIRMED", tone: "blue" }
    if (label === "RECONCILE") return { value: "MATCHED", tone: "mint" }
    return { value: "SEALED", tone: "mint" }
  }

  return (
    <div className="execution-rail">
      <p className="mono rail-meta">{agent}</p>
      <p className="rail-intent">
        wants <strong>{attack ? "7,500 USDC" : amount}</strong>
        {attack ? <span className="rail-warn"> → unknown recipient</span> : null}
      </p>
      <div className="rail-gate-box">
        <span className="rail-gate-label">RAILGUARD</span>
      </div>
      <ul className="rail-stages">
        {STAGES.map((s) => {
          const st = stageState(s.label)
          return (
            <li key={s.key} className="rail-stage">
              <span className="mono rail-stage-name">{s.label}</span>
              <span className={`mono rail-stage-value tone-${st.tone}`}>{st.value}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
