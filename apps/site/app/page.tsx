import Link from "next/link"
import { HeroDecision } from "../components/v2/HeroDecision"
import { ProofTiles } from "../components/v2/ProofTiles"
import { WhatItStops } from "../components/v2/WhatItStops"
import {
  AIRWALLEX_INCIDENTS_URL,
  CONTACT_EMAIL,
  DEMO_VIDEO_URL,
  EXTERNAL_LINK,
  FOUNDER_SOCIAL,
  GITHUB_GATEWAY,
  KIT11_AGENTS_URL,
  LICENSE_URL,
} from "../lib/constants"

export default function HomePage() {
  return (
    <main className="ui-main">
      <section className="ui-hero">
        <div>
          <p className="ui-kicker">Open source · v0.1 alpha</p>
          <h1>
            AI agents can spend money. Railguard makes sure they <em>spend it right.</em>
          </h1>
          <p className="ui-hero-sub">
            A safety layer that checks every agent payment before it is signed, and proves what
            really happened after. Your wallet and keys stay yours.
          </p>
          <div className="ui-cta-row">
            <Link href="/demo" className="ui-btn ui-btn-primary">
              Try the 60-second demo
            </Link>
            <Link href="/proof" className="ui-link">
              See on-chain proof
            </Link>
          </div>
          <div className="ui-trust-row">
            <span>Confirmed on 4 testnets</span>
            <span>Never holds funds or keys</span>
            <span>Apache-2.0</span>
          </div>
        </div>
        <HeroDecision />
      </section>

      <section className="ui-section" id="what-it-stops">
        <div className="ui-section-head">
          <p className="ui-kicker">What it stops</p>
          <h2 className="ui-h2">Three mistakes that cost real money.</h2>
          <p className="ui-lead">
            Agents retry, race each other, and follow bad instructions. Here is what changes with
            Railguard in the path.
          </p>
        </div>
        <WhatItStops />
        <div className="ui-cta-row" style={{ marginTop: 28 }}>
          <Link href="/demo" className="ui-link">
            Run all six failure tests
          </Link>
          <a href={KIT11_AGENTS_URL} className="ui-link" {...EXTERNAL_LINK}>
            Three agents on Metal testnet
          </a>
          <a href={AIRWALLEX_INCIDENTS_URL} className="ui-link" {...EXTERNAL_LINK}>
            Airwallex timeout drill
          </a>
          <a href={DEMO_VIDEO_URL} className="ui-link" {...EXTERNAL_LINK}>
            Watch the 84-second video
          </a>
        </div>
      </section>

      <section className="ui-section" id="how">
        <div className="ui-section-head">
          <p className="ui-kicker">How it works</p>
          <h2 className="ui-h2">Check. Watch. Prove.</h2>
          <p className="ui-lead">
            Railguard sits between your agent and your wallet. It never holds the money.
          </p>
        </div>
        <div className="ui-flow">
          <div className="ui-card">
            <h3>Check</h3>
            <p>
              Your rules run before the wallet signs: allowed recipients, budgets, approvals. Money
              is reserved so two agents cannot spend it twice.
            </p>
          </div>
          <div className="ui-card">
            <h3>Watch</h3>
            <p>
              After sending, Railguard tracks the chain. If the answer is lost, the payment is
              UNKNOWN until it is checked, never guessed.
            </p>
          </div>
          <div className="ui-card">
            <h3>Prove</h3>
            <p>
              Every payment ends with a tamper-evident receipt: what was asked, what was allowed,
              and what the chain shows.
            </p>
          </div>
        </div>
        <div className="ui-path" aria-label="Where Railguard sits">
          <b>Your agent</b>→<b className="is-rg">Railguard</b>→<b>Your wallet</b>→<b>The chain</b>
          <Link href="/how-it-works" className="ui-link" style={{ marginLeft: 12 }}>
            Full architecture
          </Link>
        </div>
      </section>

      <section className="ui-section" id="proof">
        <div className="ui-section-head">
          <p className="ui-kicker">Proof, not promises</p>
          <h2 className="ui-h2">Every claim links to a transaction you can open.</h2>
          <p className="ui-lead">Testnet runs, committed evidence files, no sign-in needed.</p>
        </div>
        <ProofTiles />
      </section>

      <section className="ui-section" id="use">
        <div className="ui-section-head">
          <p className="ui-kicker">Use it your way</p>
          <h2 className="ui-h2">
            For the people who build agents and the people who pay for them.
          </h2>
        </div>
        <div className="ui-grid-2">
          <div className="ui-card">
            <h3>Developers</h3>
            <p>
              Wrap a payment in one call, or give your agent Railguard as MCP tools in Cursor or
              Claude.
            </p>
            <pre className="ui-code" style={{ marginTop: 18 }}>
              {`const result = await check(rg, intent)
if (result.decision !== "ALLOW") throw new Error("blocked")
// Use a connected payment driver, then verify settlement.`}
            </pre>
            <div className="ui-card-foot">
              <Link href="/how-it-works#build">Install guide →</Link>
              {" · "}
              <Link href="/integrations">Integration maturity →</Link>
            </div>
          </div>
          <div className="ui-card">
            <h3>Finance and ops teams</h3>
            <p>Set limits per agent, approve changes, and get a receipt for every payment.</p>
            <ul className="ui-facts" style={{ marginTop: 14 }}>
              <li>
                <span>Spending limits</span>
                <span>per agent, per payment</span>
              </li>
              <li>
                <span>Approvals</span>
                <span>a person signs off on new limits</span>
              </li>
              <li>
                <span>Receipts</span>
                <span>re-checkable, tamper-evident</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ui-section" id="open-source">
        <div className="ui-section-head">
          <p className="ui-kicker">Open source</p>
          <h2 className="ui-h2">Read every line that touches the money.</h2>
        </div>
        <div className="ui-card">
          <ul className="ui-facts">
            <li>
              <span>License</span>
              <span>
                <a href={LICENSE_URL} {...EXTERNAL_LINK}>
                  Apache-2.0
                </a>
              </span>
            </li>
            <li>
              <span>Checks on every push</span>
              <span>lint, unit and lifecycle tests, builds</span>
            </li>
            <li>
              <span>Contracts</span>
              <span>EVM hook (Arbitrum) · Soroban policy (Stellar)</span>
            </li>
            <li>
              <span>Interfaces</span>
              <span>TypeScript SDK · CLI · MCP · REST API</span>
            </li>
          </ul>
          <div className="ui-card-foot">
            <a href={GITHUB_GATEWAY} className="ui-btn ui-btn-sm" {...EXTERNAL_LINK}>
              Read the code on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="ui-section" id="built-by">
        <div className="ui-builder">
          <div>
            <p className="ui-kicker">Built by</p>
            <h2 className="ui-h2">{FOUNDER_SOCIAL.name}</h2>
            <p className="ui-lead">
              Railguard is my open-source personal project. I am a payments and backend engineer,
              and I built it to show that agent payments can be safe by default.
            </p>
            <div className="ui-chips">
              <span className="ui-chip">Payment correctness</span>
              <span className="ui-chip">Idempotency</span>
              <span className="ui-chip">Distributed systems</span>
              <span className="ui-chip">Smart contracts on 4 chains</span>
              <span className="ui-chip">AI agents</span>
            </div>
          </div>
          <div className="ui-card">
            <ul className="ui-facts">
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
              <li>
                <span>Email</span>
                <span>
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                </span>
              </li>
            </ul>
            <div className="ui-card-foot">
              <Link href="/about">More about the project →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-final">
        <h2 className="ui-h2">Give agents authority. Not unlimited money.</h2>
        <p className="ui-lead">See it block a bad payment in under a minute.</p>
        <div className="ui-cta-row">
          <Link href="/demo" className="ui-btn ui-btn-primary">
            Try the demo
          </Link>
          <a href={GITHUB_GATEWAY} className="ui-btn" {...EXTERNAL_LINK}>
            Star on GitHub
          </a>
        </div>
      </section>
    </main>
  )
}
