import Link from "next/link"
import { AttackDemo } from "../../components/AttackDemo"

export default function AttackPage() {
  return (
    <main className="page page-wide">
      <div className="attack-page-hero">
        <p className="eyebrow">Failure Lab</p>
        <h1>Can it survive six financial failures?</h1>
        <p className="hero-lead" style={{ margin: "0 auto" }}>
          Watch attacks arrive in sequence — then <span className="mono">railguard protect</span>{" "}
          and run again.
        </p>
      </div>
      <AttackDemo />
      <div className="receipt-actions">
        <Link href="/" className="btn btn-ghost">
          ← Home
        </Link>
      </div>
    </main>
  )
}
