import type { Metadata } from "next"
import Link from "next/link"
import { AttackDemo } from "../../components/AttackDemo"

export const metadata: Metadata = {
  title: "Failure Lab — six payment failure classes",
  description:
    "Interactive simulation of agent payment failure classes (APF). Compare unprotected flows with Railguard policy, protect, and verify.",
  alternates: { canonical: "/attack" },
}

export default function AttackPage() {
  return (
    <main className="page page-wide">
      <div className="attack-page-hero">
        <p className="eyebrow">Failure Lab · interactive simulation</p>
        <h1>Can it survive six financial failures?</h1>
        <p className="hero-lead" style={{ margin: "0 auto" }}>
          Client-side simulation of six payment-failure classes — then{" "}
          <span className="mono">railguard protect</span> and simulate again.
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
