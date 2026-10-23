/**
 * Solana SPL payment verifier (devnet). A payment is CONFIRMED only when the transaction is
 * finalized, did not error, and the token balance deltas match the intent exactly:
 * the recipient owner gained `amount` of `mint`, and (optionally) the sender lost it and the memo
 * carries the Railguard request id. Anything else is not CONFIRMED.
 */
import type { SolanaRpc } from "./rpc"

export type SolanaVerifyStatus =
  | "CONFIRMED"
  | "PENDING"
  | "NOT_FOUND"
  | "FAILED"
  | "RECONCILIATION_REQUIRED"

export interface SolanaExpectedPayment {
  mint: string
  /** Wallet (owner) that must receive the tokens, not the token account. */
  recipientOwner: string
  /** Atomic units (USDC: 6 decimals, 1.25 USDC = 1250000). */
  amount: bigint
  senderOwner?: string | undefined
  /** Railguard request id carried in an SPL Memo instruction. */
  memo?: string | undefined
}

export interface SolanaPaymentFacts {
  signature: string
  slot: number
  confirmationStatus: string | null
  err: unknown
  recipientDelta: bigint
  senderDelta: bigint | null
  memos: string[]
  blockTime: number | null
}

export interface SolanaVerifyResult {
  status: SolanaVerifyStatus
  reason?: string
  facts?: SolanaPaymentFacts
}

interface TokenBalance {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: { amount: string; decimals: number }
}

interface ParsedTx {
  slot: number
  blockTime: number | null
  meta: {
    err: unknown
    preTokenBalances?: TokenBalance[]
    postTokenBalances?: TokenBalance[]
    logMessages?: string[]
  } | null
  transaction: {
    message: {
      instructions: Array<{ program?: string; programId?: string; parsed?: unknown }>
    }
  }
}

/** Sum of balance change for (owner, mint) across all token accounts in the transaction. */
export function ownerDelta(tx: ParsedTx, owner: string, mint: string): bigint {
  const sum = (rows: TokenBalance[] | undefined) =>
    (rows ?? [])
      .filter((b) => b.owner === owner && b.mint === mint)
      .reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), 0n)
  return sum(tx.meta?.postTokenBalances) - sum(tx.meta?.preTokenBalances)
}

export function memosOf(tx: ParsedTx): string[] {
  const out: string[] = []
  for (const ix of tx.transaction.message.instructions) {
    if (ix.program === "spl-memo" && typeof ix.parsed === "string") out.push(ix.parsed)
  }
  return out
}

export async function verifySolanaSplPayment(input: {
  rpc: SolanaRpc
  signature: string
  expected: SolanaExpectedPayment
  /** Default "finalized". "confirmed" is accepted only for a fast x402 preview, never for crediting. */
  requiredCommitment?: "confirmed" | "finalized"
}): Promise<SolanaVerifyResult> {
  const required = input.requiredCommitment ?? "finalized"
  const statuses = await input.rpc.call<{
    value: Array<{ confirmationStatus: string | null; err: unknown } | null>
  }>("getSignatureStatuses", [[input.signature], { searchTransactionHistory: true }])
  const status = statuses.value[0]
  if (!status) return { status: "NOT_FOUND", reason: "signature_not_found" }

  const tx = await input.rpc.call<ParsedTx | null>("getTransaction", [
    input.signature,
    { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 },
  ])
  if (!tx) return { status: "PENDING", reason: "transaction_not_yet_queryable" }

  const e = input.expected
  const facts: SolanaPaymentFacts = {
    signature: input.signature,
    slot: tx.slot,
    confirmationStatus: status.confirmationStatus,
    err: tx.meta?.err ?? null,
    recipientDelta: ownerDelta(tx, e.recipientOwner, e.mint),
    senderDelta: e.senderOwner ? ownerDelta(tx, e.senderOwner, e.mint) : null,
    memos: memosOf(tx),
    blockTime: tx.blockTime,
  }
  if (facts.err) return { status: "FAILED", reason: "transaction_error", facts }
  if (facts.recipientDelta !== e.amount) {
    return { status: "RECONCILIATION_REQUIRED", reason: "recipient_amount_mismatch", facts }
  }
  if (facts.senderDelta !== null && facts.senderDelta !== -e.amount) {
    return { status: "RECONCILIATION_REQUIRED", reason: "sender_amount_mismatch", facts }
  }
  if (e.memo && !facts.memos.includes(e.memo)) {
    return { status: "RECONCILIATION_REQUIRED", reason: "memo_mismatch", facts }
  }
  const done =
    facts.confirmationStatus === "finalized" ||
    (required === "confirmed" && facts.confirmationStatus === "confirmed")
  if (!done) return { status: "PENDING", reason: "awaiting_finalization", facts }
  return { status: "CONFIRMED", facts }
}

/** getSignaturesForAddress reports memos as "[len] text"; match the exact Railguard request id. */
export function memoMatches(reported: string | null, requestId: string): boolean {
  if (!reported) return false
  return reported.split("; ").some((m) => m.replace(/^\[\d+\]\s*/, "") === requestId)
}
