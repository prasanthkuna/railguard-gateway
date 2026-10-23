import Link from "next/link"
import { PlainSummary } from "../../../components/v2/PlainSummary"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"
import { MONAD_TESTNET_PROOF as P } from "../../../lib/monad-public-proof"

export const metadata = {
  title: "Monad testnet verified proof",
  description:
    "Public Monad testnet proof: an external-wallet USDC transfer independently verified from on-chain receipt logs.",
  alternates: { canonical: "/proof/monad-testnet" },
}

export default function MonadTestnetProofPage() {
  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>Verified Monad settlement</h1>
      <PlainSummary
        happened="A 1 USDC transfer was made on Monad testnet from an outside wallet."
        checked="Railguard read the receipt logs and matched token, sender, recipient and amount, then marked it CONFIRMED."
        matters="Railguard can verify payments it did not send, so it works alongside wallets you already use."
      />
      <p className="section-intro">
        Railguard read the transaction receipt, matched the USDC <code>Transfer</code> event against
        the expected token, sender, recipient, and amount, and recorded the result as{" "}
        <span className="mono">CONFIRMED</span>. This is an external-wallet proof of the settlement
        verifier; Railguard did not originate or custody the transfer.{" "}
        <strong>No sign-in or wallet required</strong> to inspect the evidence.
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
              {P.amountHuman} · {P.amountBaseUnits} base units
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

      <section className="section">
        <h2>Reproduce independently</h2>
        <p className="section-intro mono">{P.reproduceCommand}</p>
        <p className="section-intro">
          The committed manifest includes the exact expected transfer fields and RPC result.
        </p>
      </section>

      <div className="proof-actions">
        <a href={P.explorerUrl} className="btn btn-mint" {...EXTERNAL_LINK}>
          Inspect transaction
        </a>
        <a
          href={`${GITHUB_GATEWAY}/tree/main/${P.evidenceRepoPath}`}
          className="btn btn-ghost"
          {...EXTERNAL_LINK}
        >
          Evidence manifest
        </a>
        <Link href="/proof" className="btn btn-ghost">
          All proofs
        </Link>
        <Link href="/demo" className="btn btn-ghost">
          Try the demo
        </Link>
      </div>
    </main>
  )
}
