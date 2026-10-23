import Link from "next/link"
import { ARC_MAINNET_PROOF as P } from "../../../lib/arc-public-proof"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"

const ARC_CONFIRMED = P.status === "CONFIRMED" && P.txHash.length > 0

export const metadata = {
  title: ARC_CONFIRMED ? "Arc mainnet verified proof" : "Arc mainnet: not live yet",
  description: ARC_CONFIRMED
    ? "Public Arc mainnet proof: USDC settlement independently verified from on-chain receipt logs."
    : "Arc mainnet settlement proof is pending: no mainnet transaction has been verified yet.",
  alternates: { canonical: "/proof/arc-mainnet" },
  robots: ARC_CONFIRMED ? { index: true, follow: true } : { index: false, follow: true },
}

export default function ArcMainnetProofPage() {
  const confirmed = ARC_CONFIRMED

  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>{confirmed ? "Verified Arc settlement" : "Arc mainnet: not live yet"}</h1>
      {confirmed ? (
        <>
          <p className="section-intro">
            Railguard read the transaction receipt, matched the USDC <code>Transfer</code> event
            against the expected token, sender, recipient, and amount, and recorded the result as{" "}
            <span className="mono">CONFIRMED</span>. External-wallet proof on Circle Arc
            (USDC-native gas). <strong>No sign-in required</strong> to inspect the evidence.
          </p>
          <article className="proof-card">
            <header className="proof-card-head">
              <span className="pill pill-ok">CONFIRMED · receipt log matched</span>
              <p className="mono proof-exec-id">{P.txHash}</p>
            </header>
            <dl className="proof-dl mono">
              <div>
                <dt>Amount</dt>
                <dd>
                  {P.amountHuman} · {P.amountBaseUnits} base units (6 dec)
                </dd>
              </div>
              <div>
                <dt>Sender</dt>
                <dd>{P.sender}</dd>
              </div>
              <div>
                <dt>Recipient</dt>
                <dd>{P.recipient}</dd>
              </div>
              <div>
                <dt>Token (USDC)</dt>
                <dd>{P.tokenAddress}</dd>
              </div>
              <div>
                <dt>Transaction</dt>
                <dd>
                  <a href={P.explorerUrl} {...EXTERNAL_LINK}>
                    {P.txHash}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Manifest generated</dt>
                <dd>{P.manifestGeneratedAt}</dd>
              </div>
            </dl>
          </article>
        </>
      ) : (
        <p className="section-intro">
          Not live yet. Railguard's Arc settlement checker is built, but no Arc mainnet payment has
          been verified, so there is nothing to show here. This page will list the transaction once
          one is confirmed. Until then, see the{" "}
          <Link href="/proof">confirmed proofs on other networks</Link>.
        </p>
      )}

      {confirmed ? (
        <section className="section">
          <h2>Reproduce independently</h2>
          <p className="section-intro mono">{P.reproduceCommand}</p>
        </section>
      ) : null}

      <div className="proof-actions">
        {confirmed ? (
          <a href={P.explorerUrl} className="btn btn-mint" {...EXTERNAL_LINK}>
            Inspect transaction
          </a>
        ) : null}
        {confirmed ? (
          <a
            href={`${GITHUB_GATEWAY}/blob/main/${P.evidenceRepoPath}`}
            className="btn btn-ghost"
            {...EXTERNAL_LINK}
          >
            Evidence manifest
          </a>
        ) : null}
        <Link href="/proof#arc" className="btn btn-ghost">
          Arc status
        </Link>
        <Link href="/demo" className="btn btn-ghost">
          Try the demo
        </Link>
      </div>
    </main>
  )
}
