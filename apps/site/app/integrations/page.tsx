import type { Metadata } from "next"
import Link from "next/link"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../../lib/constants"

export const metadata: Metadata = {
  title: "Integrations and maturity",
  description:
    "What Railguard actually runs, what has external evidence, and what still requires real provider integration.",
  alternates: { canonical: "/integrations" },
}

const INTEGRATIONS = [
  {
    name: "Coinbase CDP + Base",
    stage: "Testnet reference",
    now: "Existing CDP-backed testnet path and settlement evidence; the standalone v5 adapter is not connected to real execution.",
    next: "Wire the v5 rail to the authenticated CDP driver and test crash/restart behavior.",
    href: "/proof#cdp",
    linkLabel: "Inspect CDP evidence",
  },
  {
    name: "x402",
    stage: "Separate guard implementation",
    now: "x402-guard and Celo testnet code exist. The v5 reference rail is deliberately disabled rather than inventing transaction confirmation.",
    next: "Wire real facilitator requests and reconcile provider or chain facts.",
    href: `${GITHUB_GATEWAY}/tree/main/vendor/x402-guard`,
    linkLabel: "Inspect guard code",
  },
  {
    name: "Circle / USDC",
    stage: "Settlement proof, not Agent Stack",
    now: "USDC transfer and Soroban policy proofs exist; Circle Agent Stack wallet integration is not implemented.",
    next: "Connect official Agent Stack wallet operations and demonstrate independent settlement validation.",
    href: "/proof/stellar-testnet",
    linkLabel: "Inspect USDC proof",
  },
  {
    name: "Safe and ZeroDev",
    stage: "Interfaces only",
    now: "Wallet adapters exist, but do not perform real provider signing. Synthetic signatures are blocked.",
    next: "Integrate supported smart-account transactions and on-chain session or guard policies.",
    href: `${GITHUB_GATEWAY}/tree/main/packages/integrations/src/wallets`,
    linkLabel: "Inspect wallet adapters",
  },
  {
    name: "Celo Sepolia",
    stage: "Testnet adapter and wire check",
    now: "x402/EIP-3009 rail and settlement verifier code exist. Current committed demo evidence is simulated.",
    next: "Publish a independently checked Celo Sepolia settlement with replay and recovery evidence.",
    href: `${GITHUB_GATEWAY}/tree/main/docs/hackathons/celo`,
    linkLabel: "Inspect Celo tests",
  },
  {
    name: "Airwallex",
    stage: "Sandbox verified",
    now: "Payout timeout, duplicate-blocking, and reconciliation evidence is committed from the Airwallex sandbox.",
    next: "Add durable multi-process attempt storage and production operational hardening.",
    href: "/proof#airwallex",
    linkLabel: "Inspect sandbox proof",
  },
  {
    name: "PayPal Payouts",
    stage: "Simulator and sandbox adapter",
    now: "Provider-specific idempotency and recovery adapter exists. Saved evidence is simulated, not a confirmed sandbox payout.",
    next: "Demonstrate PayPal sandbox transactions and persist attempts across process restarts.",
    href: `${GITHUB_GATEWAY}/tree/main/docs/hackathons/paypal`,
    linkLabel: "Inspect PayPal adapter",
  },
  {
    name: "Stripe, RazorpayX and Chainlink CRE",
    stage: "Not full payment execution integrations",
    now: "Stripe and RazorpayX payment rails are not implemented. The Chainlink CRE risk interface does not prove an end-to-end CRE workflow.",
    next: "Prioritize a full integration only after the core durability gates are met.",
    href: `${GITHUB_GATEWAY}/tree/main/packages/integrations/src`,
    linkLabel: "Inspect current interfaces",
  },
] as const

export default function IntegrationsPage() {
  return (
    <main className="ui-main">
      <section className="ui-page-hero">
        <p className="ui-kicker">Integration maturity</p>
        <h1>Real provider facts, not a wall of logos.</h1>
        <p className="ui-lead">
          Railguard is an alpha. A reference interface is not a working payment rail, and a
          simulator is not proof of settlement. Here is what is ready to inspect today.
        </p>
        <div className="ui-cta-row">
          <Link className="ui-btn ui-btn-primary" href="/demo">
            Find payment failures
          </Link>
          <Link className="ui-link" href="/how-it-works#build">
            Install Railguard
          </Link>
          <Link className="ui-link" href="/proof">
            Verify public proofs
          </Link>
        </div>
      </section>
      <section className="ui-section">
        <div className="ui-grid-2">
          {INTEGRATIONS.map((item) => (
            <div className="ui-card" key={item.name}>
              <p className="ui-kicker">{item.stage}</p>
              <h2>{item.name}</h2>
              <p>{item.now}</p>
              <p className="ui-muted">
                <strong>Next evidence gate:</strong> {item.next}
              </p>
              <div className="ui-card-foot">
                {item.href.startsWith("/") ? (
                  <Link href={item.href}>{item.linkLabel} →</Link>
                ) : (
                  <a href={item.href} {...EXTERNAL_LINK}>
                    {item.linkLabel} ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="ui-final">
        <h2 className="ui-h2">Try the failure before trusting the claim.</h2>
        <p className="ui-lead">The sandbox and testnet evidence is open for inspection.</p>
        <div className="ui-cta-row">
          <Link href="/demo" className="ui-btn ui-btn-primary">
            Run failure tests
          </Link>
          <Link href="/proof" className="ui-btn">
            Verify proof
          </Link>
        </div>
      </section>
    </main>
  )
}
