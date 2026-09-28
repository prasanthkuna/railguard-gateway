"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

/** One card per canonical APF class — matches Failure Atlas APF-001…006 */
const ATTACKS = [
  { id: "apf-001", label: "REPLAY / DUPLICATE AUTH", apf: "APF-001" },
  { id: "apf-002", label: "BUDGET RACE", apf: "APF-002" },
  { id: "apf-003", label: "CRASH AFTER BROADCAST", apf: "APF-003" },
  { id: "apf-004", label: "SETTLEMENT MISMATCH", apf: "APF-004" },
  { id: "apf-005", label: "STALE AUTHORIZATION", apf: "APF-005" },
  { id: "apf-006", label: "POLICY BYPASS", apf: "APF-006" },
] as const

const FAILURE_COUNT = ATTACKS.length

type Phase = "idle" | "attacking" | "vulnerable" | "protecting" | "protected" | "blocked"

export function AttackDemo() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [protectedOn, setProtectedOn] = useState(false)

  const runAttack = useCallback(() => {
    setPhase("attacking")
    window.setTimeout(() => {
      setPhase(protectedOn ? "blocked" : "vulnerable")
    }, 1200)
  }, [protectedOn])

  const runProtect = useCallback(() => {
    setPhase("protecting")
    setProtectedOn(true)
    window.setTimeout(() => setPhase("protected"), 800)
  }, [])

  const vulnerable = phase === "vulnerable"
  const blocked = phase === "blocked" || phase === "protected"
  const showOutcome = phase === "vulnerable" || phase === "blocked"

  return (
    <div className="attack-demo">
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
            {phase === "attacking" ? <span className="cursor" /> : null}
          </p>
          {showOutcome && (
            <p className={`mono output ${vulnerable ? "warn" : "ok"}`}>
              {vulnerable
                ? `${FAILURE_COUNT} financial failure classes exposed`
                : `${FAILURE_COUNT}/${FAILURE_COUNT} BLOCKED · RECONCILED`}
            </p>
          )}
          {phase === "protected" && (
            <p className="mono output ok">Protection enabled — ASSURANCE enforce</p>
          )}
          {protectedOn && phase === "blocked" && (
            <p className="mono cmd-line">
              <span className="prompt">$</span> railguard attack
            </p>
          )}
        </div>
      </div>

      <ul className="attack-grid" aria-live="polite">
        {ATTACKS.map((a, i) => {
          const hit = vulnerable
          const safe = blocked
          return (
            <li
              key={a.id}
              className={`attack-chip ${hit ? "hit" : ""} ${safe ? "safe" : ""} ${phase === "attacking" ? "pulse" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="attack-label">{a.label}</span>
              <span className="mono attack-apf">{a.apf}</span>
              <span className="attack-state">
                {safe ? "BLOCKED" : hit ? "EXPOSED" : phase === "idle" ? "—" : "…"}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="attack-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={runAttack}
          disabled={phase === "attacking"}
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
        {vulnerable && (
          <button type="button" className="btn btn-ghost" onClick={runAttack}>
            Attack again
          </button>
        )}
        {blocked && (
          <Link href="/r/demo" className="btn btn-mint">
            View receipt
          </Link>
        )}
      </div>

      <p className="attack-caption">
        Same loop in CI: <span className="mono">npm run lab</span> in Failure Lab ·{" "}
        <span className="mono">railguard attack</span> from Gateway.
      </p>
    </div>
  )
}
