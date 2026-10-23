/** Public Stellar testnet proof constants (from evidence manifest — no auth). */
export const STELLAR_TESTNET_PROOF = {
  slug: "stellar-testnet",
  networkLabel: "Stellar testnet · Horizon",
  transactionHash: "3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437",
  explorerUrl:
    "https://horizon-testnet.stellar.org/transactions/3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437",
  status: "CONFIRMED" as const,
  amountHuman: "1 XLM",
  assetType: "native",
  source: "GAI6KWY3IPPQSGEXWFARHI7DGPWGQQEXYOB3C7ZRWSTXVMIMIXUGDSXC",
  destination: "GB2VOBJNNP4ZC3LNJBDJ6CMD3PC2FJFI24MOCE4W6LDMVPSCMYYN6NIG",
  memoPrefix: "PI:pi-testnet-evidence:idem-",
  manifestGeneratedAt: "2026-10-04T12:22:17.727Z",
  evidenceRepoPath: "evidence/stellar-testnet/manifest.json",
  reproduceCommand: "bun run stellar-testnet-evidence",
} as const

/** Soroban policy contract proof on Stellar testnet (Circle testnet USDC). */
export const STELLAR_SOROBAN_POLICY_PROOF = {
  contractId: "CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N",
  contractUrl:
    "https://stellar.expert/explorer/testnet/contract/CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N",
  executeTx: "2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353",
  executeUrl:
    "https://stellar.expert/explorer/testnet/tx/2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353",
  executeHorizonUrl:
    "https://horizon-testnet.stellar.org/transactions/2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353/operations",
  grantTx: "063cfeb9165754d71309bd996ae5b117b34caf1e5d887fc6facbe2bee2be076e",
  grantUrl:
    "https://stellar.expert/explorer/testnet/tx/063cfeb9165754d71309bd996ae5b117b34caf1e5d887fc6facbe2bee2be076e",
  requestId: "a51ce40f43414f30b131c12b6812200053d1db0d93fa679f004f0a49114268db",
  asset: "Circle testnet USDC",
  assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  amountHuman: "1.25 USDC",
  budgetHuman: "5 USDC",
  agent: "GDX7EBCAC4NVLPBE4TGDNEUEA2TAGOYCKELCQP245YMHA66GV6PIDLP5",
  recipient: "GATQQK34YWBIHF3KTSFL4EFEPTIFH5UJK347CLKAJGYO437KRKTU22VO",
  recordedAt: "2026-10-23",
  sourcePath: "contracts/soroban/railguard-policy",
  evidenceRepoPath: "evidence/stellar-soroban-policy",
  reproduceCommand: "bun run stellar-soroban-policy-evidence",
  rejections: [
    { attempt: "Grant the same intent again", result: "DuplicateRequest" },
    { attempt: "Execute to a different recipient", result: "IntentMismatch" },
    { attempt: "Execute 1 stroop more than granted", result: "IntentMismatch" },
    { attempt: "Execute again after success (replay)", result: "AlreadyExecuted" },
    { attempt: "Grant 4 USDC with 1.25 spent of a 5 USDC budget", result: "BudgetExceeded" },
  ],
} as const
