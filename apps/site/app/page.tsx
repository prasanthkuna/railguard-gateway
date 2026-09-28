import Link from "next/link"
import { AttackDemo } from "../components/AttackDemo"
import { GITHUB_GATEWAY, GITHUB_LAB, OPERATOR_URL } from "../lib/constants"
import { ECOSYSTEMS } from "../lib/ecosystems"
import { RECIPES } from "../lib/recipes"

const LIFECYCLE = ["Intent", "Authorize", "Reserve", "Execute", "Observe", "Reconcile", "Evidence"]

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">v0.1.0-alpha · open source</p>
        <h1>Can your AI agent spend money safely?</h1>
        <p className="hero-lead">
          <strong>Railguard</strong> is the financial execution firewall between autonomous software
          and the wallet you already use.
        </p>
        <div className="hero-loop">
          <span>railguard attack</span>→<span>5 failures</span>→<span>railguard protect</span>→
          <span>5/5 blocked</span>→<span>receipt</span>
        </div>
        <div className="hero-ctas">
          <Link href="/attack" className="btn btn-mint">
            Run the attack demo
          </Link>
          <a href={GITHUB_GATEWAY} className="btn btn-ghost">
            View on GitHub
          </a>
        </div>
      </section>

      <section className="section" id="failure-lab">
        <h2>Failure Lab</h2>
        <p className="section-intro">
          Executable adversarial profiles (APF-001…006). Attack your setup before money moves — then
          prove protection with receipts.
        </p>
        <AttackDemo />
      </section>

      <section className="section" id="recipes">
        <h2>Nine recipes — no click required</h2>
        <p className="section-intro">
          Every persona maps to the same five commands. We emphasize <strong>Developer</strong>,{" "}
          <strong>AI agent</strong>, and <strong>Treasury ops</strong> as the wedge.
        </p>
        <div className="recipes-grid">
          {RECIPES.map((r) => (
            <article key={r.id} className={`recipe-card ${r.wedge ? "wedge" : ""}`}>
              <h3>{r.title}</h3>
              <p className="recipe-persona">{r.persona}</p>
              <ul className="recipe-protects">
                {r.protects.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="recipe-cmd">{r.command}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="lifecycle">
        <h2>One lifecycle</h2>
        <p className="section-intro">
          Every integration must map here — not four products, one firewall.
        </p>
        <div className="lifecycle">
          {LIFECYCLE.map((step) => (
            <div key={step} className="lifecycle-step">
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="ecosystems">
        <h2>Ecosystem proof</h2>
        <p className="section-intro">
          Grant reviewers see their rail inside a shipped product — not a separate demo repo.
        </p>
        <div className="eco-grid">
          {ECOSYSTEMS.slice(0, 2).map((e) => (
            <article key={e.id} className="eco-card">
              <span className="pill">{e.statusLabel}</span>
              <h3>{e.label}</h3>
              <p className="eco-protects">Railguard protects: {e.protects.join(" · ")}</p>
              <p className="eco-apf">Failure coverage: {e.apf.join(" · ")}</p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{e.narrative}</p>
              <p style={{ marginTop: "0.75rem" }}>
                <span className="mono" style={{ color: "var(--mint)" }}>
                  railguard attack
                </span>
              </p>
            </article>
          ))}
        </div>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/ecosystems">All ecosystems →</Link>
        </p>
      </section>

      <section className="section foss-box" id="foss">
        <h2>FOSS developer path</h2>
        <ul>
          <li>
            <span className="mono">railguard attack</span> — immediate value, no account
          </li>
          <li>
            Gateway API + SDK <span className="mono">check()</span> for authorize-before-execute
          </li>
          <li>
            Failure Atlas owned by <a href={GITHUB_LAB}>agent-payment-failure-lab</a>
          </li>
        </ul>
      </section>

      <section className="final-cta">
        <h2>Give agents authority. Not unlimited money.</h2>
        <p className="section-intro" style={{ margin: "0 auto 1.5rem" }}>
          Open-source firewall · testnet reference · evidence on every execution
        </p>
        <div className="hero-ctas">
          <Link href="/attack" className="btn btn-mint">
            railguard attack
          </Link>
          <Link href="/r/demo" className="btn btn-ghost">
            Sample receipt
          </Link>
          <a href={OPERATOR_URL} className="btn btn-ghost">
            Operator console
          </a>
        </div>
      </section>
    </main>
  )
}
