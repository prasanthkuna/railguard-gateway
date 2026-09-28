"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import type { TelemetryLine } from "../lib/telemetry"

const ATTACKS = [
  { id: "apf-001", label: "APF-001 REPLAY", cause: "nonce consumed" },
  { id: "apf-002", label: "APF-002 BUDGET RACE", cause: "reservation conflict" },
  { id: "apf-003", label: "APF-003 CRASH AFTER BROADCAST", cause: "state unknown → reconciled" },
  { id: "apf-004", label: "APF-004 SETTLEMENT MISMATCH", cause: "amount mismatch" },
  { id: "apf-005", label: "APF-005 STALE AUTH", cause: "grant expired" },
  { id: "apf-006", label: "APF-006 POLICY BYPASS", cause: "hook enforced" },
] as const

const FAILURE_COUNT = ATTACKS.length

type Phase = "idle" | "running" | "exposed" | "protecting" | "protected" | "blocked"

function attackTelemetry(seq: number, blocked: boolean): TelemetryLine[] {
  const base = `19:42:01.${220 + seq}`
  const decision = blocked ? "BLOCKED" : "EXPOSED"
  return [
    {
      time: base,
      stage: "attack",
      detail: ATTACKS[seq].label.toLowerCase(),
      outcome: "detected",
      tone: "red",
    },
    {
      time: `${base.slice(0, -1)}1`,
      stage: "policy",
      detail: ATTACKS[seq].cause,
      outcome: blocked ? "DENY" : "GAP",
      tone: blocked ? "red" : "amber",
    },
    {
      time: `${base.slice(0, -1)}3`,
      stage: "execution",
      detail: "—",
      outcome: decision,
      tone: blocked ? "mint" : "red",
    },
  ]
}

export function AttackDemo() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [protectedOn, setProtectedOn] = useState(false)
  const [activeAttack, setActiveAttack] = useState(-1)
  const [log, setLog] = useState<TelemetryLine[]>([])

  const runSequence = useCallback((blocked: boolean) => {
    setPhase("running")
    setActiveAttack(-1)
    setLog([])
    let i = 0
    const tick = () => {
      if (i >= FAILURE_COUNT) {
        setPhase(blocked ? "blocked" : "exposed")
        return
      }
      setActiveAttack(i)
      setLog((prev) => [...prev, ...attackTelemetry(i, blocked)])
      i += 1
      window.setTimeout(tick, 420)
    }
    tick()
  }, [])

  const runAttack = useCallback(() => {
    runSequence(protectedOn)
  }, [protectedOn, runSequence])

  const runProtect = useCallback(() => {
    setPhase("protecting")
    setProtectedOn(true)
    window.setTimeout(() => setPhase("protected"), 600)
  }, [])

  useEffect(() => {
    if (phase === "protected") {
      const t = window.setTimeout(() => runSequence(true), 400)
      return () => window.clearTimeout(t)
    }
  }, [phase, runSequence])

  const terminalLine =
    phase === "exposed"
      ? `${FAILURE_COUNT} financial failure classes exposed`
      : phase === "blocked"
        ? `${FAILURE_COUNT}/${FAILURE_COUNT} BLOCKED · RECONCILED`
        : null

  return (
    <div className="attack-demo-layout">
      <div className="attack-demo-main">
        <div className="attack-terminal">
          <div className="terminal-bar">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <span className="mono terminal-title">unsafe-agent · treasury</span>
          </div>
          <div className="terminal-body">
            <p className="mono cmd-line">
              <span className="prompt">$</span> railguard attack
            </p>
            {terminalLine ? <p className="mono output warn">{terminalLine}</p> : null}
            {phase === "protected" && (
              <p className="mono output ok">Protection enabled — ASSURANCE enforce</p>
            )}
          </div>
        </div>

        <ul className="attack-grid" aria-live="polite">
          {ATTACKS.map((a, i) => {
            const done = i <= activeAttack && phase !== "idle"
            const blocked = phase === "blocked" && done
            const exposed = phase === "exposed" && done
            return (
              <li
                key={a.id}
                className={`attack-chip attack-seq ${exposed ? "hit" : ""} ${blocked ? "safe" : ""} ${i === activeAttack ? "active-seq" : ""}`}
              >
                <span className="attack-label">{a.label}</span>
                {done ? (
                  <>
                    <span className="attack-cause">{a.cause}</span>
                    <span className="mono attack-state">
                      {blocked ? "BLOCKED" : exposed ? "EXPOSED" : "…"}
                    </span>
                  </>
                ) : (
                  <span className="attack-state">—</span>
                )}
              </li>
            )
          })}
        </ul>

        <div className="attack-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={runAttack}
            disabled={phase === "running"}
          >
            Run attack
          </button>
          <button
            type="button"
            className="btn btn-mint"
            onClick={runProtect}
            disabled={protectedOn || phase === "protecting"}
          >
            railguard protect
          </button>
          {phase === "blocked" && (
            <Link href="/r/demo" className="btn btn-mint">
              View receipt
            </Link>
          )}
        </div>
      </div>

      <div className="telemetry-panel attack-side-telemetry">
        <div className="telemetry-panel-head">
          <span className="telemetry-live-dot" />
          <span className="mono telemetry-panel-title">ATTACK TELEMETRY</span>
        </div>
        <div className="telemetry-table">
          {log.length === 0 ? (
            <p className="telemetry-empty mono">awaiting railguard attack…</p>
          ) : (
            log.map((line) => (
              <div
                key={`${line.time}-${line.stage}-${line.detail}`}
                className={`telemetry-row tone-${line.tone}`}
              >
                <span className="mono telemetry-time">{line.time}</span>
                <span className="mono telemetry-stage">{line.stage}</span>
                <span className="telemetry-detail">{line.detail}</span>
                <span className="mono telemetry-outcome">{line.outcome}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
