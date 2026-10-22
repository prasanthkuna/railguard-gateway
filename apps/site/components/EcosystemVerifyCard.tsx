import Link from "next/link"
import type { ReactNode } from "react"
import { EXTERNAL_LINK } from "../lib/constants"
import type { EcosystemCard } from "../lib/ecosystems"
import { internalSitePath } from "../lib/site-links"
import { IntegrationLogo } from "./IntegrationLogo"

function EvidenceLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: ReactNode
}) {
  const path = internalSitePath(href)
  if (path) {
    return (
      <Link href={path} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} {...EXTERNAL_LINK}>
      {children}
    </a>
  )
}

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

export function EcosystemVerifyCard({
  eco,
  showDetailsLink = true,
}: {
  eco: EcosystemCard
  /** Hide on `/ecosystems/[id]` — card is already on the detail page. */
  showDetailsLink?: boolean
}) {
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
      {showDetailsLink ? (
        <p className="rg-caption" style={{ marginTop: "0.75rem" }}>
          <Link href={`/ecosystems/${eco.id}`}>Integration details →</Link>
        </p>
      ) : null}
      <div className="eco-verify-actions">
        <EvidenceLink href={eco.evidenceHref} className="btn btn-ghost btn-sm">
          {eco.evidenceLabel ?? "View evidence"}
        </EvidenceLink>
        {eco.secondaryHref ? (
          <a href={eco.secondaryHref} className="btn btn-ghost btn-sm" {...EXTERNAL_LINK}>
            {eco.secondaryLabel ?? "Docs"}
          </a>
        ) : null}
      </div>
      {eco.oneCommand ? <p className="mono eco-try">Try: {eco.oneCommand}</p> : null}
    </article>
  )
}
