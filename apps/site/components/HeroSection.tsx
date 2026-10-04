"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"
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
        <p className="eyebrow">v0.1.0-alpha · open source · testnet</p>
        <h1>Stop agent payment mistakes before they become losses.</h1>
        <p className="hero-lead">
          <strong>Railguard</strong> applies policy before a wallet signs, tracks uncertain
          broadcasts, and produces tamper-evident execution records—without taking custody.
        </p>
        <div className="hero-ctas">
          <Link href="/attack" className="btn btn-mint">
            Simulate six failures
          </Link>
          <Link href="/proof/arbitrum-sepolia" className="btn btn-ghost">
            View verified testnet proof
          </Link>
          <Link href="#integrate" className="btn btn-ghost">
            CLI &amp; MCP setup
          </Link>
          <a href={GITHUB_GATEWAY} className="btn btn-ghost" {...EXTERNAL_LINK}>
            GitHub
          </a>
        </div>
        <p className="hero-loop mono">
          simulate → protect → <span>6/6 blocked</span> → sample receipt
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
