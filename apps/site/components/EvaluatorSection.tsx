import Link from "next/link"
import { CliCommand } from "./CliCommand"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"
import { INTEGRATION_SNIPPETS } from "../lib/integration-snippets"

const ARCHITECTURE = `${GITHUB_GATEWAY}/blob/main/docs/ARCHITECTURE.md`
const QUICKSTART = `${GITHUB_GATEWAY}#quick-start-windows`
const PILOT = `${GITHUB_GATEWAY}/issues/new/choose`

export function EvaluatorSection() {
  return (
    <section className="section" id="evaluate">
      <h2>Evaluate Railguard seriously</h2>
      <p className="section-intro">
        Three steps: simulate a failure class, inspect verified testnet proof, then run the gateway
        locally against staging or your own signer.
      </p>
      <div className="hero-ctas">
        <Link href="/attack" className="btn btn-mint">
          Simulate a failure
        </Link>
        <Link href="/proof/arbitrum-sepolia" className="btn btn-ghost">
          Inspect verified testnet proof
        </Link>
        <a href={GITHUB_GATEWAY} className="btn btn-ghost" {...EXTERNAL_LINK}>
          Run Railguard locally
        </a>
      </div>
      <div style={{ marginTop: "1.5rem", maxWidth: "42rem" }}>
        <CliCommand
          label="Verify pack locally (terminal)"
          command={`${INTEGRATION_SNIPPETS.verifyPublicProofs} && ${INTEGRATION_SNIPPETS.verifyDemo}`}
          comments={[INTEGRATION_SNIPPETS.installComment]}
          bunRunRailguard={false}
        />
      </div>
      <p className="rg-caption" style={{ marginTop: "1.25rem" }}>
        <a href={ARCHITECTURE} {...EXTERNAL_LINK}>
          Read the architecture
        </a>
        {" · "}
        <a href={QUICKSTART} {...EXTERNAL_LINK}>
          Quick start
        </a>
        {" · "}
        <a href={PILOT} {...EXTERNAL_LINK}>
          Request a pilot
        </a>
      </p>
    </section>
  )
}
