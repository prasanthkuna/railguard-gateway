import Link from "next/link"
import { notFound } from "next/navigation"
import { EcosystemVerifyCard } from "../../../components/EcosystemVerifyCard"
import { EXTERNAL_LINK, MARKETING_SITE_URL } from "../../../lib/constants"
import { getEcosystemById } from "../../../lib/ecosystems"

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
      <p className="eyebrow">Ecosystem proof</p>
      <h1>{eco.label}</h1>
      <p className="hero-lead">{eco.architectureBlurb}</p>

      <div className="eco-detail-grid" style={{ marginTop: "2rem" }}>
        <EcosystemVerifyCard eco={eco} />
        <section className="eco-detail-panel">
          <h2 className="rg-headline">Grant reviewers</h2>
          <dl className="eco-stats mono">
            <div>
              <dt>One command</dt>
              <dd>{eco.oneCommand}</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>{eco.codePath}</dd>
            </div>
            <div>
              <dt>Rail</dt>
              <dd>{eco.rail}</dd>
            </div>
            {eco.grantProgram ? (
              <div>
                <dt>Program</dt>
                <dd>{eco.grantProgram}</dd>
              </div>
            ) : null}
            {eco.grantDeadline ? (
              <div>
                <dt>Deadline</dt>
                <dd>{eco.grantDeadline}</dd>
              </div>
            ) : null}
          </dl>
          {eco.grantPortal ? (
            <a href={eco.grantPortal} className="btn btn-accent" {...EXTERNAL_LINK}>
              Open submission portal
            </a>
          ) : null}
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/ecosystems">← All ecosystems</Link>
            {" · "}
            <a href={`${MARKETING_SITE_URL}/attack`}>Failure Lab</a>
          </p>
        </section>
      </div>
    </main>
  )
}
