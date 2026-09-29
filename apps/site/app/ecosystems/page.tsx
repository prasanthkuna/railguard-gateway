import Link from "next/link"
import { EcosystemVerifyCard } from "../../components/EcosystemVerifyCard"
import { ECOSYSTEMS } from "../../lib/ecosystems"

export default function EcosystemsPage() {
  return (
    <main className="page page-wide">
      <section className="hero" style={{ paddingTop: "2rem" }}>
        <p className="eyebrow">Compatibility</p>
        <h1>Works across financial rails</h1>
        <p className="hero-lead">
          Testnet-verified execution paths. Manifest:{" "}
          <span className="mono">docs/ecosystems.yaml</span>
        </p>
      </section>

      <div className="eco-grid">
        {ECOSYSTEMS.map((e) => (
          <EcosystemVerifyCard key={e.id} eco={e} />
        ))}
      </div>

      <p style={{ marginTop: "2rem", textAlign: "center" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  )
}
