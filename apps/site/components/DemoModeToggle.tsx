"use client"

import type { TelemetryMode } from "../lib/telemetry"

const MODES: { id: TelemetryMode; label: string }[] = [
  { id: "normal", label: "NORMAL" },
  { id: "attack", label: "ATTACK" },
  { id: "failure", label: "FAILURE" },
]

type Props = {
  value: TelemetryMode
  onChange: (mode: TelemetryMode) => void
  className?: string
}

export function DemoModeToggle({ value, onChange, className = "" }: Props) {
  return (
    <div className={`mode-toggle ${className}`} role="tablist" aria-label="Execution demo mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={value === m.id}
          className={`mode-toggle-btn ${value === m.id ? "active" : ""}`}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
