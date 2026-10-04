"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
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
  const attack = ATTACKS[seq]
  if (!attack) return []

  const base = `19:42:01.${220 + seq}`
  const decision = blocked ? "BLOCKED" : "EXPOSED"
  return [
    {
      time: base,
      stage: "attack",
      detail: attack.label.toLowerCase(),
      outcome: "detected",
      tone: "red",
    },
    {
      time: `${base.slice(0, -1)}1`,
      stage: "policy",
      detail: attack.cause,
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
  const [runBlocked, setRunBlocked] = useState(false)

  const runIdRef = useRef(0)
  const timeoutsRef = useRef<number[]>([])

  const clearSequence = useCallback(() => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }, [])

  useEffect(() => () => clearSequence(), [clearSequence])

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timeoutsRef.current.push(id)
    return id
  }, [])

  const runSequence = useCallback(
    (blocked: boolean) => {
      clearSequence()
      const runId = ++runIdRef.current
      setRunBlocked(blocked)
      setPhase("running")
      setActiveAttack(-1)
      setLog([])

      let i = 0
      const tick = () => {
        if (runId !== runIdRef.current) return
        if (i >= FAILURE_COUNT) {
          setPhase(blocked ? "blocked" : "exposed")
          return
        }
        setActiveAttack(i)
        setLog((prev) => [...prev, ...attackTelemetry(i, blocked)])
        i += 1
        schedule(tick, 420)
      }
      tick()
    },
    [clearSequence, schedule],
  )

  const runAttack = useCallback(() => {
    runSequence(protectedOn)
  }, [protectedOn, runSequence])

  const runProtect = useCallback(() => {
    clearSequence()
    runIdRef.current += 1
    setPhase("protecting")
    setProtectedOn(true)
    schedule(() => setPhase("protected"), 600)
  }, [clearSequence, schedule])

  useEffect(() => {
    if (phase !== "protected") return
    const id = schedule(() => runSequence(true), 400)
    return () => window.clearTimeout(id)
  }, [phase, runSequence, schedule])

  const terminalLine =
    phase === "exposed"
      ? `${FAILURE_COUNT} financial failure classes exposed`
      : phase === "blocked"
        ? `${FAILURE_COUNT}/${FAILURE_COUNT} BLOCKED · RECONCILED`
        : null

  const chipOutcome = (i: number): string | null => {
    if (i > activeAttack || phase === "idle") return null
    if (phase === "running") return runBlocked ? "BLOCKED" : "EXPOSED"
    if (phase === "blocked") return "BLOCKED"
    if (phase === "exposed") return "EXPOSED"
    return null
  }

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
            {phase === "idle" && (
              <p className="mono output muted">
                Simulate attacks, then railguard protect, then simulate again.
              </p>
            )}
          </div>
        </div>

        <ul className="attack-grid" aria-live="polite">
          {ATTACKS.map((a, i) => {
            const done = i <= activeAttack && phase !== "idle"
            const outcome = chipOutcome(i)
            const blocked = outcome === "BLOCKED"
            const exposed = outcome === "EXPOSED"
            return (
              <li
                key={a.id}
                className={`attack-chip attack-seq ${exposed ? "hit" : ""} ${blocked ? "safe" : ""} ${i === activeAttack && phase === "running" ? "active-seq" : ""}`}
              >
                <span className="attack-label">{a.label}</span>
                {done ? (
                  <>
                    <span className="attack-cause">{a.cause}</span>
                    <span className="mono attack-state">{outcome ?? "…"}</span>
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
            data-testid="attack-simulate"
            onClick={runAttack}
            disabled={phase === "running" || phase === "protecting"}
          >
            Simulate attack
          </button>
          <button
            type="button"
            className="btn btn-mint"
            onClick={runProtect}
            disabled={protectedOn || phase === "protecting" || phase === "running"}
          >
            railguard protect
          </button>
          {(phase === "blocked" || phase === "exposed") && (
            <Link href="/r/demo" className="btn btn-mint">
              View receipt
            </Link>
          )}
        </div>
      </div>

      <div className="telemetry-panel attack-side-telemetry">
        <div className="telemetry-panel-head">
          <span className="telemetry-sim-label">SIM</span>
          <span className="mono telemetry-panel-title">SIMULATION TRACE</span>
        </div>
        <div className="telemetry-table">
          {log.length === 0 ? (
            <p className="telemetry-empty mono">
              Press Simulate attack to run the client-side trace…
            </p>
          ) : (
            log.map((line) => (
              <div
                key={`${line.time}-${line.stage}-${line.detail}-${line.outcome}`}
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
