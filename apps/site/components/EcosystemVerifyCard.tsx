import Link from "next/link"
import { EXTERNAL_LINK } from "../lib/constants"
import type { EcosystemCard } from "../lib/ecosystems"
import { IntegrationLogo } from "./IntegrationLogo"

function pillClass(status: EcosystemCard["status"], evidenceStatus?: string) {
  if (status === "grant-phase") return "pill pill-planned"
  if (status === "adapter") return "pill pill-warn"
  if (evidenceStatus === "VERIFIED" || status === "shipped") return "pill pill-ok"
  if (status === "testnet" || status === "integrated") return "pill pill-ok"
  return "pill pill-warn"
}

function showChecks(status: EcosystemCard["status"]) {
  return status !== "grant-phase"
}

export function EcosystemVerifyCard({ eco }: { eco: EcosystemCard }) {
  const checks = showChecks(eco.status)

  return (
    <article className={`eco-verify-card ${eco.status === "grant-phase" ? "eco-planned" : ""}`}>
      <header className="eco-verify-head">
        <div className="eco-verify-title">
          <IntegrationLogo id={eco.id} size={28} />
          <h3>{eco.label}</h3>
        </div>
        <span className={pillClass(eco.status, eco.evidenceStatus)}>● {eco.statusLabel}</span>
      </header>
      <ul className="eco-checklist">
        {eco.protects.map((p) => (
          <li key={p}>
            <span>{p}</span>
            {checks ? <span className="eco-check">✓</span> : <span className="eco-dash">—</span>}
          </li>
        ))}
      </ul>
      <p className="eco-apf-block">
        <span className="eco-apf-label">Failure coverage</span>
        <span className="mono">{eco.apf.join(" · ")}</span>
      </p>
      {eco.lastProof ? (
        <dl className="eco-stats mono">
          <div>
            <dt>Last proof</dt>
            <dd>{eco.lastProof}</dd>
          </div>
          {eco.transactions != null ? (
            <div>
              <dt>Transactions</dt>
              <dd>{eco.transactions}</dd>
            </div>
          ) : null}
          {eco.failuresTested != null ? (
            <div>
              <dt>Failures tested</dt>
              <dd>{eco.failuresTested}</dd>
            </div>
          ) : null}
          {eco.evidenceStatus ? (
            <div>
              <dt>Evidence</dt>
              <dd>{eco.evidenceStatus}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="eco-narrative">{eco.narrative}</p>
      <p className="rg-caption" style={{ marginTop: "0.75rem" }}>
        <Link href={`/ecosystems/${eco.id}`}>Integration details →</Link>
      </p>
      <div className="eco-verify-actions">
        <a href={eco.evidenceHref} className="btn btn-ghost btn-sm" {...EXTERNAL_LINK}>
          {eco.evidenceLabel ?? "View evidence"}
        </a>
        {eco.secondaryHref ? (
          <a href={eco.secondaryHref} className="btn btn-ghost btn-sm" {...EXTERNAL_LINK}>
            {eco.secondaryLabel ?? "Docs"}
          </a>
        ) : null}
      </div>
      <p className="mono eco-try">Try: railguard attack</p>
    </article>
  )
}
