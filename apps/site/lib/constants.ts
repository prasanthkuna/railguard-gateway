export const OPERATOR_URL =
  process.env.NEXT_PUBLIC_OPERATOR_URL || "https://prebroadcast.vercel.app"
export const STAGING_API =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-railguard-s4ii.encr.app"
export const GITHUB_GATEWAY = "https://github.com/prasanthkuna/railguard-gateway"
export const GITHUB_LAB = "https://github.com/prasanthkuna/agent-payment-failure-lab"
export const GITHUB_PROTOCOL = "https://github.com/prasanthkuna/railguard-protocol"
export const GITHUB_X402 = "https://github.com/prasanthkuna/x402-guard"
export const CDP_PORTAL = "https://portal.cdp.coinbase.com/"

const ghBlob = (path: string) => `${GITHUB_GATEWAY}/blob/main/${path}`

/** Shipped docs that replace missing /evidence/* tree on GitHub */
export const DOC_LINKS = {
  ecosystems: ghBlob("docs/ecosystems.yaml"),
  p0Testnet: ghBlob("docs/P0_TESTNET_COMPLETE.md"),
  integration: ghBlob("docs/INTEGRATION.md"),
  demoVerification: ghBlob("docs/runbooks/demo-verification.md"),
} as const

export const EXTERNAL_LINK = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const
