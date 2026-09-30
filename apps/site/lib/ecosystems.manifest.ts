/**
 * Single source for ecosystem cards + integration detail pages.
 * Keep in sync with docs/ecosystems.yaml and packages/settlement/src/chains.ts.
 */

import {
  CDP_PORTAL,
  DOC_LINKS,
  GITHUB_GATEWAY,
  GITHUB_LAB,
  GITHUB_X402,
  MARKETING_SITE_URL,
  OPERATOR_URL,
} from "./constants"

export type EcosystemLogoId =
  | "stellar"
  | "base"
  | "cdp"
  | "x402"
  | "arbitrum"
  | "monad"
  | "arc"
  | "celo"
  | "airwallex"
  | "failure-lab"

export type EcosystemManifestEntry = {
  id: EcosystemLogoId
  label: string
  status: "integrated" | "testnet" | "adapter" | "shipped" | "grant-phase"
  statusLabel: string
  rail: string
  codePath: string
  protects: string[]
  apf: string[]
  narrative: string
  evidenceHref: string
  evidenceLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  lastProof?: string
  transactions?: number
  failuresTested?: number
  evidenceStatus?: string
  /** Internal + grant-phase pages only — not shown on verified integration pages (e.g. Arbitrum). */
  grantProgram?: string
  grantDeadline?: string
  grantPortal?: string
  oneCommand: string
  architectureBlurb: string
}

const LIFECYCLE =
  "Intent → Authorize → Reserve → Execute → Observe → Reconcile → Evidence"

export const ECOSYSTEM_MANIFEST: EcosystemManifestEntry[] = [
  {
    id: "x402",
    label: "x402",
    status: "adapter",
    statusLabel: "ADAPTER",
    rail: "x402",
    codePath: "packages/kernel/src/adapters/x402Rail.ts",
    protects: ["Pre-sign policy", "Replay", "Rolling budgets"],
    apf: ["APF-001", "APF-002"],
    narrative: "Execution rail inside Gateway — not a separate product.",
    evidenceHref: GITHUB_X402,
    evidenceLabel: "View x402 adapter",
    oneCommand: "railguard attack",
    architectureBlurb: `Same ${LIFECYCLE}; x402-guard enforces policy before sign.`,
  },
  {
    id: "cdp",
    label: "Coinbase CDP",
    status: "integrated",
    statusLabel: "INTEGRATED",
    rail: "cdp",
    codePath: "packages/kernel/src/adapters/cdpRail.ts",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-003", "APF-004", "APF-005"],
    narrative: "Reference operator console + CDP execution path on Base Sepolia.",
    evidenceHref: OPERATOR_URL,
    evidenceLabel: "Open operator console",
    secondaryHref: CDP_PORTAL,
    secondaryLabel: "CDP portal",
    oneCommand: "railguard protect",
    architectureBlurb: `CDP executes; Railguard owns ${LIFECYCLE}.`,
    grantProgram: "Base / CDP ecosystem proof",
  },
  {
    id: "base",
    label: "Base",
    status: "testnet",
    statusLabel: "TESTNET VERIFIED",
    rail: "base",
    codePath: "packages/kernel/src/adapters/baseRail.ts",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-003", "APF-004", "APF-005"],
    narrative: "Base Sepolia reference execution via CDP.",
    evidenceHref: DOC_LINKS.demoVerification,
    evidenceLabel: "View demo verification",
    lastProof: "2026-09-28",
    transactions: 12,
    failuresTested: 3,
    evidenceStatus: "VERIFIED",
    oneCommand: "railguard verify <executionId>",
    architectureBlurb: "Base is an alias of the CDP execution path on Base Sepolia.",
    grantProgram: "Base distribution / cohort",
  },
  {
    id: "arbitrum",
    label: "Arbitrum",
    status: "testnet",
    statusLabel: "SEPOLIA VERIFIED",
    rail: "arbitrum-sepolia",
    codePath: "packages/settlement/src/arbitrum-sepolia.ts",
    protects: ["Policy", "Execution", "Observe", "Reconcile", "ENFORCE"],
    apf: ["APF-003", "APF-004"],
    narrative:
      "Arbitrum Sepolia: Railguard hook deploy + Tier B MetaMask settlement verify on the shared lifecycle kernel.",
    evidenceHref: `${GITHUB_GATEWAY}/tree/main/evidence/arbitrum-sepolia-hook`,
    evidenceLabel: "Sepolia hook + settlement evidence",
    lastProof: "2026-09-30",
    evidenceStatus: "VERIFIED",
    grantProgram: "Arbitrum Open House Singapore",
    grantDeadline: "2026-10-04",
    grantPortal:
      "https://arbitrum-singapore.hackquest.io/buildathons/Arbitrum-Open-House-Singapore-Online-Buildathon",
    oneCommand: "bun run arbitrum-sepolia-evidence",
    architectureBlurb: `Hook + adapter on Sepolia (421614); operator Tier B external broadcast — ${LIFECYCLE}.`,
  },
  {
    id: "monad",
    label: "Monad",
    status: "testnet",
    statusLabel: "SETTLEMENT VERIFY",
    rail: "monad-testnet",
    codePath: "packages/settlement/src/chains.ts",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-002", "APF-003", "APF-005"],
    narrative: "Monad testnet executor via EVM settlement-verify rail (Metropolis track: Trust & AI).",
    evidenceHref: DOC_LINKS.p0Testnet,
    evidenceLabel: "Testnet runbook",
    grantProgram: "Monad Metropolis",
    grantDeadline: "2026-10-13",
    oneCommand: "railguard attack",
    architectureBlurb: "Same kernel; Monad chain ID + RPC in settlement registry.",
  },
  {
    id: "arc",
    label: "Arc (Circle)",
    status: "testnet",
    statusLabel: "SETTLEMENT VERIFY",
    rail: "arc / arc-testnet",
    codePath: "packages/settlement/src/chains.ts",
    protects: ["Policy", "USDC execution", "Reconciliation"],
    apf: ["APF-003", "APF-004"],
    narrative: "Circle Arc USDC path — microgrant + developer grant evidence.",
    evidenceHref: DOC_LINKS.p0Testnet,
    evidenceLabel: "Arc testnet evidence",
    grantProgram: "Arc Microgrant",
    grantDeadline: "2026-10-14",
    oneCommand: "bun run arc-testnet-evidence",
    architectureBlurb: "Arc mainnet/testnet settlement verify; one Railguard product.",
  },
  {
    id: "stellar",
    label: "Stellar",
    status: "testnet",
    statusLabel: "TESTNET VERIFIED",
    rail: "stellar",
    codePath: "packages/integrations/src/rails/stellarRail.ts",
    protects: ["Policy", "Reservation", "Execution", "Reconciliation"],
    apf: ["APF-001", "APF-003", "APF-004"],
    narrative: "Horizon settlement verification on testnet.",
    evidenceHref: DOC_LINKS.p0Testnet,
    evidenceLabel: "View testnet proof",
    lastProof: "2026-09-28",
    evidenceStatus: "VERIFIED",
    grantProgram: "Stellar SCF Build #46",
    grantDeadline: "2026-11-08",
    grantPortal: "https://communityfund.stellar.org/awards/recxrSMYwAl8vcglg",
    oneCommand: "railguard verify",
    architectureBlurb: "Non-EVM observe/reconcile via Horizon; same evidence envelope.",
  },
  {
    id: "celo",
    label: "Celo",
    status: "grant-phase",
    statusLabel: "GRANT PHASE",
    rail: "celo / celo-alfajores",
    codePath: "packages/settlement/src/chains.ts",
    protects: ["Policy", "Agent payments", "Verification"],
    apf: ["APF-001", "APF-004"],
    narrative: "Celo agent-economy verification layer (Prezenti Frontier).",
    evidenceHref: DOC_LINKS.ecosystems,
    evidenceLabel: "Ecosystem manifest",
    grantProgram: "Celo Prezenti Frontier",
    grantDeadline: "2026-12-29",
    oneCommand: "railguard check",
    architectureBlurb: "EVM settlement-verify; deepen when application warrants.",
  },
  {
    id: "airwallex",
    label: "Airwallex",
    status: "grant-phase",
    statusLabel: "GRANT PHASE",
    rail: "airwallex",
    codePath: "packages/integrations/src/rails/airwallexRail.ts",
    protects: ["Policy", "Fiat API execution", "Reconciliation"],
    apf: ["APF-003", "APF-005"],
    narrative: "Fiat/agentic banking executor on the same correctness core (GO/NO-GO Oct 5).",
    evidenceHref: DOC_LINKS.integration,
    evidenceLabel: "Integration docs",
    grantProgram: "Airwallex Agentic Banking",
    grantDeadline: "TBD Oct 2026",
    oneCommand: "railguard protect",
    architectureBlurb: "Traditional payment API as execution adapter — not a second product.",
  },
  {
    id: "failure-lab",
    label: "Failure Lab",
    status: "shipped",
    statusLabel: "SHIPPED",
    rail: "n/a",
    codePath: "agent-payment-failure-lab",
    protects: ["APF-001…006", "SARIF", "CI reproduction"],
    apf: ["APF-001", "APF-002", "APF-003", "APF-004", "APF-005", "APF-006"],
    narrative: "Six financial failure classes — attack, protect, and reproduce in the open lab.",
    evidenceHref: GITHUB_LAB,
    evidenceLabel: "Failure Atlas",
    secondaryHref: `${MARKETING_SITE_URL}/attack`,
    secondaryLabel: "Live attack demo",
    oneCommand: "railguard attack",
    architectureBlurb: "Attack → protect → receipt; same IDs on site, CLI, and evidence.",
  },
]

export function getEcosystemById(id: string): EcosystemManifestEntry | undefined {
  return ECOSYSTEM_MANIFEST.find((e) => e.id === id)
}
