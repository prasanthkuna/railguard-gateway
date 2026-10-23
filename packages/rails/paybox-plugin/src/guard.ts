/**
 * Railguard checks for x402 payments proposed through PayBox. Pure functions (no SDK imports) so
 * they are unit-tested in the Railguard repo and bundled into the hosted plugin unchanged.
 *
 * What the plugin enforces before it proposes anything:
 *   - the endpoint host is on the owner's allowlist,
 *   - the 402 quote asks for canonical USDC on Base,
 *   - the quoted price is within the per-call cap,
 *   - the payee (payTo) is the expected one when the agent names it,
 *   - the proposal's maxAmount is the exact quoted price, not the cap. PayBox re-fetches the live
 *     402 challenge and compares, so a price raised after the check cannot be paid silently.
 */

export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
export const BASE_CHAINS = new Set(["base", "eip155:8453"])

export interface X402Quote {
  version: 1 | 2
  network: string
  asset: string
  payTo: string
  /** Atomic USDC units. */
  amount: string
  scheme: string
}

export type GuardCode =
  | "HOST_NOT_ALLOWED"
  | "NOT_A_402"
  | "NO_BASE_USDC_OPTION"
  | "OVER_PER_CALL_CAP"
  | "PAYEE_MISMATCH"
  | "QUOTE_INVALID"

export type GuardResult =
  | { decision: "ALLOW"; quote: X402Quote; requestId: string }
  | { decision: "DENY"; code: GuardCode; detail: string; requestId: string }

export interface GuardPolicy {
  allowedHosts: string[]
  /** Atomic USDC. */
  perCallCap: bigint
}

/** Owner-set, non-sensitive env (PayBox "Environment variable"): hosts and cap. */
export function policyFromEnv(env: Record<string, string | undefined>): GuardPolicy {
  const hosts = (env.RAILGUARD_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  const cap = env.RAILGUARD_PER_CALL_CAP_ATOMIC?.trim() || "100000" // 0.10 USDC
  if (!/^[1-9][0-9]{0,19}$/.test(cap)) throw new Error("RAILGUARD_PER_CALL_CAP_ATOMIC invalid")
  return { allowedHosts: hosts, perCallCap: BigInt(cap) }
}

/** Deterministic id for one (agent purpose, endpoint, price) so logs and receipts line up. */
export async function requestIdFor(purpose: string, url: string, amount: string): Promise<string> {
  const data = new TextEncoder().encode(`railguard:paybox:${purpose}:${url}:${amount}`)
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data))
  return `rg_${[...digest].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40)}`
}

type Accept = Record<string, unknown>

function pickBaseUsdc(accepts: Accept[], version: 1 | 2): X402Quote | undefined {
  for (const a of accepts) {
    const network = String(a.network ?? "")
    const asset = String(a.asset ?? "").toLowerCase()
    const amount = String(version === 2 ? (a.amount ?? a.maxAmountRequired ?? "") : (a.maxAmountRequired ?? ""))
    if (!BASE_CHAINS.has(network) || asset !== BASE_USDC) continue
    if (!/^[1-9][0-9]{0,19}$/.test(amount)) continue
    if (!/^0x[0-9a-fA-F]{40}$/.test(String(a.payTo ?? ""))) continue
    return { version, network, asset, payTo: String(a.payTo), amount, scheme: String(a.scheme ?? "") }
  }
  return undefined
}

/** Parse an x402 v1 (JSON body) or v2 (PAYMENT-REQUIRED header, base64 JSON) challenge. */
export function parseChallenge(input: {
  status: number
  headerPaymentRequired?: string | null
  bodyText?: string
}): { ok: true; quote: X402Quote } | { ok: false; code: GuardCode; detail: string } {
  if (input.status !== 402) return { ok: false, code: "NOT_A_402", detail: `status ${input.status}` }
  try {
    if (input.headerPaymentRequired) {
      const json = JSON.parse(atob(input.headerPaymentRequired)) as { accepts?: Accept[] }
      const q = pickBaseUsdc(json.accepts ?? [], 2)
      if (q) return { ok: true, quote: q }
    }
    if (input.bodyText) {
      const json = JSON.parse(input.bodyText) as { x402Version?: number; accepts?: Accept[] }
      const q = pickBaseUsdc(json.accepts ?? [], json.x402Version === 2 ? 2 : 1)
      if (q) return { ok: true, quote: q }
    }
  } catch {
    return { ok: false, code: "QUOTE_INVALID", detail: "challenge is not valid x402 JSON" }
  }
  return { ok: false, code: "NO_BASE_USDC_OPTION", detail: "no exact USDC-on-Base option offered" }
}

export function hostAllowed(url: string, policy: GuardPolicy): boolean {
  const u = new URL(url)
  return u.protocol === "https:" && policy.allowedHosts.includes(u.hostname.toLowerCase())
}

export async function checkQuote(input: {
  url: string
  purpose: string
  policy: GuardPolicy
  quote?: X402Quote
  challengeError?: { code: GuardCode; detail: string }
  expectedPayTo?: string | undefined
}): Promise<GuardResult> {
  const amount = input.quote?.amount ?? "0"
  const requestId = await requestIdFor(input.purpose, input.url, amount)
  const deny = (code: GuardCode, detail: string): GuardResult => ({
    decision: "DENY",
    code,
    detail,
    requestId,
  })
  if (!hostAllowed(input.url, input.policy)) {
    return deny("HOST_NOT_ALLOWED", "the owner has not allowed this host (RAILGUARD_ALLOWED_HOSTS)")
  }
  if (input.challengeError) return deny(input.challengeError.code, input.challengeError.detail)
  const q = input.quote
  if (!q) return deny("QUOTE_INVALID", "no quote")
  if (BigInt(q.amount) > input.policy.perCallCap) {
    return deny("OVER_PER_CALL_CAP", `quote ${q.amount} > cap ${input.policy.perCallCap} (atomic USDC)`)
  }
  if (input.expectedPayTo && input.expectedPayTo.toLowerCase() !== q.payTo.toLowerCase()) {
    return deny("PAYEE_MISMATCH", "the endpoint asks to pay a different address than expected")
  }
  return { decision: "ALLOW", quote: q, requestId }
}
