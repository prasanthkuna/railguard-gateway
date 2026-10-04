import Link from "next/link"
import { AgentIntegrationsSection } from "../components/AgentIntegrationsSection"
import { AttackDemo } from "../components/AttackDemo"
import { EcosystemVerifyCard } from "../components/EcosystemVerifyCard"
import { EvaluatorSection } from "../components/EvaluatorSection"
import { FossSection } from "../components/FossSection"
import { HeroSection } from "../components/HeroSection"
import { IntegrationsStrip } from "../components/IntegrationsStrip"
import { LifecycleTrace } from "../components/LifecycleTrace"
import { RecipesSection } from "../components/RecipesSection"
import {
  EXTERNAL_LINK,
  OPERATOR_LOGIN_URL,
  PUBLIC_PROOF_URL,
} from "../lib/constants"
import { ECOSYSTEMS } from "../lib/ecosystems"

export default function HomePage() {
  return (
    <main className="page page-wide">
      <HeroSection />

      <LifecycleTrace />

      <section className="section" id="failure-lab">
        <h2>Failure Lab</h2>
        <p className="section-intro">
          Interactive failure simulation — six canonical classes. Client-side animation, not live
          payment execution. Same story as the executable Atlas and{" "}
          <span className="mono">railguard attack</span>.
        </p>
        <AttackDemo />
      </section>

      <RecipesSection />

      <AgentIntegrationsSection />

      <section className="section" id="evidence">
        <h2>Evidence</h2>
        <p className="section-intro">
          Stored Railguard executions produce a tamper-evident envelope — intent, policy, settlement,
          hash chain.
        </p>
        <p className="hero-ctas" style={{ marginTop: "1rem" }}>
          <Link href="/proof/arbitrum-sepolia" className="btn btn-mint">
            View verified testnet proof
          </Link>
          <Link href="/r/demo" className="btn btn-ghost">
            View sample receipt
          </Link>
        </p>
      </section>

      <IntegrationsStrip />

      <section className="section" id="ecosystems">
        <h2>One control model across supported and planned rails</h2>
        <p className="section-intro">
          Railguard keeps the control model constant while execution infrastructure changes.
        </p>
        <div className="eco-grid">
          {[...ECOSYSTEMS]
            .sort((a, b) => {
              const rank = (s: (typeof ECOSYSTEMS)[number]["status"]) =>
                s === "grant-phase" ? 2 : s === "adapter" ? 1 : 0
              return rank(a.status) - rank(b.status)
            })
            .map((e) => (
              <EcosystemVerifyCard key={e.id} eco={e} />
            ))}
        </div>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/ecosystems">All ecosystems →</Link>
        </p>
      </section>

      <FossSection />

      <EvaluatorSection />

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
          <a href={PUBLIC_PROOF_URL} className="btn btn-ghost">
            Public testnet proof
          </a>
          <a href={OPERATOR_LOGIN_URL} className="btn btn-ghost" {...EXTERNAL_LINK}>
            Replay in console (sign-in)
          </a>
        </div>
      </section>
    </main>
  )
}
