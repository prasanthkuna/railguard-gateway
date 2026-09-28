const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_URL || "https://prebroadcast.vercel.app"
const STAGING = "https://staging-railguard-s4ii.encr.app"
const LAB = "https://github.com/prasanthkuna/agent-payment-failure-lab"
const PROTOCOL = "https://github.com/prasanthkuna/railguard-protocol"

export default function HomePage() {
  return (
    <main className="container hero">
      <p style={{ color: "var(--accent)", fontWeight: 600, margin: 0 }}>v0.1.0-alpha</p>
      <h1>Railguard</h1>
      <p className="tagline">
        Open-source <strong>financial execution firewall</strong> for autonomous software.
        <br />
        Agent money. Guarded.
      </p>

      <div className="cta-row">
        <a className="btn btn-primary" href="/attack">
          Try Failure Lab loop
        </a>
        <a className="btn" href={OPERATOR}>
          Operator console
        </a>
        <a className="btn" href="/ecosystems">
          Ecosystems
        </a>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Five commands</h2>
          <p>
            <code>scan</code> · <code>attack</code> · <code>protect</code> · <code>status</code> ·{" "}
            <code>receipts</code>
          </p>
        </div>
        <div className="card">
          <h2>Gateway API</h2>
          <p>Staging Encore runtime — policy, reserve, execute, reconcile.</p>
        </div>
        <div className="card">
          <h2>Failure Atlas</h2>
          <p>Executable APF profiles owned by the Failure Lab repo.</p>
        </div>
      </div>

      <p style={{ marginTop: "2.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
        <a href={PROTOCOL}>Railguard Core</a> · <a href={LAB}>Failure Lab</a> · API{" "}
        <a href={STAGING}>{STAGING.replace("https://", "")}</a>
      </p>
    </main>
  )
}
