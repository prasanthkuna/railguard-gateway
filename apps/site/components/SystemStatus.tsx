export function SystemStatus() {
  return (
    <div className="system-status mono" aria-label="System status">
      <span>
        <span className="status-dot ok" /> Gateway healthy
      </span>
      <span>
        <span className="status-dot ok" /> Failure Lab APF-001…006
      </span>
      <span>
        <span className="status-dot ok" /> Base testnet verified
      </span>
      <span>
        <span className="status-dot ok" /> Stellar testnet verified
      </span>
    </div>
  )
}
