import type { ReceiptViewModel } from "../lib/demo-receipt"

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="receipt-row">
      <span className="receipt-label">{label}</span>
      <span className={mono ? "receipt-value mono" : "receipt-value"}>{value}</span>
    </div>
  )
}

export function ReceiptCard({ data, demo }: { data: ReceiptViewModel; demo?: boolean }) {
  return (
    <article className="receipt-card">
      <header className="receipt-header">
        <div>
          <p className="eyebrow">Execution receipt</p>
          <h1 className="receipt-title mono">{data.executionId}</h1>
        </div>
        {demo ? (
          <span className="pill pill-planned">SAMPLE DATA · NOT AN ON-CHAIN PROOF</span>
        ) : (
          <span className={`pill ${data.chainValid ? "pill-ok" : "pill-bad"}`}>
            {data.chainValid ? "Envelope complete" : "NEEDS REVIEW"}
          </span>
        )}
      </header>

      {demo ? (
        <p className="receipt-demo-note">
          Illustrative fields only. For verified testnet proof see /proof/arbitrum-sepolia.
        </p>
      ) : null}

      <section className="receipt-section">
        <h2>Intent</h2>
        <Row label="Intent ID" value={data.intent.id} mono />
        <Row label="Agent" value={data.intent.agent} />
        <Row label="Requested" value={`${data.intent.amount} ${data.intent.asset}`} />
        <Row label="Recipient" value={data.intent.recipient} mono />
      </section>

      <section className="receipt-section">
        <h2>Policy & reservation</h2>
        <Row label="Policy" value={data.policy.version} mono />
        <Row label="Decision" value={data.policy.decision} />
        <Row label="Reservation" value={data.reservation.grantId} mono />
        <Row label="Valid until" value={data.reservation.validUntil} mono />
      </section>

      <section className="receipt-section">
        <h2>Execution & reconciliation</h2>
        <Row label="Rail" value={data.execution.provider} />
        <Row label="Transaction" value={data.execution.txHash} mono />
        <Row label="Execution" value={data.execution.status} />
        <Row label="Settlement" value={data.reconciliation.settlement} />
        <Row label="Observed" value={data.reconciliation.observedAt} mono />
      </section>

      <section className="receipt-section receipt-hash">
        <h2>Evidence hash</h2>
        <p className="mono hash-block">{data.evidenceHash}</p>
      </section>
    </article>
  )
}
