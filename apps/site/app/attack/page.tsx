export default function AttackPage() {
  return (
    <main className="container">
      <h1>Attack → Protect → Attack</h1>
      <p className="tagline">Demo loop for grants and reviewers (run locally or in CI).</p>
      <ol style={{ color: "var(--muted)", lineHeight: 1.8 }}>
        <li>
          <code>railguard attack</code> — run Failure Lab profiles (vulnerabilities)
        </li>
        <li>
          <code>railguard protect</code> — enable guards on the Gateway
        </li>
        <li>
          <code>railguard attack</code> — same profiles should block or reconcile
        </li>
        <li>
          <code>railguard receipts &lt;executionId&gt;</code> — verify evidence
        </li>
      </ol>
      <p>
        Atlas:{" "}
        <a href="https://github.com/prasanthkuna/agent-payment-failure-lab/tree/main/atlas">
          agent-payment-failure-lab/atlas
        </a>
      </p>
      <p>
        <a href="/">← Home</a>
      </p>
    </main>
  )
}
