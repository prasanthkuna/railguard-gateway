import type { Metadata } from "next"
import { ProofTiles } from "../../components/v2/ProofTiles"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../lib/constants"
import { ECOSYSTEM_MANIFEST } from "../../lib/ecosystems.manifest"
import { internalSitePath } from "../../lib/site-links"

export const metadata: Metadata = {
  title: "Proof",
  description:
    "Every Railguard claim backed by a public transaction: Arbitrum Sepolia, Stellar Soroban, Monad and Metal testnets, plus the Airwallex sandbox.",
  alternates: { canonical: "/proof" },
}

const PLAIN: Record<string, { label: string; ok: boolean }> = {
  "SEPOLIA VERIFIED": { label: "Confirmed", ok: true },
  "TESTNET VERIFIED": { label: "Confirmed", ok: true },
  "HORIZON CONFIRMED": { label: "Confirmed", ok: true },
  "SANDBOX LIVE": { label: "Sandbox live", ok: true },
  SHIPPED: { label: "Shipped", ok: true },
  INTEGRATED: { label: "Testnet console", ok: false },
  "REFERENCE PATH": { label: "Adapter", ok: false },
  "SETTLEMENT VERIFY": { label: "Adapter", ok: false },
  ADAPTER: { label: "Adapter", ok: false },
  ROADMAP: { label: "Planned", ok: false },
}

const LOGOS: Record<string, string> = {
  arbitrum: "/logos/arbitrum.svg",
  stellar: "/logos/stellar.svg",
  base: "/logos/base.svg",
  celo: "/logos/celo.svg",
}

const ORDER = [
  "arbitrum",
  "stellar",
  "monad",
  "airwallex",
  "x402",
  "cdp",
  "base",
  "arc",
  "failure-lab",
  "celo",
]

export default function ProofPage() {
  const rails = [...ECOSYSTEM_MANIFEST].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))

  return (
    <main className="ui-main">
      <section className="ui-page-hero">
        <p className="ui-kicker">Proof</p>
        <h1>Every claim links to something you can open.</h1>
        <p className="ui-lead">
          Each run below is a real testnet or sandbox transaction, with the evidence file committed
          to the repo. Nothing here needs a sign-in or a wallet.
        </p>
      </section>

      <section className="ui-section" style={{ paddingTop: 64 }}>
        <ProofTiles />
      </section>

      <section className="ui-section" id="rails">
        <div className="ui-section-head">
          <h2 className="ui-h2">Every rail, labelled honestly</h2>
          <p className="ui-lead">
            Confirmed means a public transaction was matched to its intent. Adapter means the code
            exists but there is no public proof yet. Planned means not built.
          </p>
        </div>
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Rail</th>
                <th>Status</th>
                <th>What is true today</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {rails.map((e) => {
                const s = PLAIN[e.statusLabel] ?? { label: e.statusLabel, ok: false }
                const primary = internalSitePath(e.evidenceHref)
                return (
                  <tr key={e.id} id={e.id} className="ui-anchor">
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                      <span className="ui-chain">
                        {LOGOS[e.id] ? (
                          <img src={LOGOS[e.id]} alt="" width={20} height={20} />
                        ) : null}
                        {e.label}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`ui-pill ${s.ok ? "ui-pill-ok" : ""}`}>{s.label}</span>
                    </td>
                    <td className="ui-muted" style={{ minWidth: 280 }}>
                      {e.narrative}
                      <div className="ui-mono" style={{ marginTop: 6 }}>
                        {e.codePath}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <a
                        href={primary ?? e.evidenceHref}
                        {...(primary ? {} : EXTERNAL_LINK)}
                        style={{ display: "block" }}
                      >
                        {e.evidenceLabel ?? "Evidence"}
                      </a>
                      {e.secondaryHref ? (
                        <a
                          href={internalSitePath(e.secondaryHref) ?? e.secondaryHref}
                          {...(internalSitePath(e.secondaryHref) ? {} : EXTERNAL_LINK)}
                          style={{ display: "block", marginTop: 4 }}
                        >
                          {e.secondaryLabel}
                        </a>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="ui-lead" style={{ fontSize: 14, marginTop: 16 }}>
          Logos are trademarks of their owners. Railguard is an independent open-source project.
          Re-run any check yourself from the{" "}
          <a href={`${GITHUB_GATEWAY}/tree/main/evidence`} className="ui-link" {...EXTERNAL_LINK}>
            evidence folder
          </a>
          .
        </p>
      </section>
    </main>
  )
}
