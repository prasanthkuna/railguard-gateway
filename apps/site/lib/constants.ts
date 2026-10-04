export const MARKETING_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://railguard-site.vercel.app"

export const OPERATOR_URL =
  process.env.NEXT_PUBLIC_OPERATOR_URL || "https://prebroadcast.vercel.app"

export const SETTLED_EXECUTION_ID = "exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa"

const siteRoot = MARKETING_SITE_URL.replace(/\/$/, "")
const operatorRoot = OPERATOR_URL.replace(/\/$/, "")

export const PUBLIC_PROOF_URL = `${siteRoot}/proof/arbitrum-sepolia`
export const PUBLIC_STELLAR_PROOF_URL = `${siteRoot}/proof/stellar-testnet`

export const OPERATOR_JUDGE_LOGIN_URL = `${operatorRoot}/login?intent=judge`

export const OPERATOR_SETTLED_REPLAY_URL = `${operatorRoot}/executions/${SETTLED_EXECUTION_ID}?guide=judge`

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
