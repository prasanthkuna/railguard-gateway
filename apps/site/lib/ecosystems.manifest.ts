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
    narrative: "Reference testnet console + CDP execution path on Base Sepolia.",
    evidenceHref: OPERATOR_URL,
    evidenceLabel: "Open testnet console",
    secondaryHref: CDP_PORTAL,
    secondaryLabel: "CDP portal",
    oneCommand: "railguard protect",
    architectureBlurb: `CDP executes; Railguard owns ${LIFECYCLE}.`,
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
  },
  {
    id: "arbitrum",
    label: "Arbitrum",
    status: "testnet",
    statusLabel: "SEPOLIA VERIFIED",
    rail: "arbitrum-sepolia",
    codePath: "packages/settlement/src/arbitrum-sepolia.ts",
    protects: ["Policy", "Execution", "Observe", "Reconcile", "Evidence"],
    apf: ["APF-003", "APF-004"],
    narrative:
      "Hook contracts deployed on Sepolia; separately, external-wallet 0.01 USDC verified via operator lifecycle (two independent proofs).",
    evidenceHref: `${MARKETING_SITE_URL}/proof/arbitrum-sepolia`,
    evidenceLabel: "Public SETTLED proof",
    secondaryHref: `${GITHUB_GATEWAY}/tree/main/evidence/arbitrum-sepolia-hook`,
    secondaryLabel: "Hook + manifest",
    lastProof: "2026-09-30",
    evidenceStatus: "VERIFIED",
    oneCommand: "bun run arbitrum-sepolia-evidence",
    architectureBlurb: `Hook deployment on Sepolia (421614); external-wallet verification via ${LIFECYCLE} — separate proofs.`,
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
    narrative: "Monad testnet executor via EVM settlement-verify rail.",
    evidenceHref: `${MARKETING_SITE_URL}/ecosystems/monad`,
    evidenceLabel: "Monad integration (portal paste in repo)",
    secondaryHref: `${GITHUB_GATEWAY}/blob/main/docs/grants/MONAD_METROPOLIS_PORTAL_PASTE.md`,
    secondaryLabel: "Metropolis portal paste",
    oneCommand: "bun run monad-testnet-evidence",
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
    narrative: "Circle Arc USDC settlement-verify on testnet.",
    evidenceHref: DOC_LINKS.p0Testnet,
    evidenceLabel: "Arc testnet evidence",
    oneCommand: "bun run arc-testnet-evidence",
    architectureBlurb: "Arc mainnet/testnet settlement verify; one Railguard product.",
  },
  {
    id: "stellar",
    label: "Stellar",
    status: "testnet",
    statusLabel: "HORIZON CONFIRMED",
    rail: "stellar-testnet",
    codePath:
      "packages/integrations/src/rails/stellarRail.ts · packages/settlement/src/stellar-testnet.ts",
    protects: ["Policy", "Execution", "Observe", "Reconcile", "Evidence"],
    apf: ["APF-001", "APF-003", "APF-004"],
    narrative:
      "Native XLM payment on testnet verified via Horizon (CONFIRMED); public proof page + committed manifest.",
    evidenceHref: `${MARKETING_SITE_URL}/proof/stellar-testnet`,
    evidenceLabel: "Public CONFIRMED proof",
    secondaryHref: `${GITHUB_GATEWAY}/tree/main/evidence/stellar-testnet`,
    secondaryLabel: "Manifest + README",
    lastProof: "2026-10-04",
    evidenceStatus: "VERIFIED",
    oneCommand: "bun run stellar-testnet-evidence",
    architectureBlurb: `Horizon observe/reconcile on Stellar testnet; verification path aligned with ${LIFECYCLE}.`,
  },
  {
    id: "celo",
    label: "Celo",
    status: "grant-phase",
    statusLabel: "ROADMAP",
    rail: "celo / celo-alfajores",
    codePath: "packages/settlement/src/chains.ts",
    protects: ["Policy", "Agent payments", "Verification"],
    apf: ["APF-001", "APF-004"],
    narrative: "Celo agent-economy verification via EVM settlement-verify (roadmap).",
    evidenceHref: DOC_LINKS.ecosystems,
    evidenceLabel: "Ecosystem manifest",
    oneCommand: "railguard check",
    architectureBlurb: "EVM settlement-verify; deepen when application warrants.",
  },
  {
    id: "airwallex",
    label: "Airwallex",
    status: "grant-phase",
    statusLabel: "ROADMAP",
    rail: "airwallex",
    codePath: "packages/integrations/src/rails/airwallexRail.ts",
    protects: ["Policy", "Fiat API execution", "Reconciliation"],
    apf: ["APF-003", "APF-005"],
    narrative: "Fiat/agentic banking executor on the same correctness core (integration planned).",
    evidenceHref: DOC_LINKS.integration,
    evidenceLabel: "Integration docs",
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
