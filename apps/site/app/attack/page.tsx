import Link from "next/link"
import { AttackDemo } from "../../components/AttackDemo"

export default function AttackPage() {
  return (
    <main className="page">
      <div className="attack-page-hero">
        <p className="eyebrow">Hero demo</p>
        <h1>An unsafe agent has your wallet</h1>
        <p className="hero-lead" style={{ margin: "0 auto" }}>
          Run attacks, enable protection, run again. This is the loop for grants, YC, X, and hiring.
        </p>
      </div>
      <AttackDemo />
      <div className="receipt-actions">
        <Link href="/" className="btn btn-ghost">
          ← Home
        </Link>
        <Link href="/r/demo" className="btn btn-mint">
          View receipt
        </Link>
      </div>
    </main>
  )
}
