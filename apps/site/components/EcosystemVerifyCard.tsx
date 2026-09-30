import Link from "next/link"
import { EXTERNAL_LINK } from "../lib/constants"
import type { EcosystemCard } from "../lib/ecosystems"
import { IntegrationLogo } from "./IntegrationLogo"

export function EcosystemVerifyCard({ eco }: { eco: EcosystemCard }) {
  return (
    <article className="eco-verify-card">
      <header className="eco-verify-head">
        <div className="eco-verify-title">
          <IntegrationLogo id={eco.id} size={28} />
          <h3>{eco.label}</h3>
        </div>
        <span className="pill pill-ok">● {eco.statusLabel}</span>
      </header>
      <ul className="eco-checklist">
        {eco.protects.map((p) => (
          <li key={p}>
            <span>{p}</span>
            <span className="eco-check">✓</span>
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
