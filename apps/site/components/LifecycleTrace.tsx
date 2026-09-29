"use client"

import { useEffect, useRef, useState } from "react"
import { LIFECYCLE_STEPS, TELEMETRY_BY_MODE } from "../lib/telemetry"
import { ExecutionTelemetry } from "./ExecutionTelemetry"

const STEP_MODES = ["normal", "normal", "normal", "normal", "failure", "failure", "normal"] as const

export function LifecycleTrace() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const elements = refs.current.filter(Boolean) as HTMLElement[]
    for (let idx = 0; idx < elements.length; idx++) {
      const el = elements[idx]
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(idx)
        },
        { rootMargin: "-35% 0px -45% 0px", threshold: 0 },
      )
      obs.observe(el)
      observers.push(obs)
    }
    return () => {
      for (const o of observers) o.disconnect()
    }
  }, [])

  const telemetryMode = STEP_MODES[active] ?? "normal"

  return (
    <section className="section lifecycle-trace" id="lifecycle">
      <h2>Watch Railguard decide</h2>
      <p className="section-intro">
        Every autonomous payment follows the same financial-control lifecycle.
      </p>
      <div className="lifecycle-trace-grid">
        <div className="lifecycle-steps-col">
          {LIFECYCLE_STEPS.map((step, idx) => (
            <article
              key={step.key}
              ref={(el) => {
                refs.current[idx] = el
              }}
              className={`lifecycle-step-panel ${idx <= active ? "active" : ""}`}
            >
              <div className="lifecycle-rail-marker">
                <span className={`lifecycle-dot ${idx <= active ? "on" : ""}`} />
                {idx < LIFECYCLE_STEPS.length - 1 ? <span className="lifecycle-line" /> : null}
              </div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="lifecycle-sticky">
          <ExecutionTelemetry
            mode={telemetryMode}
            title="LIFECYCLE TRACE"
            animateIn={false}
            maxLines={Math.min(active + 2, TELEMETRY_BY_MODE[telemetryMode].length)}
          />
        </div>
      </div>
    </section>
  )
}
