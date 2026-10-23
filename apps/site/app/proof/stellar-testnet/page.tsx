import Link from "next/link"
import { PlainSummary } from "../../../components/v2/PlainSummary"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"
import {
  STELLAR_TESTNET_PROOF as P,
  STELLAR_SOROBAN_POLICY_PROOF as S,
} from "../../../lib/stellar-public-proof"

export const metadata = {
  title: "Stellar testnet verified proof",
  description:
    "Public Stellar testnet proof: Horizon settlement verification CONFIRMED for a native XLM payment, plus a Soroban policy contract that binds each agent payment to recipient, asset and amount (Circle testnet USDC).",
  alternates: { canonical: "/proof/stellar-testnet" },
}

export default function StellarTestnetProofPage() {
  return (
    <main className="page proof-page">
      <p className="eyebrow">v0.1.0-alpha · {P.networkLabel}</p>
      <h1>Verified testnet settlement</h1>
      <PlainSummary
        happened="A testnet XLM payment was confirmed on Horizon, and a Soroban contract enforced an agent budget on chain for Circle testnet USDC."
        checked="That the payment matched its intent, and that the contract rejected duplicates, replays, changed recipients, extra amounts and overspend."
        matters="The same rules hold even if the app is bypassed: the contract itself refuses bad payments."
      />
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

      <section className="section" id="soroban-policy">
        <h2>Soroban policy contract (testnet USDC)</h2>
        <p className="section-intro">
          The same rules, enforced on-chain. An operator sets a per-agent budget and grants one
          intent bound to recipient, asset and amount. The contract derives a deterministic request
          id, lets the agent execute it exactly once, and rejects duplicates, replays and any
          changed field. Railguard then re-checks the execute transaction on Horizon before calling
          it <span className="mono">CONFIRMED</span>.
        </p>
        <article className="proof-card">
          <header className="proof-card-head">
            <span className="pill pill-ok">CONFIRMED · settlement verified</span>
            <p className="mono proof-exec-id">{S.executeTx}</p>
          </header>
          <dl className="proof-dl mono">
            <div>
              <dt>Contract</dt>
              <dd>
                <a href={S.contractUrl} {...EXTERNAL_LINK}>
                  {S.contractId}
                </a>
              </dd>
            </div>
            <div>
              <dt>Asset</dt>
              <dd>
                {S.asset} ({S.assetIssuer})
              </dd>
            </div>
            <div>
              <dt>Budget / intent</dt>
              <dd>
                {S.budgetHuman} budget · {S.amountHuman} granted and executed
              </dd>
            </div>
            <div>
              <dt>Request id</dt>
              <dd>{S.requestId}</dd>
            </div>
            <div>
              <dt>Agent</dt>
              <dd>{S.agent}</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>{S.recipient}</dd>
            </div>
            <div>
              <dt>Grant tx</dt>
              <dd>
                <a href={S.grantUrl} {...EXTERNAL_LINK}>
                  {S.grantTx}
                </a>
              </dd>
            </div>
            <div>
              <dt>Execute tx</dt>
              <dd>
                <a href={S.executeUrl} {...EXTERNAL_LINK}>
                  {S.executeTx}
                </a>
              </dd>
            </div>
            {S.rejections.map((r) => (
              <div key={r.attempt}>
                <dt>Rejected</dt>
                <dd>
                  {r.attempt} → {r.result}
                </dd>
              </div>
            ))}
            <div>
              <dt>Recorded</dt>
              <dd>{S.recordedAt}</dd>
            </div>
          </dl>
        </article>
        <p className="section-intro mono">{S.reproduceCommand}</p>
        <div className="proof-actions">
          <a href={S.executeHorizonUrl} className="btn btn-mint" {...EXTERNAL_LINK}>
            Execute on Horizon
          </a>
          <a
            href={`${GITHUB_GATEWAY}/tree/main/${S.sourcePath}`}
            className="btn btn-ghost"
            {...EXTERNAL_LINK}
          >
            Contract source
          </a>
          <a
            href={`${GITHUB_GATEWAY}/tree/main/${S.evidenceRepoPath}`}
            className="btn btn-ghost"
            {...EXTERNAL_LINK}
          >
            Policy evidence
          </a>
        </div>
      </section>

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
