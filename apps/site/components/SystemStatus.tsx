import Link from "next/link"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"

const PROOFS: { label: string; href: string; date: string; external?: boolean }[] = [
  {
    label: "Failure Lab · APF-001…006 simulation",
    href: "/attack",
    date: "shipped",
  },
  {
    label: "Arbitrum Sepolia · SETTLED proof",
    href: "/proof/arbitrum-sepolia",
    date: "2026-09-30",
  },
  {
    label: "Stellar testnet · CONFIRMED proof",
    href: "/proof/stellar-testnet",
    date: "2026-10-04",
  },
  {
    label: "Repository tests & evidence",
    href: `${GITHUB_GATEWAY}/tree/main/evidence`,
    date: "main branch",
    external: true,
  },
]

export function SystemStatus() {
  return (
    <div className="system-status mono" aria-label="Latest repository proofs">
      <span className="system-status-title">Latest repository proofs</span>
      {PROOFS.map((p) =>
        p.external ? (
          <a key={p.href} href={p.href} {...EXTERNAL_LINK}>
            <span className="status-dot ok" /> {p.label} · {p.date}
          </a>
        ) : (
          <Link key={p.href} href={p.href}>
            <span className="status-dot ok" /> {p.label} · {p.date}
          </Link>
        ),
      )}
    </div>
  )
}
