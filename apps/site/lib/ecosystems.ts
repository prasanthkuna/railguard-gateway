import { DOC_LINKS, GITHUB_X402, OPERATOR_URL } from "./constants"

import type { IntegrationLogoId } from "./integration-logos"

export type EcosystemCard = {
  id: IntegrationLogoId
  label: string
  status: string
  statusLabel: string
  protects: string[]
  apf: string[]
  evidenceHref: string
  evidenceLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
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
    evidenceHref: DOC_LINKS.p0Testnet,
    evidenceLabel: "View testnet proof",
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
    evidenceHref: DOC_LINKS.demoVerification,
    evidenceLabel: "View demo verification",
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
    evidenceHref: OPERATOR_URL,
    evidenceLabel: "Open operator console",
    secondaryHref: DOC_LINKS.integration,
    secondaryLabel: "CDP integration docs",
    narrative: "Reference operator console + CDP execution path for grant reviewers.",
  },
  {
    id: "x402",
    label: "x402",
    status: "adapter",
    statusLabel: "ADAPTER",
    protects: ["Pre-sign policy", "Replay", "Rolling budgets"],
    apf: ["APF-001", "APF-002"],
    evidenceHref: GITHUB_X402,
    evidenceLabel: "View x402 adapter",
    narrative: "Execution rail inside Gateway — not a separate product.",
  },
]
