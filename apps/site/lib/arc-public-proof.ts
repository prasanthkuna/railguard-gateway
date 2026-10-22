/** Public Arc mainnet proof — run sync-arc-public-proof after evidence/arc/manifest.json exists. */
export const ARC_MAINNET_PROOF = {
  slug: "arc-mainnet",
  networkLabel: "Arc mainnet · chain 5042",
  chainId: 5042,
  status: "PENDING" as const,
  amountHuman: "0.01 USDC (proof transfer)",
  amountBaseUnits: "10000",
  txHash: "",
  explorerUrl: "https://explorer.arc.io",
  tokenAddress: "0x3600000000000000000000000000000000000000",
  sender: "",
  recipient: "",
  manifestGeneratedAt: "",
  evidenceRepoPath: "evidence/arc/manifest.json",
  reproduceCommand: "bun run arc-mainnet-evidence",
} as const
