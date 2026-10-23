/** Horizon-backed Stellar testnet payment verification (no mainnet). */

export const STELLAR_TESTNET_EVIDENCE_TX =
  "3dc3225844f711f9f96ead65690d224b7ccfd616d1da5387df6bfc63bfb8e437"

export interface StellarPaymentFacts {
  hash: string
  successful: boolean
  source: string
  destination: string
  assetType: string
  assetCode?: string
  assetIssuer?: string
  amount: string
  memo?: string
}

export interface StellarVerifyInput {
  txHash: string
  horizonUrl?: string
  expectedDestination?: string
  expectedAmount?: string
  expectedMemo?: string
  /** "native" for XLM, or a credit asset such as Circle testnet USDC. */
  expectedAsset?: StellarExpectedAsset
  fetchImpl?: typeof fetch
}

export type StellarExpectedAsset = "native" | { code: string; issuer: string }

/** Circle testnet USDC on Stellar (issuer published by Circle). */
export const STELLAR_TESTNET_USDC_ASSET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
} as const

/** Parse "native" | "XLM" | "CODE:ISSUER" (e.g. from RAILGUARD_STELLAR_ASSET). */
export function parseStellarAsset(value: string | undefined): StellarExpectedAsset | undefined {
  const v = value?.trim()
  if (!v) return undefined
  if (v === "native" || v.toUpperCase() === "XLM") return "native"
  const [code, issuer] = v.split(":")
  if (!code || !issuer) throw new Error("stellar_asset_format")
  return { code, issuer }
}

export function stellarAssetMatches(
  facts: StellarPaymentFacts,
  expected: StellarExpectedAsset,
): boolean {
  if (expected === "native") return facts.assetType === "native"
  return (
    facts.assetType !== "native" &&
    facts.assetCode === expected.code &&
    facts.assetIssuer === expected.issuer
  )
}

export interface StellarVerifyResult {
  status: "CONFIRMED" | "RECONCILIATION_REQUIRED" | "FAILED"
  facts?: StellarPaymentFacts
  reason?: string
}

export async function fetchStellarPaymentFacts(
  txHash: string,
  horizonUrl = "https://horizon-testnet.stellar.org",
  fetchImpl: typeof fetch = fetch,
): Promise<StellarPaymentFacts> {
  const res = await fetchImpl(`${horizonUrl}/transactions/${txHash}/operations?limit=10`)
  if (!res.ok) {
    throw new Error(`horizon_http_${res.status}`)
  }
  const json = (await res.json()) as {
    _embedded?: { records?: Array<Record<string, unknown>> }
  }
  const txRes = await fetchImpl(`${horizonUrl}/transactions/${txHash}`)
  if (!txRes.ok) {
    throw new Error(`horizon_tx_${txRes.status}`)
  }
  const tx = (await txRes.json()) as { successful?: boolean; memo?: string }
  const payment = json._embedded?.records?.find((r) => r.type === "payment") as
    | {
        from: string
        to: string
        asset_type: string
        asset_code?: string
        asset_issuer?: string
        amount: string
      }
    | undefined
  if (!payment) {
    throw new Error("no_payment_operation")
  }
  return {
    hash: txHash,
    successful: tx.successful === true,
    source: payment.from,
    destination: payment.to,
    assetType: payment.asset_type,
    assetCode: payment.asset_code,
    assetIssuer: payment.asset_issuer,
    amount: payment.amount,
    memo: typeof tx.memo === "string" ? tx.memo : undefined,
  }
}

export async function verifyStellarTestnetPayment(
  input: StellarVerifyInput,
): Promise<StellarVerifyResult> {
  const facts = await fetchStellarPaymentFacts(input.txHash, input.horizonUrl, input.fetchImpl)
  if (!facts.successful) {
    return { status: "FAILED", facts, reason: "transaction_not_successful" }
  }
  if (input.expectedDestination && facts.destination !== input.expectedDestination) {
    return { status: "RECONCILIATION_REQUIRED", facts, reason: "destination_mismatch" }
  }
  if (input.expectedAsset && !stellarAssetMatches(facts, input.expectedAsset)) {
    return { status: "RECONCILIATION_REQUIRED", facts, reason: "asset_mismatch" }
  }
  if (input.expectedAmount && facts.amount !== input.expectedAmount) {
    return { status: "RECONCILIATION_REQUIRED", facts, reason: "amount_mismatch" }
  }
  if (input.expectedMemo && facts.memo) {
    const ok = facts.memo === input.expectedMemo || facts.memo.startsWith(`${input.expectedMemo}:`)
    if (!ok) {
      return { status: "RECONCILIATION_REQUIRED", facts, reason: "memo_mismatch" }
    }
  }
  return { status: "CONFIRMED", facts }
}
