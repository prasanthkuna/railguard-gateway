import Link from "next/link"
import { ARC_MAINNET_PROOF } from "../lib/arc-public-proof"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"

const ARC_CONFIRMED =
  ARC_MAINNET_PROOF.status === "CONFIRMED" && ARC_MAINNET_PROOF.txHash.length > 0

const PROOFS: { label: string; href: string; date: string; external?: boolean }[] = [
  {
    label: "Failure Lab · APF-001…006 simulation",
    href: "/attack",
    date: "shipped",
  },
  {
    label: "Arbitrum Sepolia · CONFIRMED proof",
    href: "/proof/arbitrum-sepolia",
    date: "2026-09-30",
  },
  {
    label: "Stellar testnet · CONFIRMED proof",
    href: "/proof/stellar-testnet",
    date: "2026-10-04",
  },
  {
    label: "Monad testnet · CONFIRMED proof",
    href: "/proof/monad-testnet",
    date: "2026-10-04",
  },
  {
    label: ARC_CONFIRMED ? "Arc mainnet · CONFIRMED proof" : "Arc mainnet · proof pending",
    href: "/proof/arc-mainnet",
    date: ARC_CONFIRMED ? "5042" : "pending",
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
