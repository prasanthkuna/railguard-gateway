import Link from "next/link"
import { AttackDemo } from "../components/AttackDemo"
import { EcosystemVerifyCard } from "../components/EcosystemVerifyCard"
import { FossSection } from "../components/FossSection"
import { HeroSection } from "../components/HeroSection"
import { LifecycleTrace } from "../components/LifecycleTrace"
import { RecipesSection } from "../components/RecipesSection"
import { OPERATOR_URL } from "../lib/constants"
import { ECOSYSTEMS } from "../lib/ecosystems"

export default function HomePage() {
  return (
    <main className="page">
      <HeroSection />

      <LifecycleTrace />

      <section className="section" id="failure-lab">
        <h2>Failure Lab</h2>
        <p className="section-intro">
          Six canonical failure classes — attack, protect, attack again. Same story as the
          executable Atlas and <span className="mono">railguard attack</span>.
        </p>
        <AttackDemo />
      </section>

      <RecipesSection />

      <section className="section" id="evidence">
        <h2>Evidence</h2>
        <p className="section-intro">
          Every execution produces a verifiable envelope — intent, policy, settlement, hash chain.
        </p>
        <p>
          <Link href="/r/demo" className="btn btn-mint">
            View sample receipt
          </Link>
        </p>
      </section>

      <section className="section" id="ecosystems">
        <h2>Works across financial rails</h2>
        <p className="section-intro">
          Railguard keeps the control model constant while execution infrastructure changes.
        </p>
        <div className="eco-grid">
          {ECOSYSTEMS.map((e) => (
            <EcosystemVerifyCard key={e.id} eco={e} />
          ))}
        </div>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/ecosystems">All ecosystems →</Link>
        </p>
      </section>

      <FossSection />

      <section className="final-cta">
        <h2>Give agents authority. Not unlimited money.</h2>
        <p className="section-intro" style={{ margin: "0 auto 1.5rem" }}>
          Open-source financial execution firewall for autonomous software.
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
