/**
 * Hedera testnet constants for ETHGlobal Mumbai 2026
 */

export const HEDERA_TESTNET = {
  network: "hedera-testnet",
  mirrorNodeUrl: "https://testnet.mirrornode.hedera.com",
  /** USDC on Hedera testnet (HTS token) - verify actual token ID from Hedera docs */
  usdcTokenId: "0.0.429274",
} as const

export type HederaNetwork = typeof HEDERA_TESTNET.network
