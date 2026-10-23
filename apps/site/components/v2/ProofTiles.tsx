import Link from "next/link"
import { EXTERNAL_LINK } from "../../lib/constants"
import { PROOFS } from "../../lib/proofs"

export function ProofTiles() {
  return (
    <div className="ui-grid-4">
      {PROOFS.map((p) => (
        <div key={p.id} className="ui-card">
          <div className="ui-proof-top">
            <span className="ui-chain">
              {p.logo ? <img src={p.logo} alt="" width={24} height={24} /> : null}
              {p.chain}
            </span>
          </div>
          <span className="ui-pill ui-pill-ok">{p.status}</span>
          <h3 style={{ marginTop: 14 }}>{p.headline}</h3>
          <p>{p.plain}</p>
          <p className="ui-proof-date">Recorded {p.date}</p>
          <div className="ui-card-foot">
            <a href={p.txUrl} {...EXTERNAL_LINK}>
              View tx ↗
            </a>
            <Link href={p.href}>Evidence →</Link>
          </div>
        </div>
      ))}
    </div>
  )
}
