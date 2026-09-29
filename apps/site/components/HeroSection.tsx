"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { GITHUB_GATEWAY } from "../lib/constants"
import type { TelemetryMode } from "../lib/telemetry"
import { AnimatedHeroLogo } from "./AnimatedHeroLogo"
import { DemoModeToggle } from "./DemoModeToggle"
import { ExecutionRail } from "./ExecutionRail"
import { ExecutionTelemetry } from "./ExecutionTelemetry"

export function HeroSection() {
  const [mode, setMode] = useState<TelemetryMode>("normal")
  const [autoPhase, setAutoPhase] = useState<"normal" | "attack">("normal")

  useEffect(() => {
    if (mode !== "normal") return
    const t = window.setTimeout(() => setAutoPhase("attack"), 5000)
    return () => window.clearTimeout(t)
  }, [mode])

  const displayMode: TelemetryMode = mode === "normal" && autoPhase === "attack" ? "attack" : mode

  return (
    <section className="hero-split">
      <div className="hero-copy">
        <AnimatedHeroLogo />
        <p className="eyebrow">v0.1.0-alpha · open source</p>
        <h1>Can your AI agent spend money safely?</h1>
        <p className="hero-lead">
          <strong>Railguard</strong> is the financial execution firewall between autonomous software
          and the wallet you already use.
        </p>
        <div className="hero-ctas">
          <Link href="/attack" className="btn btn-mint">
            Run 6 attacks
          </Link>
          <a href={GITHUB_GATEWAY} className="btn btn-ghost">
            GitHub
          </a>
        </div>
        <p className="hero-loop mono">
          railguard attack → protect → <span>6/6 blocked</span> → receipt
        </p>
      </div>
      <div className="hero-visual">
        <DemoModeToggle
          value={displayMode}
          onChange={(m) => {
            setMode(m)
            setAutoPhase("normal")
          }}
        />
        <ExecutionRail mode={displayMode} />
        <ExecutionTelemetry mode={displayMode} animateIn key={displayMode} />
      </div>
    </section>
  )
}
