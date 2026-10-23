import Link from "next/link"
import { PlainSummary } from "../../../components/v2/PlainSummary"
import { ARBITRUM_SEPOLIA_PROOF as P } from "../../../lib/arbitrum-public-proof"
import { EXTERNAL_LINK, GITHUB_GATEWAY, OPERATOR_LOGIN_URL } from "../../../lib/constants"

export const metadata = {
  title: "Arbitrum Sepolia verified proof",
  description:
    "Public testnet proof: external-wallet USDC settlement verified and recorded as CONFIRMED (settlement verified), separate from hook contract deployment.",
  alternates: { canonical: "/proof/arbitrum-sepolia" },
}

export default function ArbitrumSepoliaProofPage() {
  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>Verified testnet execution</h1>
      <PlainSummary
        happened="A 0.01 USDC transfer on Arbitrum Sepolia went through the full Railguard lifecycle: intent, approval, transfer, check."
        checked="That the on-chain transfer matched the approved token, recipient and amount, so the result is CONFIRMED (settlement verified)."
        matters="An agent payment is only marked done when the chain agrees. The hook contract below is a separate deployment; this transfer was checked by the Railguard observer, not routed through the hook."
      />
      <p className="section-intro">
        External-wallet verification — intent, authorization, wallet transfer, verification, and{" "}
        <span className="mono">CONFIRMED</span> (settlement verified) evidence. This is separate
        from hook contract deployment on the same network (the settlement tx did not traverse the
        hook in this demo). <strong>No sign-in or wallet required</strong> to verify this page — use
        the transaction and repo links below. The testnet console (PreBroadcast) is optional for
        replaying the operator UI.
      </p>

      <article className="proof-card">
        <header className="proof-card-head">
          <span className="pill pill-ok">CONFIRMED · envelope complete</span>
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
        <h2>Hook deployment (Sepolia)</h2>
        <p className="section-intro">
          Railguard execution-hook contracts on Sepolia. The settlement transaction above was
          verified via the operator lifecycle; it did not traverse this hook in the demonstrated
          path.
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
        <Link href="/proof" className="btn btn-ghost">
          All proofs
        </Link>
        <Link href="/demo" className="btn btn-ghost">
          Try the demo
        </Link>
        <a href={OPERATOR_LOGIN_URL} className="btn btn-ghost" {...EXTERNAL_LINK}>
          Optional: replay in operator
        </a>
      </div>
    </main>
  )
}
