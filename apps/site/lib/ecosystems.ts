export type EcosystemCard = {
  id: string
  label: string
  status: string
  statusLabel: string
  protects: string[]
  apf: string[]
  evidenceHref: string
  narrative: string
  lastProof?: string
  transactions?: number
  failuresTested?: number
  evidenceStatus?: string
}

export const ECOSYSTEMS: EcosystemCard[] = [
  {
    id: "stellar",
    label: "Stellar",
    status: "testnet",
    statusLabel: "TESTNET VERIFIED",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-001", "APF-003", "APF-004"],
    evidenceHref: `${process.env.NEXT_PUBLIC_GITHUB_GATEWAY || "https://github.com/prasanthkuna/railguard-gateway"}/tree/main/evidence/stellar-testnet`,
    narrative: "Horizon settlement verification on testnet.",
    lastProof: "2026-09-28",
    evidenceStatus: "VERIFIED",
  },
  {
    id: "base",
    label: "Base",
    status: "testnet",
    statusLabel: "TESTNET VERIFIED",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-003", "APF-004", "APF-005"],
    evidenceHref: `${process.env.NEXT_PUBLIC_GITHUB_GATEWAY || "https://github.com/prasanthkuna/railguard-gateway"}/tree/main/evidence/cdp-base-sepolia-live`,
    narrative: "Base Sepolia reference execution via CDP.",
    lastProof: "2026-09-28",
    transactions: 12,
    failuresTested: 3,
    evidenceStatus: "VERIFIED",
  },
  {
    id: "cdp",
    label: "Coinbase CDP",
    status: "integrated",
    statusLabel: "INTEGRATED",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-003", "APF-004", "APF-005"],
    evidenceHref:
      "https://github.com/prasanthkuna/railguard-gateway/tree/main/evidence/arbitrum-sepolia",
    narrative: "Reference runtime + reconciler for grant reviewers.",
  },
  {
    id: "x402",
    label: "x402",
    status: "adapter",
    statusLabel: "ADAPTER",
    protects: ["Pre-sign policy", "Replay", "Rolling budgets"],
    apf: ["APF-001", "APF-002"],
    evidenceHref: "https://github.com/prasanthkuna/x402-guard",
    narrative: "Execution rail inside Gateway — not a separate product.",
  },
]
