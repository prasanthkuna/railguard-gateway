/** Public Monad testnet proof constants (from evidence manifest — no auth). */
export const MONAD_TESTNET_PROOF = {
  slug: "monad-testnet",
  networkLabel: "Monad testnet · chain 10143",
  chainId: 10143,
  status: "CONFIRMED" as const,
  amountHuman: "1 USDC",
  amountBaseUnits: "1,000,000",
  txHash: "0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2",
  explorerUrl:
    "https://testnet.monadvision.com/tx/0x1cbd46100de39c60d88d8d7ee7a1dc66cf2c9c16956ebb403b69c1751b98aab2",
  tokenAddress: "0x534b2f3a21130d7a60830c2df862319e593943a3",
  sender: "0x9a3f50804306fdb12046243bdf2db33d61dcba2d",
  recipient: "0x8c7e2543aa8bf69dc8458dc28104234f6a334233",
  manifestGeneratedAt: "2026-10-04T15:17:05.090Z",
  evidenceRepoPath: "evidence/monad-testnet/manifest.json",
  reproduceCommand: "bun run monad-testnet-evidence",
} as const
