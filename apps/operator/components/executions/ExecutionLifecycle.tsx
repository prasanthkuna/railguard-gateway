"use client"

import * as React from "react"
import { formatExecutionStatus, formatRailLabel } from "../../lib/executionStatusLabels"
import type { V5EvidenceExplain, V5ExecutionResponse } from "../../lib/types"
import { SectionCard } from "../design-system"
import { Button } from "../ui/Button"

import { SITE_URL } from "../../lib/site-url"

function steps(explain: V5EvidenceExplain, execution: V5ExecutionResponse) {
  return [
    { label: "Intent", detail: execution.intentId },
    { label: "Authorize", detail: `${explain.policyVersion} · ${explain.decision.toUpperCase()}` },
    { label: "Reserve", detail: explain.budget ?? explain.requested },
    { label: "Execute", detail: formatExecutionStatus(execution.status) },
    { label: "Observe", detail: formatRailLabel(explain.rail) },
    { label: "Reconcile", detail: explain.settlement },
    {
      label: "Evidence",
      detail: explain.evidenceValid ? "Envelope complete" : "NEEDS REVIEW",
    },
  ]
}

export function ExecutionLifecycle({
  execution,
  explain,
}: {
  execution: V5ExecutionResponse
  explain: V5EvidenceExplain
}) {
  const [copied, setCopied] = React.useState(false)
  const timeline = steps(explain, execution)

  const copyProof = async () => {
    const text = [
      `Railguard execution ${execution.executionId}`,
      `Intent: ${execution.intentId}`,
      `Agent: ${explain.agent}`,
      `Requested: ${explain.requested}`,
      `Policy: ${explain.policyVersion} ${explain.decision}`,
      `Settlement: ${explain.settlement}`,
      `Evidence: ${explain.evidenceValid ? "VALID" : "INVALID"}`,
    ].join("\n")
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SectionCard title="Financial-control lifecycle">
      <ol className="op-lifecycle">
        {timeline.map((step, i) => (
          <li key={step.label} className="op-lifecycle-step">
            <span className="op-lifecycle-dot" aria-hidden />
            <div>
              <span className="op-lifecycle-label">{step.label}</span>
              <span className="op-lifecycle-detail font-mono text-sm">{step.detail}</span>
            </div>
            {i < timeline.length - 1 ? <span className="op-lifecycle-line" aria-hidden /> : null}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={copyProof}>
          {copied ? "Copied" : "Copy proof"}
        </Button>
        <a
          href={`${SITE_URL}/r/demo`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-[var(--rg-radius-pill)] px-3.5 text-sm font-semibold text-[var(--rg-text-secondary)] hover:bg-[var(--rg-bg-hover)]"
        >
          Sample public receipt
        </a>
      </div>
    </SectionCard>
  )
}
