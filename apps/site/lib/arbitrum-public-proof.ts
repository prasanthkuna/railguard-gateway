/** Public Arbitrum Sepolia proof constants (from evidence manifests — no auth). */
export const ARBITRUM_SEPOLIA_PROOF = {
  slug: "arbitrum-sepolia",
  networkLabel: "Arbitrum Sepolia · testnet",
  chainId: 421614,
  executionId: "exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa",
  intentId: "fin_881568b7-208e-4587-9192-2f015118a788",
  status: "SETTLED" as const,
  amountHuman: "0.01 USDC",
  amountBaseUnits: "10,000",
  asset: "USDC",
  txHash: "0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d",
  explorerUrl:
    "https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d",
  tokenAddress: "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d",
  recipient: "0x8c7e2543aa8bf69dc8458dc28104234f6a334233",
  sender: "0x9a3f50804306fdb12046243bdf2db33d61dcba2d",
  manifestGeneratedAt: "2026-09-30T19:41:25.840Z",
  hookAddress: "0x756829c3ab0eB02b22fe4D7C9E35252A9738965E",
  hookExplorerUrl: "https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E",
  evidenceRepoPath: "evidence/arbitrum-sepolia/manifest.json",
  hookEvidenceRepoPath: "evidence/arbitrum-sepolia-hook/README.md",
} as const
