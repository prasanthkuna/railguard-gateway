import Link from "next/link"
import { ECOSYSTEMS } from "../../lib/ecosystems"

export default function EcosystemsPage() {
  return (
    <main className="page">
      <section className="hero" style={{ paddingTop: "2rem" }}>
        <p className="eyebrow">Grant leverage</p>
        <h1>Ecosystems</h1>
        <p className="hero-lead">
          Proof + failure coverage per rail. Source manifest:{" "}
          <span className="mono">docs/ecosystems.yaml</span>
        </p>
      </section>

      <div className="eco-grid">
        {ECOSYSTEMS.map((e) => (
          <article key={e.id} className="eco-card">
            <span className="pill">{e.statusLabel}</span>
            <h3>{e.label}</h3>
            <p className="eco-protects">
              <strong style={{ color: "var(--text)" }}>Railguard protects</strong>
              <br />
              {e.protects.join(" · ")}
            </p>
            <p className="eco-apf">
              <strong style={{ color: "var(--text)" }}>Failure coverage</strong>
              <br />
              {e.apf.join(" · ")}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{e.narrative}</p>
            <p style={{ marginTop: "1rem" }}>
              <a href={e.evidenceHref}>View testnet proof</a>
            </p>
            <p
              className="mono"
              style={{ fontSize: "0.8rem", color: "var(--mint)", marginTop: "0.75rem" }}
            >
              Try: railguard attack
            </p>
          </article>
        ))}
      </div>

      <p style={{ marginTop: "2rem", textAlign: "center" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  )
}
