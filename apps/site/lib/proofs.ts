import { ARBITRUM_SEPOLIA_PROOF } from "./arbitrum-public-proof"
import { METAL_TESTNET_PROOF } from "./metal-public-proof"
import { MONAD_TESTNET_PROOF } from "./monad-public-proof"
import { STELLAR_SOROBAN_POLICY_PROOF } from "./stellar-public-proof"

export type ProofSummary = {
  id: string
  chain: string
  logo?: string
  headline: string
  plain: string
  status: string
  date: string
  href: string
  txUrl: string
}

/** The four public, confirmed proofs. Single source for home tiles and /proof. */
export const PROOFS: ProofSummary[] = [
  {
    id: "arbitrum",
    chain: "Arbitrum Sepolia",
    logo: "/logos/arbitrum.svg",
    headline: "0.01 USDC, settlement verified",
    plain: "Railguard checked the intent, watched the transfer and matched it on chain.",
    status: "Confirmed",
    date: "30 Sep 2026",
    href: "/proof/arbitrum-sepolia",
    txUrl: ARBITRUM_SEPOLIA_PROOF.explorerUrl,
  },
  {
    id: "stellar",
    chain: "Stellar Soroban",
    logo: "/logos/stellar.svg",
    headline: "Policy contract, 5 attacks rejected",
    plain:
      "Budgets and intent rules enforced on chain: replays, wrong recipients and overspend fail.",
    status: "Confirmed",
    date: "23 Oct 2026",
    href: "/proof/stellar-testnet",
    txUrl: STELLAR_SOROBAN_POLICY_PROOF.executeUrl,
  },
  {
    id: "monad",
    chain: "Monad testnet",
    headline: "1 USDC transfer matched",
    plain: "Railguard read the receipt logs and matched token, sender, recipient and amount.",
    status: "Confirmed",
    date: "4 Oct 2026",
    href: "/proof/monad-testnet",
    txUrl: MONAD_TESTNET_PROOF.explorerUrl,
  },
  {
    id: "metal",
    chain: "Metal testnet",
    headline: "3 agents under on-chain limits",
    plain:
      "An over-cap purchase was refused, limits were re-approved, and a lost payout paid once.",
    status: "Confirmed",
    date: "23 Oct 2026",
    href: "/proof/metal-testnet",
    txUrl: METAL_TESTNET_PROOF.steps[1].href,
  },
]
