import Link from "next/link"
import { STELLAR_TESTNET_PROOF as P } from "../../../lib/stellar-public-proof"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"

export const metadata = {
  title: "Stellar testnet verified proof · Railguard",
  description:
    "Public Stellar testnet proof: Horizon settlement verification CONFIRMED for a native XLM payment.",
}

export default function StellarTestnetProofPage() {
  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>Verified testnet settlement</h1>
      <p className="section-intro">
        Horizon-based observe/reconcile: a Stellar testnet payment was verified as{" "}
        <span className="mono">CONFIRMED</span> and recorded in a reproducible evidence manifest.{" "}
        <strong>No sign-in or wallet required</strong> — use Horizon and the repo links below.
      </p>

      <article className="proof-card">
        <header className="proof-card-head">
          <span className="pill pill-ok">CONFIRMED · Horizon verify</span>
          <p className="mono proof-exec-id">{P.transactionHash}</p>
        </header>

        <dl className="proof-dl mono">
          <div>
            <dt>Amount</dt>
            <dd>
              {P.amountHuman} · {P.assetType}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{P.source}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{P.destination}</dd>
          </div>
          <div>
            <dt>Memo</dt>
            <dd>{P.memoPrefix}…</dd>
          </div>
          <div>
            <dt>Transaction</dt>
            <dd>
              <a href={P.explorerUrl} {...EXTERNAL_LINK}>
                {P.transactionHash}
              </a>
            </dd>
          </div>
          <div>
            <dt>Manifest generated</dt>
            <dd>{P.manifestGeneratedAt}</dd>
          </div>
        </dl>
      </article>

      <section className="section">
        <h2>Reproduce locally</h2>
        <p className="section-intro mono">{P.reproduceCommand}</p>
        <p className="section-intro">
          Requires funded Stellar testnet keys in your environment (see{" "}
          <code>docs/P0_TESTNET_COMPLETE.md</code> in the gateway repo).
        </p>
      </section>

      <div className="proof-actions">
        <a href={P.explorerUrl} className="btn btn-mint" {...EXTERNAL_LINK}>
          Inspect on Horizon
        </a>
        <a
          href={`${GITHUB_GATEWAY}/tree/main/${P.evidenceRepoPath}`}
          className="btn btn-ghost"
          {...EXTERNAL_LINK}
        >
          Evidence manifest
        </a>
        <Link href="/ecosystems/stellar" className="btn btn-ghost">
          Stellar integration
        </Link>
        <Link href="/attack" className="btn btn-ghost">
          Failure Lab simulation
        </Link>
      </div>
    </main>
  )
}
