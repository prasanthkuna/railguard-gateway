"use client"

import { useEffect, useState } from "react"
import type { TelemetryLine, TelemetryMode } from "../lib/telemetry"
import { TELEMETRY_BY_MODE } from "../lib/telemetry"

type Props = {
  mode: TelemetryMode
  title?: string
  animateIn?: boolean
  className?: string
  maxLines?: number
}

export function ExecutionTelemetry({
  mode,
  title = "LIVE EXECUTION TELEMETRY",
  animateIn = true,
  className = "",
  maxLines,
}: Props) {
  const lines = TELEMETRY_BY_MODE[mode]
  const [visible, setVisible] = useState(animateIn ? 0 : lines.length)

  useEffect(() => {
    if (!animateIn) {
      setVisible(lines.length)
      return
    }
    setVisible(0)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setVisible(i)
      if (i >= lines.length) window.clearInterval(id)
    }, 180)
    return () => window.clearInterval(id)
  }, [animateIn, lines])

  const shown = maxLines ? lines.slice(0, maxLines) : lines

  return (
    <div className={`telemetry-panel ${className}`}>
      <div className="telemetry-panel-head">
        <span className="telemetry-live-dot" aria-hidden />
        <span className="mono telemetry-panel-title">{title}</span>
      </div>
      <div className="telemetry-table" role="log" aria-live="polite">
        {shown.map((line, idx) => (
          <TelemetryRow
            key={`${mode}-${line.time}-${line.stage}`}
            line={line}
            hidden={animateIn && idx >= visible}
          />
        ))}
      </div>
    </div>
  )
}

function TelemetryRow({ line, hidden }: { line: TelemetryLine; hidden: boolean }) {
  return (
    <div className={`telemetry-row tone-${line.tone} ${hidden ? "telemetry-row-hidden" : ""}`}>
      <span className="mono telemetry-time">{line.time}</span>
      <span className="mono telemetry-stage">{line.stage}</span>
      <span className="telemetry-detail">{line.detail}</span>
      <span className="mono telemetry-outcome">{line.outcome}</span>
    </div>
  )
}
