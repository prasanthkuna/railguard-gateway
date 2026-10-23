import type { Metadata } from "next"
import Link from "next/link"
import { CONTACT_EMAIL, EXTERNAL_LINK, FOUNDER_SOCIAL, GITHUB_GATEWAY } from "../../lib/constants"

export const metadata: Metadata = {
  title: "About",
  description:
    "Railguard is an open-source personal project by Prasanth Kuna, a payments and backend engineer.",
  alternates: { canonical: "/about" },
}

const TIMELINE = [
  ["30 Sep 2026", "Arbitrum Sepolia: first public settlement verified"],
  ["4 Oct 2026", "Monad and Stellar testnet proofs confirmed"],
  ["22 Oct 2026", "Airwallex sandbox: timed-out payout confirmed exactly once"],
  ["23 Oct 2026", "Soroban policy contract and Metal three-agent run confirmed"],
] as const

export default function AboutPage() {
  return (
    <main className="ui-main">
      <section className="ui-page-hero">
        <p className="ui-kicker">About</p>
        <h1>Built in the open by {FOUNDER_SOCIAL.name}.</h1>
        <p className="ui-lead">
          Railguard is my open-source personal project. I am a payments and backend engineer. I
          built Railguard because AI agents are starting to move money, and the hard parts (retries,
          races, lost answers, proof) are exactly what payment systems get wrong.
        </p>
      </section>

      <section className="ui-section" style={{ paddingTop: 64 }}>
        <div className="ui-grid-2">
          <div className="ui-card">
            <h3>What this project shows</h3>
            <ul className="ui-facts" style={{ marginTop: 8 }}>
              <li>
                <span>Payment correctness</span>
                <span>idempotency, reservations, reconciliation</span>
              </li>
              <li>
                <span>Distributed systems</span>
                <span>UNKNOWN states, retries, exactly-once payouts</span>
              </li>
              <li>
                <span>Smart contracts</span>
                <span>EVM hook, Soroban policy, on-chain mandates</span>
              </li>
              <li>
                <span>AI agents</span>
                <span>MCP tools, agent treasury with human approval</span>
              </li>
              <li>
                <span>Shipping</span>
                <span>CI, evidence packs, public demos on 4 testnets</span>
              </li>
            </ul>
          </div>
          <div className="ui-card">
            <h3>Get in touch</h3>
            <ul className="ui-facts" style={{ marginTop: 8 }}>
              <li>
                <span>Email</span>
                <span>
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                </span>
              </li>
              <li>
                <span>GitHub</span>
                <span>
                  <a href={FOUNDER_SOCIAL.github} {...EXTERNAL_LINK}>
                    prasanthkuna
                  </a>
                </span>
              </li>
              <li>
                <span>LinkedIn</span>
                <span>
                  <a href={FOUNDER_SOCIAL.linkedin} {...EXTERNAL_LINK}>
                    Prasanth Kuna
                  </a>
                </span>
              </li>
              <li>
                <span>X</span>
                <span>
                  <a href={FOUNDER_SOCIAL.x} {...EXTERNAL_LINK}>
                    @prasanth_kuna
                  </a>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ui-section">
        <div className="ui-section-head">
          <h2 className="ui-h2">Milestones</h2>
        </div>
        <ul className="ui-facts">
          {TIMELINE.map(([d, t]) => (
            <li key={d + t}>
              <span className="ui-mono">{d}</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="ui-cta-row" style={{ marginTop: 28 }}>
          <Link href="/demo" className="ui-btn ui-btn-primary">
            Try the demo
          </Link>
          <a href={GITHUB_GATEWAY} className="ui-link" {...EXTERNAL_LINK}>
            Read the code
          </a>
        </div>
      </section>
    </main>
  )
}
