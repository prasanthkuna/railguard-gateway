import Link from "next/link"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"
import { ARC_MAINNET_PROOF as P } from "../../../lib/arc-public-proof"

export const metadata = {
  title: "Arc mainnet verified proof",
  description:
    "Public Arc mainnet proof: USDC settlement independently verified from on-chain receipt logs.",
  alternates: { canonical: "/proof/arc-mainnet" },
}

export default function ArcMainnetProofPage() {
  const confirmed = P.status === "CONFIRMED" && P.txHash.length > 0

  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>Verified Arc settlement</h1>
      {confirmed ? (
        <>
          <p className="section-intro">
            Railguard read the transaction receipt, matched the USDC <code>Transfer</code> event against
            the expected token, sender, recipient, and amount, and recorded the result as{" "}
            <span className="mono">CONFIRMED</span>. External-wallet proof on Circle Arc (USDC-native
            gas). <strong>No sign-in required</strong> to inspect the evidence.
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
          Arc mainnet evidence is generated locally after a <strong>minimal 0.01 USDC</strong> proof
          transfer on chain <span className="mono">5042</span>. Bridge USDC via Circle CCTP, run{" "}
          <span className="mono">bun run arc-mainnet-usdc-proof</span>, then{" "}
          <span className="mono">bun run sync-arc-public-proof</span> and redeploy the site. See{" "}
          <span className="mono">docs/grants/ARC_MICROGRANT_SUBMIT.md</span> in the repo.
        </p>
      )}

      <section className="section">
        <h2>Reproduce independently</h2>
        <p className="section-intro mono">{P.reproduceCommand}</p>
      </section>

      <div className="proof-actions">
        {confirmed ? (
          <a href={P.explorerUrl} className="btn btn-mint" {...EXTERNAL_LINK}>
            Inspect transaction
          </a>
        ) : null}
        <a
          href={`${GITHUB_GATEWAY}/tree/main/${P.evidenceRepoPath}`}
          className="btn btn-ghost"
          {...EXTERNAL_LINK}
        >
          Evidence manifest
        </a>
        <Link href="/ecosystems/arc" className="btn btn-ghost">
          Arc integration
        </Link>
        <Link href="/attack" className="btn btn-ghost">
          Failure Lab
        </Link>
      </div>
    </main>
  )
}
