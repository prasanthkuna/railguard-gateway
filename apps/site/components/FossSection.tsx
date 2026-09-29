import { EXTERNAL_LINK, GITHUB_GATEWAY, GITHUB_LAB } from "../lib/constants"

export function FossSection() {
  return (
    <section className="section foss-section" id="foss">
      <h2>Open source</h2>
      <div className="foss-grid">
        <div className="foss-terminal mono">
          <p>
            <span className="prompt">$</span> railguard attack
          </p>
          <ul className="foss-checks">
            <li>no account</li>
            <li>self-hostable Gateway</li>
            <li>inspect every policy decision</li>
            <li>build your own execution rail</li>
          </ul>
        </div>
        <div className="foss-arch">
          <pre className="mono foss-diagram">
            {`Your Agent
    ↓
Railguard
    ↓
Your Signer
    ↓
Your Chain`}
          </pre>
          <p className="foss-keys">
            <strong>Your keys stay with your infrastructure.</strong>
          </p>
          <p className="foss-links">
            <a href={GITHUB_GATEWAY} {...EXTERNAL_LINK}>
              railguard-gateway
            </a>{" "}
            ·{" "}
            <a href={GITHUB_LAB} {...EXTERNAL_LINK}>
              Failure Lab
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
