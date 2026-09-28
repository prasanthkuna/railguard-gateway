"use client"

import { useState } from "react"
import type { ReceiptViewModel } from "../lib/demo-receipt"

const EVENTS = (data: ReceiptViewModel) => [
  { time: "12:42:15", label: "Intent created", detail: data.intent.id },
  { time: "12:42:15", label: "Policy", detail: data.policy.decision },
  { time: "12:42:15", label: "Reserved", detail: `${data.intent.amount} ${data.intent.asset}` },
  { time: "12:42:16", label: "Transaction submitted", detail: data.execution.txHash },
  { time: "12:42:18", label: "Settlement observed", detail: data.reconciliation.settlement },
  { time: "12:42:18", label: "Reconciliation", detail: "MATCHED" },
  { time: "12:42:18", label: "Evidence sealed", detail: `${data.evidenceHash.slice(0, 12)}…` },
]

export function ReceiptTimeline({ data }: { data: ReceiptViewModel }) {
  const [copied, setCopied] = useState(false)
  const events = EVENTS(data)

  const copyProof = async () => {
    const text = [
      `Railguard receipt ${data.executionId}`,
      `${data.intent.amount} ${data.intent.asset} → ${data.intent.recipient}`,
      `Policy: ${data.policy.version} ${data.policy.decision}`,
      `Tx: ${data.execution.txHash}`,
      `Evidence: ${data.evidenceHash}`,
    ].join("\n")
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article className="receipt-timeline-card">
      <header className="receipt-timeline-head">
        <div>
          <p className="receipt-amount">
            {data.intent.amount} {data.intent.asset} →{" "}
            <span className="mono">{data.intent.recipient}</span>
          </p>
          <p className={`pill ${data.chainValid ? "pill-ok" : "pill-bad"}`}>
            {data.chainValid ? "✓ EVIDENCE VALID" : "NEEDS REVIEW"}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copyProof}>
          {copied ? "Copied" : "Copy proof"}
        </button>
      </header>

      <ol className="receipt-timeline">
        {events.map((e, i) => (
          <li key={e.label}>
            <span className="mono receipt-tl-time">{e.time}</span>
            <div className="receipt-tl-body">
              <span className="receipt-tl-label">{e.label}</span>
              <span className="mono receipt-tl-detail">{e.detail}</span>
            </div>
            {i < events.length - 1 ? <span className="receipt-tl-connector" aria-hidden /> : null}
          </li>
        ))}
      </ol>

      <div className="receipt-hashes">
        <div>
          <span className="hash-label">POLICY HASH</span>
          <p className="mono">{data.policy.version}</p>
        </div>
        <div>
          <span className="hash-label">TX HASH</span>
          <p className="mono">{data.execution.txHash}</p>
        </div>
        <div>
          <span className="hash-label">EVIDENCE HASH</span>
          <p className="mono hash-block">{data.evidenceHash}</p>
        </div>
      </div>
    </article>
  )
}
