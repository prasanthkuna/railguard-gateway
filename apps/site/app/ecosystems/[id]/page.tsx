import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EcosystemVerifyCard } from "../../../components/EcosystemVerifyCard"
import { getEcosystemById } from "../../../lib/ecosystems"
import { internalSitePath } from "../../../lib/site-links"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const eco = getEcosystemById(id)
  if (!eco) return { title: "Integration · Railguard" }
  return {
    title: `${eco.label} integration`,
    description: eco.narrative,
    alternates: { canonical: `/ecosystems/${id}` },
  }
}

export function generateStaticParams() {
  return [
    { id: "x402" },
    { id: "cdp" },
    { id: "base" },
    { id: "arbitrum" },
    { id: "monad" },
    { id: "arc" },
    { id: "stellar" },
    { id: "celo" },
    { id: "airwallex" },
    { id: "failure-lab" },
  ]
}

export default async function EcosystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const eco = getEcosystemById(id)
  if (!eco) notFound()

  return (
    <main className="page page-wide">
      <p className="eyebrow">Integration</p>
      <h1>{eco.label}</h1>
      <p className="hero-lead">{eco.architectureBlurb}</p>

      <div className="eco-detail-grid" style={{ marginTop: "2rem" }}>
        <EcosystemVerifyCard eco={eco} showDetailsLink={false} />
        <section className="eco-detail-panel">
          {internalSitePath(eco.evidenceHref) ? (
            <p style={{ marginBottom: "1rem" }}>
              <Link href={internalSitePath(eco.evidenceHref)!} className="btn btn-mint btn-sm">
                {eco.evidenceLabel ?? "Public proof"}
              </Link>
            </p>
          ) : null}
          <h2 className="rg-headline">Reproduce this proof</h2>
          <p className="rg-body" style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            Same commands and repo paths we use for testnet verification.
          </p>
          <dl className="eco-stats mono">
            {eco.oneCommand ? (
              <div>
                <dt>Verify</dt>
                <dd>{eco.oneCommand}</dd>
              </div>
            ) : null}
            <div>
              <dt>Code</dt>
              <dd>{eco.codePath}</dd>
            </div>
            <div>
              <dt>Rail</dt>
              <dd>{eco.rail}</dd>
            </div>
          </dl>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/ecosystems">← All ecosystems</Link>
            {" · "}
            <Link href="/attack">Failure Lab</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
