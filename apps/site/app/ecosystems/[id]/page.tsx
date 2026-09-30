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
      <p className="eyebrow">Integration</p>
      <h1>{eco.label}</h1>
      <p className="hero-lead">{eco.architectureBlurb}</p>

      <div className="eco-detail-grid" style={{ marginTop: "2rem" }}>
        <EcosystemVerifyCard eco={eco} />
        <section className="eco-detail-panel">
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
          {eco.status === "grant-phase" && eco.grantProgram ? (
            <p className="rg-caption" style={{ marginTop: "1rem" }}>
              Program (in progress): {eco.grantProgram}
              {eco.grantDeadline ? ` · deadline ${eco.grantDeadline}` : ""}
              {eco.grantPortal ? (
                <>
                  {" · "}
                  <a href={eco.grantPortal} {...EXTERNAL_LINK}>
                    External program page
                  </a>
                </>
              ) : null}
            </p>
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
