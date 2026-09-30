import Link from "next/link"
import { ARBITRUM_SEPOLIA_PROOF as P } from "../../../lib/arbitrum-public-proof"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"

export const metadata = {
  title: "Arbitrum Sepolia verified proof · Railguard",
  description:
    "Public testnet proof: external-wallet USDC settlement verified and recorded as SETTLED, separate from hook contract deployment.",
}

export default function ArbitrumSepoliaProofPage() {
  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>Verified testnet execution</h1>
      <p className="section-intro">
        Track B: external-wallet flow — intent, authorization, wallet transfer, verification, and{" "}
        <span className="mono">SETTLED</span> evidence. This is separate from Track A hook contract
        deployment on the same network.
      </p>

      <article className="proof-card">
        <header className="proof-card-head">
          <span className="pill pill-ok">SETTLED · envelope complete</span>
          <p className="mono proof-exec-id">{P.executionId}</p>
        </header>

        <dl className="proof-dl mono">
          <div>
            <dt>Amount</dt>
            <dd>
              {P.amountHuman} · {P.amountBaseUnits} base units
            </dd>
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
            <dt>Intent</dt>
            <dd>{P.intentId}</dd>
          </div>
          <div>
            <dt>Manifest generated</dt>
            <dd>{P.manifestGeneratedAt}</dd>
          </div>
        </dl>
      </article>

      <section className="section">
        <h2>Track A — hook contracts (deploy only)</h2>
        <p className="section-intro">
          Railguard execution-hook contracts on Sepolia. The settlement transaction above was verified
          via the operator lifecycle; it did not traverse this hook in the demonstrated path.
        </p>
        <p className="mono">
          <a href={P.hookExplorerUrl} {...EXTERNAL_LINK}>
            {P.hookAddress}
          </a>
        </p>
      </section>

      <div className="proof-actions">
        <a href={P.explorerUrl} className="btn btn-mint" {...EXTERNAL_LINK}>
          Inspect Sepolia transaction
        </a>
        <a
          href={`${GITHUB_GATEWAY}/tree/main/${P.evidenceRepoPath}`}
          className="btn btn-ghost"
          {...EXTERNAL_LINK}
        >
          Settlement manifest
        </a>
        <a
          href={`${GITHUB_GATEWAY}/tree/main/${P.hookEvidenceRepoPath}`}
          className="btn btn-ghost"
          {...EXTERNAL_LINK}
        >
          Hook evidence
        </a>
        <Link href="/ecosystems/arbitrum" className="btn btn-ghost">
          Arbitrum integration
        </Link>
        <Link href="/attack" className="btn btn-ghost">
          Failure Lab simulation
        </Link>
      </div>
    </main>
  )
}
