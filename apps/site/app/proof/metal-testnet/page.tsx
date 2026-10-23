import type { Metadata } from "next"
import Link from "next/link"
import { PlainSummary } from "../../../components/v2/PlainSummary"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../../lib/constants"
import { METAL_TESTNET_PROOF as P } from "../../../lib/metal-public-proof"

export const metadata: Metadata = {
  title: "Metal testnet proof: three agents under on-chain limits",
  description:
    "Recorded Kit 11 run on Metal testnet: an over-cap purchase refused, new limits approved, and a lost payout paid once. Every step links to the explorer.",
  alternates: { canonical: "/proof/metal-testnet" },
}

export default function MetalProofPage() {
  return (
    <main className="ui-main">
      <section className="ui-page-hero">
        <p className="ui-kicker">{P.networkLabel}</p>
        <h1>Three agents, one account, limits that hold</h1>
        <PlainSummary
          happened="Three agents spent from one Metal account under on-chain mandates (limits) worth 20 *USDZ in total, buying and selling data over x402."
          checked="That an over-cap purchase was refused and the buyer not charged, that new limits stayed inside the total, and that a re-sent payout did not pay twice."
          matters="Agents can run a small business without being able to overspend, and a lost answer never turns into a double payment."
        />
      </section>

      <section className="ui-section" style={{ paddingTop: 48 }}>
        <div className="ui-section-head">
          <h2 className="ui-h2">Key steps, each on chain</h2>
          <p className="ui-lead">
            Run <span className="ui-mono">{P.runId}</span>, recorded {P.recordedAt}. Account{" "}
            <span className="ui-mono" style={{ wordBreak: "break-all" }}>
              {P.account}
            </span>
          </p>
        </div>
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>What happened</th>
                <th>Result</th>
                <th>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {P.steps.map((s) => (
                <tr key={s.label}>
                  <td style={{ fontWeight: 600 }}>{s.label}</td>
                  <td className="ui-muted">{s.detail}</td>
                  <td>
                    <span
                      className={`ui-pill ${s.outcome === "REFUSED" ? "ui-pill-bad" : "ui-pill-ok"}`}
                    >
                      {s.outcome}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <a href={s.href} {...EXTERNAL_LINK}>
                      View tx ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ui-cta-row" style={{ marginTop: 28 }}>
          <a href={P.operatorUrl} className="ui-btn ui-btn-primary" {...EXTERNAL_LINK}>
            Replay the full run
          </a>
          <a
            href={`${GITHUB_GATEWAY}/blob/main/${P.evidenceRepoPath}`}
            className="ui-btn"
            {...EXTERNAL_LINK}
          >
            Raw evidence (JSON)
          </a>
          <Link href="/proof" className="ui-link">
            All proofs
          </Link>
        </div>
      </section>
    </main>
  )
}
