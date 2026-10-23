/** Public Metal testnet proof (Kit 11 x402 business agents) from evidence/metal-testnet/kit11-live.json. */
const EXPLORER = "https://testnet.metalntwx.com"

const tx = (hash: string) => `${EXPLORER}/tx/${hash}`

export const METAL_TESTNET_PROOF = {
  slug: "metal-testnet",
  networkLabel: "Metal testnet · eip155:63825",
  runId: "kit11-20261023T0437",
  recordedAt: "2026-10-23",
  status: "CONFIRMED" as const,
  account: "0x7C2AE2f9DeD3ff262790b5F6a95B0C7AA1828F5B",
  totalBudget: "20 *USDZ",
  evidenceRepoPath: "evidence/metal-testnet/kit11-live.json",
  operatorUrl: "https://prebroadcast.vercel.app/x402-agents",
  steps: [
    {
      label: "Query sold (order 1)",
      detail: "Buyer paid 0.05 with a signed order; the sourcing agent paid upstream 0.02.",
      outcome: "SOLD",
      href: tx("0x127f7107f2fcdd66fee44c011952039a5bcb8556c18bd2790575e7bb033a6f9d"),
    },
    {
      label: "Over-cap purchase refused",
      detail:
        "Upstream raised its price to 0.04, above the 0.03 cap. The account refused it and the buyer was not charged.",
      outcome: "REFUSED",
      href: tx("0x9139ec9ee4ca8462e6aa5898171ec14ec3376a24d5fd9a0c707846835b4bb875"),
    },
    {
      label: "New limits approved and applied",
      detail:
        "The treasury agent proposed new limits inside the 20 *USDZ total, a person approved, and the mandate was replaced.",
      outcome: "REPLACED",
      href: tx("0x993b0637b2fdd1007c378d06c37d4a50adc58962279ce1a669a22f7a111a4590"),
    },
    {
      label: "Earnings payout paid once",
      detail:
        "The payout answer was dropped on purpose and the same payout re-sent. It was already paid, so nothing more was sent.",
      outcome: "PAID ONCE",
      href: tx("0x020a0c49f2c43074949893e34334ccd03c3e6bfa13b46e14515fa7b86ccc997c"),
    },
  ],
} as const
