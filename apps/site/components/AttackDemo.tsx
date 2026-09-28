"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

const ATTACKS = [
  { id: "replay", label: "REPLAY", apf: "APF-001" },
  { id: "duplicate", label: "DUPLICATE", apf: "APF-001" },
  { id: "race", label: "BUDGET RACE", apf: "APF-002" },
  { id: "stale", label: "STALE AUTH", apf: "APF-005" },
  { id: "recipient", label: "WRONG RECIPIENT", apf: "APF-004" },
  { id: "mismatch", label: "EXECUTION MISMATCH", apf: "APF-004" },
]

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
  const failuresFound = vulnerable ? 5 : blocked ? 0 : null

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
          {(phase === "vulnerable" || phase === "blocked") && (
            <p className="mono output warn">
              {vulnerable ? "5 financial failures found" : "5/5 BLOCKED"}
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
          const hit = vulnerable && i < 5
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
        {failuresFound !== null && vulnerable && (
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
