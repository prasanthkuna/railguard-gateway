import type { Metadata } from "next"
import Link from "next/link"
import { AttackDemo } from "../../components/AttackDemo"
import { ReceiptTimeline } from "../../components/ReceiptTimeline"
import {
  AIRWALLEX_INCIDENTS_URL,
  DEMO_VIDEO_EMBED,
  DEMO_VIDEO_URL,
  EXTERNAL_LINK,
  KIT11_AGENTS_URL,
} from "../../lib/constants"
import { DEMO_RECEIPT } from "../../lib/demo-receipt"

export const metadata: Metadata = {
  title: "Try it",
  description:
    "Run six agent payment failures with and without Railguard, watch three agents work under on-chain limits, and see a sample receipt.",
  alternates: { canonical: "/demo" },
}

const FAILURES = [
  ["Replay", "The same payment is sent twice.", "Each payment id can be used once."],
  ["Budget race", "Two agents spend the same money at once.", "Money is reserved before sending."],
  [
    "Crash after sending",
    "The app crashes or the answer is lost after sending.",
    "State is UNKNOWN until the chain is checked.",
  ],
  [
    "Settlement mismatch",
    "The chain shows a different amount or recipient.",
    "Flagged as a mismatch, never marked done.",
  ],
  ["Stale approval", "An old approval is used later.", "Expired approvals are refused."],
  ["Policy bypass", "Code tries to go around the rules.", "The rules are enforced at the hook."],
] as const

export default function DemoPage() {
  return (
    <main className="ui-main">
      <section className="ui-page-hero">
        <p className="ui-kicker">Try it</p>
        <h1>See what Railguard stops, then watch the real thing run.</h1>
        <p className="ui-lead">
          Start with the 60-second simulator. Then open the live testnet and sandbox runs. No
          sign-in, no wallet.
        </p>
      </section>

      <section className="ui-section ui-anchor" id="lab" style={{ paddingTop: 64 }}>
        <div className="ui-section-head">
          <h2 className="ui-h2">1. Failure Lab (60 seconds)</h2>
          <p className="ui-lead">
            Press Simulate attack to see six failures hit an unprotected agent. Then turn on
            Railguard and run them again. This part runs in your browser; the proofs below are real.
          </p>
        </div>
        <AttackDemo />
        <div className="ui-table-wrap" style={{ marginTop: 24 }}>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Failure</th>
                <th>What goes wrong</th>
                <th>What Railguard does</th>
              </tr>
            </thead>
            <tbody>
              {FAILURES.map(([name, bad, fix], i) => (
                <tr key={name}>
                  <td>
                    <span className="ui-mono" style={{ color: "var(--muted)" }}>
                      APF-00{i + 1}
                    </span>{" "}
                    {name}
                  </td>
                  <td className="ui-muted">{bad}</td>
                  <td>{fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-section ui-anchor" id="live">
        <div className="ui-section-head">
          <h2 className="ui-h2">2. Live runs</h2>
          <p className="ui-lead">Real testnet and sandbox money paths, recorded and replayable.</p>
        </div>
        <div className="ui-grid-2">
          <a href={KIT11_AGENTS_URL} className="ui-card" {...EXTERNAL_LINK}>
            <span className="ui-pill ui-pill-ok">Metal testnet</span>
            <h3 style={{ marginTop: 14 }}>Three agents, one account, limits that move</h3>
            <p>
              A data business sells answers over x402. An over-cap purchase is refused, the treasury
              agent proposes new limits, a person approves, and a lost payout pays once.
            </p>
            <div className="ui-card-foot">
              <span>Open the run ↗</span>
            </div>
          </a>
          <a href={AIRWALLEX_INCIDENTS_URL} className="ui-card" {...EXTERNAL_LINK}>
            <span className="ui-pill ui-pill-ok">Airwallex sandbox</span>
            <h3 style={{ marginTop: 14 }}>The payout that timed out</h3>
            <p>
              A supplier payout times out after Airwallex already made it. The agent and the job
              queue both retry. Railguard blocks both and confirms exactly one transfer.
            </p>
            <div className="ui-card-foot">
              <span>Force a timeout ↗</span>
            </div>
          </a>
        </div>
      </section>

      <section className="ui-section ui-anchor" id="video">
        <div className="ui-section-head">
          <h2 className="ui-h2">3. The 84-second walkthrough</h2>
          <p className="ui-lead">
            Prefer to watch?{" "}
            <a href={DEMO_VIDEO_URL} className="ui-link" {...EXTERNAL_LINK}>
              Open on YouTube
            </a>
          </p>
        </div>
        <div className="ui-video">
          <iframe
            src={DEMO_VIDEO_EMBED}
            title="Railguard 84-second demo"
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section className="ui-section ui-anchor" id="receipt">
        <div className="ui-section-head">
          <h2 className="ui-h2">4. What a receipt looks like</h2>
          <p className="ui-lead">
            Every payment ends with a record like this. This one is sample data; the{" "}
            <Link href="/proof" className="ui-link">
              proof page
            </Link>{" "}
            has real ones.
          </p>
        </div>
        <ReceiptTimeline data={DEMO_RECEIPT} sample />
      </section>
    </main>
  )
}
