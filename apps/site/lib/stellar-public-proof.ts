/** Public SCF / judge-facing Stellar testnet proof (from evidence manifest — no auth). */
export const STELLAR_TESTNET_PROOF = {
  slug: "stellar-testnet",
  networkLabel: "Stellar testnet · Horizon",
  transactionHash:
    "3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437",
  explorerUrl:
    "https://horizon-testnet.stellar.org/transactions/3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437",
  status: "CONFIRMED" as const,
  amountHuman: "1 XLM",
  assetType: "native",
  source:
    "GAI6KWY3IPPQSGEXWFARHI7DGPWGQQEXYOB3C7ZRWSTXVMIMIXUGDSXC",
  destination: "GB2VOBJNNP4ZC3LNJBDJ6CMD3PC2FJFI24MOCE4W6LDMVPSCMYYN6NIG",
  memoPrefix: "PI:pi-testnet-evidence:idem-",
  manifestGeneratedAt: "2026-10-04T12:22:17.727Z",
  evidenceRepoPath: "evidence/stellar-testnet/manifest.json",
  reproduceCommand: "bun run stellar-testnet-evidence",
} as const
