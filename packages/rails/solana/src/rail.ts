/**
 * Guarded SPL payment rail (devnet). The guarantees:
 *  1. Code policy runs before a transaction is built (guard.ts).
 *  2. One intent = one request id = one memo. Before sending, the rail looks for that memo on chain,
 *     so lost local state cannot cause a second payment.
 *  3. A timeout or 5xx on send is UNKNOWN, never FAILED. The budget stays reserved and the rail
 *     never re-signs a new transaction while the old blockhash can still land.
 *  4. UNKNOWN becomes FAILED_SAFE only when the old blockhash has provably expired and the
 *     signature was never seen. Only then may the same intent be sent again (same memo).
 *  5. CONFIRMED needs a finalized transaction whose balance deltas match the intent exactly.
 */
import { DEVNET_USDC_MINT } from "./constants"
import { type GuardDecision, type SolanaPaymentIntent, checkSolanaPayment } from "./guard"
import type { SolanaSpendPolicy } from "./guard"
import {
  type SolanaRpc,
  SolanaRpcError,
  assertDevnet,
  getBlockHeight,
  getLatestBlockhash,
  getSignaturesForAddress,
  getTokenAccountsByOwner,
  sendRawTransaction,
} from "./rpc"
import {
  type SolanaSigner,
  compileLegacyMessage,
  memoInstruction,
  signTransaction,
  transferCheckedInstruction,
} from "./tx"
import { memoMatches, verifySolanaSplPayment } from "./verifier"

export type AttemptState =
  | "DENIED"
  | "SUBMITTED"
  | "UNKNOWN"
  | "CONFIRMED"
  | "FAILED_SAFE"
  | "RECONCILIATION_REQUIRED"

export interface SolanaAttempt {
  requestId: string
  intentId: string
  state: AttemptState
  amount: string
  recipientOwner: string
  mint: string
  signature?: string | undefined
  lastValidBlockHeight?: number | undefined
  sends: number
  reason?: string | undefined
  events: Array<{ at: string; event: string; detail?: string | undefined }>
}

export interface AttemptLedger {
  get(requestId: string): SolanaAttempt | undefined
  put(attempt: SolanaAttempt): void
  all(): SolanaAttempt[]
}

export function createMemoryLedger(seed: SolanaAttempt[] = []): AttemptLedger {
  const rows = new Map(seed.map((a) => [a.requestId, a]))
  return {
    get: (id) => rows.get(id),
    put: (a) => {
      rows.set(a.requestId, a)
    },
    all: () => [...rows.values()],
  }
}

/** Budget that counts CONFIRMED and still-open (SUBMITTED / UNKNOWN) attempts: frozen, not freed. */
export function reservedOrSpent(ledger: AttemptLedger): bigint {
  return ledger
    .all()
    .filter((a) =>
      ["SUBMITTED", "UNKNOWN", "CONFIRMED", "RECONCILIATION_REQUIRED"].includes(a.state),
    )
    .reduce((acc, a) => acc + BigInt(a.amount), 0n)
}

export interface SolanaRailOptions {
  rpc: SolanaRpc
  signer: SolanaSigner
  policy: SolanaSpendPolicy
  ledger?: AttemptLedger
  approvedTermsHashes?: ReadonlySet<string> | undefined
  now?: () => Date
  /** Skip the genesis check only in unit tests with a fake RPC. */
  skipClusterCheck?: boolean
}

export interface PayResult {
  attempt: SolanaAttempt
  decision?: GuardDecision
}

export function createSolanaRail(options: SolanaRailOptions) {
  const ledger = options.ledger ?? createMemoryLedger()
  const now = options.now ?? (() => new Date())
  const rpc = options.rpc
  const log = (a: SolanaAttempt, event: string, detail?: string) => {
    a.events.push({ at: now().toISOString(), event, detail })
    ledger.put(a)
  }

  async function findByMemo(owner: string, requestId: string): Promise<string | undefined> {
    const sigs = await getSignaturesForAddress(rpc, owner, 100)
    return sigs.find((s) => memoMatches(s.memo, requestId) && !s.err)?.signature
  }

  async function reconcile(requestId: string): Promise<SolanaAttempt> {
    const a = ledger.get(requestId)
    if (!a) throw new Error("unknown_request_id")
    if (a.state === "CONFIRMED" || a.state === "DENIED" || a.state === "FAILED_SAFE") return a
    const signature = a.signature ?? (await findByMemo(options.signer.publicKey, requestId))
    if (signature) {
      a.signature = signature
      const v = await verifySolanaSplPayment({
        rpc,
        signature,
        expected: {
          mint: a.mint,
          recipientOwner: a.recipientOwner,
          amount: BigInt(a.amount),
          senderOwner: options.signer.publicKey,
          memo: requestId,
        },
      })
      if (v.status === "CONFIRMED") {
        a.state = "CONFIRMED"
        log(a, "settlement_verified", `slot ${v.facts?.slot}`)
        return a
      }
      if (v.status === "FAILED") {
        a.state = "FAILED_SAFE"
        log(a, "failed_on_chain", v.reason)
        return a
      }
      if (v.status === "RECONCILIATION_REQUIRED") {
        a.state = "RECONCILIATION_REQUIRED"
        log(a, "facts_mismatch_escalate", v.reason)
        return a
      }
      if (v.status === "PENDING") {
        log(a, "pending", v.reason)
        return a
      }
    }
    // Not seen anywhere. Only an expired blockhash proves the old transaction can never land.
    if (a.lastValidBlockHeight !== undefined) {
      const height = await getBlockHeight(rpc)
      if (height > a.lastValidBlockHeight) {
        a.state = "FAILED_SAFE"
        log(a, "blockhash_expired_not_landed", `height ${height} > ${a.lastValidBlockHeight}`)
        return a
      }
    }
    log(a, "still_unknown", "budget stays reserved; no resend")
    return a
  }

  async function pay(intent: SolanaPaymentIntent): Promise<PayResult> {
    if (!options.skipClusterCheck) await assertDevnet(rpc)
    if (intent.senderOwner !== options.signer.publicKey) throw new Error("sender_is_not_signer")
    const decision = checkSolanaPayment({
      intent,
      policy: options.policy,
      spentOrReservedToday: reservedOrSpent(ledger),
      approvedTermsHashes: options.approvedTermsHashes,
    })
    const existing = ledger.get(decision.requestId)
    if (existing && existing.state !== "FAILED_SAFE" && existing.state !== "DENIED") {
      // Same intent again (agent retry, queue redelivery): never a second send.
      log(existing, "duplicate_blocked", `state ${existing.state}`)
      return { attempt: await reconcile(existing.requestId), decision }
    }
    if (decision.decision === "DENY") {
      const denied: SolanaAttempt = {
        requestId: decision.requestId,
        intentId: intent.id,
        state: "DENIED",
        amount: intent.amount.toString(),
        recipientOwner: intent.recipientOwner,
        mint: intent.mint,
        sends: existing?.sends ?? 0,
        reason: decision.code,
        events: existing?.events ?? [],
      }
      log(denied, "denied", decision.code)
      return { attempt: denied, decision }
    }

    const attempt: SolanaAttempt = existing ?? {
      requestId: decision.requestId,
      intentId: intent.id,
      state: "SUBMITTED",
      amount: intent.amount.toString(),
      recipientOwner: intent.recipientOwner,
      mint: intent.mint,
      sends: 0,
      events: [],
    }
    attempt.state = "SUBMITTED"
    attempt.signature = undefined
    attempt.reason = undefined

    // Reconcile first: a previous run may have paid and lost its local record.
    const prior = await findByMemo(intent.senderOwner, decision.requestId)
    if (prior) {
      attempt.signature = prior
      log(attempt, "found_existing_payment_by_memo", prior)
      return { attempt: await reconcile(attempt.requestId), decision }
    }

    const [source] = (await getTokenAccountsByOwner(rpc, intent.senderOwner, intent.mint)).filter(
      (t) => t.amount >= intent.amount,
    )
    const [destination] = await getTokenAccountsByOwner(rpc, intent.recipientOwner, intent.mint)
    if (!source || !destination) {
      attempt.state = "FAILED_SAFE"
      attempt.reason = !source ? "insufficient_token_balance" : "recipient_token_account_missing"
      log(attempt, "preflight_refused", attempt.reason)
      return { attempt, decision }
    }

    const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(rpc)
    const message = compileLegacyMessage({
      feePayer: intent.senderOwner,
      recentBlockhash: blockhash,
      instructions: [
        memoInstruction(decision.requestId),
        transferCheckedInstruction({
          source: source.pubkey,
          mint: intent.mint,
          destination: destination.pubkey,
          owner: intent.senderOwner,
          amount: intent.amount,
          decimals: source.decimals,
        }),
      ],
    })
    const { wire, signature } = signTransaction(message, options.signer)
    // Record the signature before sending: if the response is lost we still know what to look for.
    attempt.signature = signature
    attempt.lastValidBlockHeight = lastValidBlockHeight
    attempt.sends += 1
    log(attempt, "signed", signature)
    try {
      await sendRawTransaction(rpc, wire)
      log(attempt, "sent")
    } catch (err) {
      if (err instanceof SolanaRpcError && !err.ambiguous) {
        attempt.state = "FAILED_SAFE"
        attempt.reason = err.message
        log(attempt, "rejected_before_broadcast", err.message)
        return { attempt, decision }
      }
      attempt.state = "UNKNOWN"
      attempt.reason = (err as Error).message
      log(attempt, "send_outcome_unknown", "budget frozen; reconcile by signature and memo")
      return { attempt, decision }
    }
    return { attempt, decision }
  }

  return { pay, reconcile, ledger }
}

export const DEFAULT_DEVNET_POLICY = (recipients: string[]): SolanaSpendPolicy => ({
  version: "solana-devnet-v1",
  allowedMints: [DEVNET_USDC_MINT],
  allowedRecipients: recipients,
  perPaymentCap: 1_000_000n, // 1 USDC
  dailyBudget: 3_000_000n, // 3 USDC
  approvalThreshold: 500_000n, // 0.50 USDC
})
