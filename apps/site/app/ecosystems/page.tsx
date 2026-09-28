const ecosystems = [
  {
    id: "coinbase-cdp",
    label: "Coinbase Developer Platform",
    status: "integrated",
    note: "Base Sepolia reference execution + reconciliation.",
  },
  { id: "base", label: "Base", status: "testnet", note: "base-sepolia evidence paths." },
  { id: "stellar", label: "Stellar", status: "testnet", note: "Horizon verify on testnet." },
  { id: "x402", label: "x402", status: "adapter", note: "Execution rail adapter (x402-guard)." },
  {
    id: "failure-lab",
    label: "Failure Lab",
    status: "shipped",
    note: "APF-001…006 adversarial profiles.",
  },
]

export default function EcosystemsPage() {
  return (
    <main className="container">
      <h1>Ecosystems</h1>
      <p className="tagline">Grant manifest — source: railguard-gateway/docs/ecosystems.yaml</p>
      <div className="grid">
        {ecosystems.map((e) => (
          <div key={e.id} className="card">
            <h2>{e.label}</h2>
            <p>
              <strong>{e.status}</strong> — {e.note}
            </p>
          </div>
        ))}
      </div>
      <p style={{ marginTop: "2rem" }}>
        <a href="/">← Home</a>
      </p>
    </main>
  )
}
