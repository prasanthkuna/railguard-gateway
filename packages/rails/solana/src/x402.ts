/**
 * x402-style "exact" payment on Solana devnet, verified on chain by the seller (no facilitator).
 * The seller quotes a price with a one-time nonce; the buyer's Railguard rail pays with
 * memo = request id of `x402:<nonce>`; the seller checks the payment facts and serves the resource
 * once per signature.
 */
import { DEVNET_USDC_MINT } from "./constants"
import { solanaRequestId } from "./guard"
import type { SolanaRpc } from "./rpc"
import { verifySolanaSplPayment } from "./verifier"

export interface SolanaPaymentRequirements {
  scheme: "exact"
  network: "solana-devnet"
  asset: string
  payTo: string
  maxAmountRequired: string
  resource: string
  description: string
  extra: { nonce: string; memo: string }
}

export interface X402Challenge {
  x402Version: 1
  error: string
  accepts: SolanaPaymentRequirements[]
}

export function quoteRequirements(input: {
  resource: string
  payTo: string
  amountAtomic: bigint
  nonce: string
  description: string
}): SolanaPaymentRequirements {
  return {
    scheme: "exact",
    network: "solana-devnet",
    asset: DEVNET_USDC_MINT,
    payTo: input.payTo,
    maxAmountRequired: input.amountAtomic.toString(),
    resource: input.resource,
    description: input.description,
    extra: { nonce: input.nonce, memo: solanaRequestId(`x402:${input.nonce}`) },
  }
}

export function encodePaymentHeader(signature: string, nonce: string): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 1,
      scheme: "exact",
      network: "solana-devnet",
      payload: { signature, nonce },
    }),
  ).toString("base64")
}

export function decodePaymentHeader(value: string): { signature: string; nonce: string } {
  const json = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as {
    payload?: { signature?: string; nonce?: string }
  }
  const signature = json.payload?.signature
  const nonce = json.payload?.nonce
  if (!signature || !nonce) throw new Error("payment_header_invalid")
  return { signature, nonce }
}

/** Seller-side check. Each signature buys the resource once; the memo binds it to this quote. */
export function createSolanaX402Seller(input: { rpc: SolanaRpc }) {
  const quotes = new Map<string, SolanaPaymentRequirements>()
  const spent = new Set<string>()
  return {
    quote(req: SolanaPaymentRequirements) {
      quotes.set(req.extra.nonce, req)
      return req
    },
    async settle(header: string): Promise<{ ok: true } | { ok: false; reason: string }> {
      let parsed: { signature: string; nonce: string }
      try {
        parsed = decodePaymentHeader(header)
      } catch {
        return { ok: false, reason: "payment_header_invalid" }
      }
      const q = quotes.get(parsed.nonce)
      if (!q) return { ok: false, reason: "unknown_or_expired_quote" }
      if (spent.has(parsed.signature)) return { ok: false, reason: "signature_already_used" }
      const v = await verifySolanaSplPayment({
        rpc: input.rpc,
        signature: parsed.signature,
        expected: {
          mint: q.asset,
          recipientOwner: q.payTo,
          amount: BigInt(q.maxAmountRequired),
          memo: q.extra.memo,
        },
        requiredCommitment: "confirmed",
      })
      if (v.status !== "CONFIRMED") return { ok: false, reason: v.reason ?? v.status }
      spent.add(parsed.signature)
      quotes.delete(parsed.nonce)
      return { ok: true }
    },
  }
}
