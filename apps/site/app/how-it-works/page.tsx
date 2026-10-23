import type { Metadata } from "next"
import Link from "next/link"
import { ARCHITECTURE_DOC, DOC_LINKS, EXTERNAL_LINK, GITHUB_GATEWAY } from "../../lib/constants"

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Railguard checks agent payments before signing, tracks them after sending, and seals a receipt. Plain-English glossary and install guide.",
  alternates: { canonical: "/how-it-works" },
}

const LIFECYCLE = [
  ["Intent", "The agent says what it wants to pay: who, how much, which coin, for what task."],
  ["Authorize", "Your rules decide: allowed recipients, budgets, whether a person must approve."],
  ["Reserve", "The money is set aside first, so two agents cannot spend the same budget."],
  ["Execute", "Your own wallet or provider signs and sends. Railguard never holds keys."],
  ["Observe", "Railguard watches the chain or bank API. A lost answer is UNKNOWN, not failed."],
  ["Reconcile", "What the chain shows is matched to the intent. Any difference is flagged."],
  ["Evidence", "A hash-chained receipt records every step, so anyone can re-check it."],
] as const

const GLOSSARY = [
  ["Intent", "What the agent wants to pay: who, how much, which coin."],
  ["Policy", "Your rules: budgets, allowed recipients, approvals."],
  ["Reserve", "Money set aside before sending, so it cannot be spent twice."],
  ["UNKNOWN", "Sent, but no answer yet. Railguard checks instead of guessing."],
  ["Confirmed", "The chain shows the payment matched the intent (settlement verified)."],
  ["Receipt", "A tamper-evident record of every step that you can re-check."],
  ["Mandate", "An on-chain spending limit for one agent (used on Metal)."],
  ["x402", "A way for agents to pay for an API call over HTTP, per request."],
  ["Soroban", "Stellar's smart contract platform, used for the on-chain policy."],
  ["Testnet", "A practice blockchain: fake money, real code paths."],
] as const

export default function HowItWorksPage() {
  return (
    <main className="ui-main">
      <section className="ui-page-hero">
        <p className="ui-kicker">How it works</p>
        <h1>A checkpoint between your agent and your money.</h1>
        <p className="ui-lead">
          Railguard sits between agent intent and your signer. It decides before anything is signed,
          watches what happens after, and leaves a receipt. It never takes custody.
        </p>
      </section>

      <section className="ui-section" style={{ paddingTop: 64 }}>
        <div className="ui-path" aria-label="Where Railguard sits" style={{ marginTop: 0 }}>
          <b>Your agent</b>→<b className="is-rg">Railguard: check · reserve · watch · prove</b>→
          <b>Your wallet or bank API</b>→<b>Chain or bank</b>
        </div>
      </section>

      <section className="ui-section ui-anchor" id="lifecycle" style={{ paddingTop: 64 }}>
        <div className="ui-section-head">
          <h2 className="ui-h2">The seven steps of every payment</h2>
        </div>
        <dl className="ui-dl">
          {LIFECYCLE.map(([k, v], i) => (
            <div key={k}>
              <dt>
                <span className="ui-mono" style={{ color: "var(--mint)", marginRight: 10 }}>
                  {i + 1}
                </span>
                {k}
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ui-section ui-anchor" id="glossary">
        <div className="ui-section-head">
          <h2 className="ui-h2">Words used on this site</h2>
        </div>
        <dl className="ui-dl">
          {GLOSSARY.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ui-section ui-anchor" id="build">
        <div className="ui-section-head">
          <h2 className="ui-h2">Run it yourself</h2>
          <p className="ui-lead">
            Needs{" "}
            <a href="https://bun.sh" className="ui-link" {...EXTERNAL_LINK}>
              Bun
            </a>
            . Lines starting with <span className="ui-mono">$</span> go in a terminal.
          </p>
        </div>
        <div className="ui-grid-2">
          <div className="ui-card">
            <h3>1. Install and attack</h3>
            <p>Clone the repo, then run the six failure tests locally.</p>
            <pre className="ui-code" style={{ marginTop: 16 }}>
              {`$ git clone ${GITHUB_GATEWAY}.git
$ cd railguard-gateway && bun install
$ bun run railguard attack
$ bun run railguard protect`}
            </pre>
          </div>
          <div className="ui-card">
            <h3>2. Re-check the public proofs</h3>
            <p>Verifies the committed evidence for each chain.</p>
            <pre className="ui-code" style={{ marginTop: 16 }}>
              {`$ bun run verify-arbitrum-sepolia-pack
$ bun run verify-stellar-testnet-pack
$ bun run verify-monad-metropolis-pack`}
            </pre>
          </div>
          <div className="ui-card">
            <h3>3. Give your agent Railguard tools (MCP)</h3>
            <p>Paste into your Cursor or Claude Desktop MCP config, not a terminal.</p>
            <pre className="ui-code" style={{ marginTop: 16 }}>
              {`{
  "mcpServers": {
    "railguard": {
      "command": "bun",
      "args": ["run", "packages/mcp/src/server.ts"],
      "env": {
        "RAILGUARD_BASE_URL": "http://127.0.0.1:4000",
        "RAILGUARD_ACCESS_TOKEN": "<your-token>"
      }
    }
  }
}`}
            </pre>
          </div>
          <div className="ui-card">
            <h3>4. Call it from code</h3>
            <p>TypeScript SDK over the REST API (/v1/*).</p>
            <pre className="ui-code" style={{ marginTop: 16 }}>
              {`import { RailguardClient, check } from "@railguard/sdk"

const rg = new RailguardClient({ baseUrl, getAuthHeaders })
const result = await check(rg, intent)
if (result.decision === "ALLOW") await rg.execute(result.intent.id)`}
            </pre>
          </div>
        </div>
        <div className="ui-cta-row" style={{ marginTop: 28 }}>
          <a href={ARCHITECTURE_DOC} className="ui-btn" {...EXTERNAL_LINK}>
            Architecture doc
          </a>
          <a href={DOC_LINKS.integration} className="ui-link" {...EXTERNAL_LINK}>
            Integration guide
          </a>
          <Link href="/proof" className="ui-link">
            See the proofs
          </Link>
        </div>
      </section>

      <section className="ui-section ui-anchor" id="quality">
        <div className="ui-section-head">
          <h2 className="ui-h2">How it is kept honest</h2>
        </div>
        <ul className="ui-facts">
          <li>
            <span>On every push to main</span>
            <span>lint, unit tests, lifecycle tests, manifest drift check, builds</span>
          </li>
          <li>
            <span>Evidence workflow</span>
            <span>testnet evidence packs re-verified in CI</span>
          </li>
          <li>
            <span>Status labels</span>
            <span>generated from one manifest, checked against the docs</span>
          </li>
          <li>
            <span>Maturity</span>
            <span>v0.1 alpha, testnet only, not for mainnet funds yet</span>
          </li>
        </ul>
      </section>
    </main>
  )
}
