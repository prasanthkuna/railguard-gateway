"use client"

import { useEffect, useState } from "react"

type Check = { label: string; result: string; ok: boolean }
type Scene = { ask: string; to: string; checks: Check[]; verdict: string; ok: boolean }

const SCENES: Scene[] = [
  {
    ask: "Pay 7,500 USDC",
    to: "to 0x9f3…c41 · not on the allow list",
    checks: [
      { label: "Recipient allowed", result: "NO", ok: false },
      { label: "Within budget (5,000)", result: "NO", ok: false },
      { label: "Wallet asked to sign", result: "NEVER", ok: false },
    ],
    verdict: "Blocked before signing",
    ok: false,
  },
  {
    ask: "Retry payout #482",
    to: "same request, sent again after a timeout",
    checks: [
      { label: "Same payment id seen", result: "YES", ok: true },
      { label: "Already paid on chain", result: "YES", ok: true },
      { label: "Money sent again", result: "NO", ok: true },
    ],
    verdict: "Paid exactly once",
    ok: true,
  },
  {
    ask: "Pay 500 USDC",
    to: "to supplier · on the allow list",
    checks: [
      { label: "Policy check", result: "ALLOW", ok: true },
      { label: "Budget reserved", result: "LOCKED", ok: true },
      { label: "Matched on chain", result: "CONFIRMED", ok: true },
    ],
    verdict: "Sent, verified, receipt sealed",
    ok: true,
  },
]

export function HeroDecision() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setInterval(() => setI((n) => (n + 1) % SCENES.length), 4200)
    return () => window.clearInterval(t)
  }, [paused])

  const s = SCENES[i] ?? SCENES[0]

  return (
    <div
      className="ui-decision"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div className="ui-decision-top">
        <span>agent_17 · treasury bot</span>
        <span className="ui-mono">example</span>
      </div>
      <p className="ui-decision-ask">{s.ask}</p>
      <p className="ui-decision-to">{s.to}</p>
      <ul className="ui-checks">
        {s.checks.map((c) => (
          <li key={c.label}>
            <span>{c.label}</span>
            <span className={c.ok ? "ui-ok" : "ui-bad"}>{c.result}</span>
          </li>
        ))}
      </ul>
      <div className={`ui-decision-verdict ${s.ok ? "is-ok" : "is-bad"}`}>
        <span>{s.verdict}</span>
        <span aria-hidden="true">{s.ok ? "✓" : "✕"}</span>
      </div>
      <div className="ui-dots">
        {SCENES.map((scene, n) => (
          <button
            key={scene.verdict}
            type="button"
            aria-label={`Show example ${n + 1}`}
            aria-pressed={n === i}
            onClick={() => {
              setI(n)
              setPaused(true)
            }}
          />
        ))}
      </div>
    </div>
  )
}
