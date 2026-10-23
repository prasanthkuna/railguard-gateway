/**
 * Celo x402 buyer rail. Every paid call goes: 402 -> Railguard guard -> sign EIP-3009 with the
 * intent-derived nonce -> paid request -> verify the settlement on-chain ourselves.
 *
 * Ambiguity rules (INV-001 / INV-005):
 *  - no answer after signing => UNKNOWN, budget reservation stays FROZEN, no new signature.
 *  - reconcile by request id: the nonce. USDC.authorizationState(from, nonce) says whether it ran;
 *    the AuthorizationUsed log gives the tx, which the verifier checks. If the nonce is unused and
 *    validBefore has passed, the authorization can never execute: FAILED_SAFE, budget released.
 *  - an idempotent replay re-sends the SAME signed payload with the SAME payment-identifier; it can
 *    never pay twice because USDC refuses a used nonce.
 */
import type { AuthorizationGrant } from "@railguard/kernel/authority"
import type {
  ExecutionObservation,
  ExecutionRail,
  ExecutionSubmission,
  PreparedExecution,
  SettlementResult,
} from "@railguard/kernel/executionRail"
import type { FinancialIntent } from "@railguard/kernel/intent"
import type { Address, Hex, LocalAccount } from "viem"
import { CELO_SEPOLIA } from "./chain"
import type { CeloChainReader } from "./chainReader"
import { paymentIdentifierFor, railguardNonce, signTransferAuthorization } from "./eip3009"
import type { CeloPaymentGuard } from "./guard"
import { type CeloVerifyResult, verifyCeloUsdcSettlement } from "./verifier"
import {
  HEADER_PAYMENT_REQUIRED,
  HEADER_PAYMENT_RESPONSE,
  HEADER_PAYMENT_SIGNATURE,
  HEADER_X_PAYMENT,
  PAYMENT_IDENTIFIER_SCHEMA,
  type PaymentPayload,
  type PaymentRequired,
  type SettleResponse,
  decodeX402Header,
  encodeX402Header,
} from "./x402"

export const CELO_X402_RAIL_NAME = "celo-x402-sepolia"

export type CeloAttemptState =
  | "SIGNED"
  | "SUBMITTED"
  | "UNKNOWN"
  | "CONFIRMED"
  | "FAILED_SAFE"
  | "REJECTED"
  | "DISPUTED"
const BLOCKING: readonly CeloAttemptState[] = [
  "SIGNED",
  "SUBMITTED",
  "UNKNOWN",
  "CONFIRMED",
  "DISPUTED",
]

export interface CeloAttempt {
  executionId: string
  intentId: string
  url: string
  state: CeloAttemptState
  nonce: Hex
  paymentId: string
  from: Address
  payTo: Address
  amount: string
  validBefore: number
  sellerAgentId: string
  receiptId: string
  authorizationId?: string | undefined
  payload: PaymentPayload
  fromBlock: string
  txHash?: Hex | undefined
  verify?: CeloVerifyResult | undefined
  paidRequests: number
  replays: number
  lastError?: string | undefined
  responseBody?: unknown
  createdAt: string
  updatedAt: string
}

export type CeloPayOutcome =
  | { status: "DENIED"; code: string; reason: string; nextStep: string }
  | { status: "FREE"; body: unknown }
  | { status: "BLOCKED_DUPLICATE"; attempt: CeloAttempt }
  | { status: CeloAttemptState; attempt: CeloAttempt; body?: unknown }

export function createCeloX402Rail(options: {
  account: LocalAccount
  guard: CeloPaymentGuard
  reader: CeloChainReader
  fetch?: ((url: string, init?: RequestInit) => Promise<Response>) | undefined
  now?: () => Date
  timeoutMs?: number | undefined
  requireFinalized?: boolean | undefined
}) {
  const now = options.now ?? (() => new Date())
  const doFetch = options.fetch ?? ((u: string, i?: RequestInit) => fetch(u, i))
  const store = new Map<string, CeloAttempt>()
  const iso = () => now().toISOString()

  function save(a: CeloAttempt, patch: Partial<CeloAttempt>): CeloAttempt {
    const next = { ...a, ...patch, updatedAt: iso() }
    store.set(next.executionId, next)
    return next
  }

  async function timed(url: string, init: RequestInit = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000)
    try {
      return await doFetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async function applyTx(a: CeloAttempt, txHash: Hex): Promise<CeloAttempt> {
    const verify = await verifyCeloUsdcSettlement(options.reader, {
      txHash,
      token: CELO_SEPOLIA.usdc.address,
      from: a.from,
      to: a.payTo,
      value: BigInt(a.amount),
      nonce: a.nonce,
      requireFinalized: options.requireFinalized,
    })
    if (verify.status === "CONFIRMED") {
      if (a.state !== "CONFIRMED") await options.guard.commit(a.receiptId, txHash)
      return save(a, { state: "CONFIRMED", txHash, verify })
    }
    if (verify.status === "MISMATCH")
      return save(a, {
        state: "DISPUTED",
        txHash,
        verify,
        lastError: `mismatch: ${verify.mismatch.join(",")}`,
      })
    if (verify.status === "REVERTED")
      return save(a, {
        state: "UNKNOWN",
        txHash,
        verify,
        lastError: "settlement tx reverted; checking nonce",
      })
    return save(a, { state: "SUBMITTED", txHash, verify })
  }

  async function sendPaid(a: CeloAttempt): Promise<{ attempt: CeloAttempt; body?: unknown }> {
    const header = encodeX402Header(a.payload)
    let res: Response
    try {
      res = await timed(a.url, {
        headers: { [HEADER_PAYMENT_SIGNATURE]: header, [HEADER_X_PAYMENT]: header },
      })
    } catch (error) {
      return {
        attempt: save(a, {
          state: "UNKNOWN",
          lastError: `no answer after signing: ${(error as Error).message}`,
        }),
      }
    }
    const text = await res.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      // keep text
    }
    if (res.status === 200) {
      const settle = decodeX402Header<SettleResponse>(res.headers.get(HEADER_PAYMENT_RESPONSE))
      if (settle?.success && settle.transaction) {
        const attempt = await applyTx(save(a, { responseBody: body }), settle.transaction as Hex)
        return { attempt, body }
      }
      return {
        attempt: save(a, {
          state: "UNKNOWN",
          responseBody: body,
          lastError: "200 without a settlement receipt",
        }),
        body,
      }
    }
    const stage = res.headers.get("x-railguard-stage")
    if (res.status === 402 && stage === "verify") {
      // The facilitator refused the authorization before settle; it cannot have executed.
      await options.guard.release(a.authorizationId)
      return {
        attempt: save(a, {
          state: "REJECTED",
          lastError: String((body as { error?: string })?.error ?? "verify failed"),
        }),
        body,
      }
    }
    if (res.status === 409)
      return {
        attempt: save(a, { state: "DISPUTED", lastError: "payment-identifier conflict" }),
        body,
      }
    return {
      attempt: save(a, { state: "UNKNOWN", lastError: `HTTP ${res.status} after signing` }),
      body,
    }
  }

  async function pay(input: {
    url: string
    intentId: string
    purpose?: string | undefined
  }): Promise<CeloPayOutcome> {
    const executionId = `exec_${input.intentId}`
    const existing = store.get(executionId)
    if (existing && BLOCKING.includes(existing.state))
      return { status: "BLOCKED_DUPLICATE", attempt: existing }

    let first: Response
    try {
      first = await timed(input.url)
    } catch (error) {
      return {
        status: "DENIED",
        code: "SELLER_UNREACHABLE",
        reason: (error as Error).message,
        nextStep: "Try later. Nothing was signed.",
      }
    }
    if (first.status !== 402) return { status: "FREE", body: await first.text() }
    const required =
      decodeX402Header<PaymentRequired>(first.headers.get(HEADER_PAYMENT_REQUIRED)) ??
      ((await first.json().catch(() => null)) as PaymentRequired | null)
    if (!required?.accepts?.length)
      return {
        status: "DENIED",
        code: "BAD_402",
        reason: "The 402 has no payment requirements.",
        nextStep: "Do not pay.",
      }

    const decision = await options.guard.evaluate({
      required,
      url: input.url,
      intentId: input.intentId,
      purpose: input.purpose,
    })
    if (!decision.allow)
      return {
        status: "DENIED",
        code: decision.code,
        reason: decision.reason,
        nextStep: decision.nextStep,
      }

    const r = decision.requirements
    const t = Math.floor(now().getTime() / 1000)
    const validBefore = t + Math.min(r.maxTimeoutSeconds, 300)
    const nonce = railguardNonce(input.intentId)
    const authorization = {
      from: options.account.address,
      to: r.payTo,
      value: r.amount,
      validAfter: String(t - 60),
      validBefore: String(validBefore),
      nonce,
    }
    const signature = await signTransferAuthorization(
      options.account,
      {
        name: CELO_SEPOLIA.usdc.name,
        version: CELO_SEPOLIA.usdc.version,
        chainId: CELO_SEPOLIA.chainId,
        verifyingContract: CELO_SEPOLIA.usdc.address,
      },
      authorization,
    )
    const paymentId = paymentIdentifierFor(input.intentId)
    const extensions: Record<string, unknown> = {}
    if (required.extensions?.["payment-identifier"]) {
      extensions["payment-identifier"] = {
        schema: PAYMENT_IDENTIFIER_SCHEMA,
        info: { required: false, id: paymentId },
      }
    }
    const builder = required.extensions?.["builder-code"]?.info as { a?: string } | undefined
    if (builder?.a) extensions["builder-code"] = { a: builder.a }
    const payload: PaymentPayload = {
      x402Version: 2,
      resource: required.resource,
      accepted: r,
      payload: { signature, authorization },
      ...(Object.keys(extensions).length ? { extensions } : {}),
    }
    let fromBlock = 0n
    try {
      fromBlock = (await options.reader.blockNumber()) - 5n
    } catch {
      // best effort
    }
    const attempt: CeloAttempt = {
      executionId,
      intentId: input.intentId,
      url: input.url,
      state: "SIGNED",
      nonce,
      paymentId,
      from: options.account.address,
      payTo: r.payTo as Address,
      amount: r.amount,
      validBefore,
      sellerAgentId: decision.seller.agentId.toString(),
      receiptId: decision.receiptId,
      authorizationId: decision.authorizationId,
      payload,
      fromBlock: fromBlock.toString(),
      paidRequests: 1,
      replays: 0,
      createdAt: iso(),
      updatedAt: iso(),
    }
    store.set(executionId, attempt)
    const sent = await sendPaid(attempt)
    return { status: sent.attempt.state, attempt: sent.attempt, body: sent.body }
  }

  async function reconcile(
    executionId: string,
    opts: { replay?: boolean } = {},
  ): Promise<CeloAttempt> {
    let a = store.get(executionId)
    if (!a) throw new Error(`celo: unknown execution ${executionId}`)
    if (a.state === "CONFIRMED" || a.state === "FAILED_SAFE" || a.state === "REJECTED") return a
    if (a.txHash) {
      a = await applyTx(a, a.txHash)
      if (a.state === "CONFIRMED" || a.state === "DISPUTED") return a
    }
    // Request id = nonce. Ask USDC itself.
    const used = await options.reader.authorizationUsed(CELO_SEPOLIA.usdc.address, a.from, a.nonce)
    if (used) {
      const tx = await options.reader.findAuthorizationTx(
        CELO_SEPOLIA.usdc.address,
        a.from,
        a.nonce,
        BigInt(a.fromBlock),
      )
      if (tx) return applyTx(a, tx)
      return save(a, { state: "UNKNOWN", lastError: "nonce used on-chain but tx not found yet" })
    }
    const t = Math.floor(now().getTime() / 1000)
    if (t > a.validBefore) {
      await options.guard.release(a.authorizationId)
      return save(a, {
        state: "FAILED_SAFE",
        lastError: "authorization expired unused; USDC will refuse it forever",
      })
    }
    if (opts.replay !== false) {
      a = save(a, { replays: a.replays + 1 })
      const sent = await sendPaid(a)
      return sent.attempt
    }
    return a
  }

  const rail: ExecutionRail = {
    name: CELO_X402_RAIL_NAME,
    async prepare(intent: FinancialIntent, grant: AuthorizationGrant): Promise<PreparedExecution> {
      if (grant.decision !== "allow" || grant.intentId !== intent.id)
        throw new Error("celo: grant does not authorize this intent")
      const url = String(intent.context?.url ?? "")
      if (!url) throw new Error("celo: intent.context.url is required")
      return {
        executionId: `exec_${intent.id}`,
        rail: CELO_X402_RAIL_NAME,
        providerIdempotencyKey: railguardNonce(intent.id),
        requestHash: grant.evidenceHash,
        canonicalRequest: { url, network: CELO_SEPOLIA.caip2 },
      }
    },
    async execute(prepared: PreparedExecution): Promise<ExecutionSubmission> {
      const intentId = prepared.executionId.replace(/^exec_/, "")
      const out = await pay({ url: String(prepared.canonicalRequest.url), intentId })
      if (out.status === "DENIED" || out.status === "FREE")
        return {
          executionId: prepared.executionId,
          rail: CELO_X402_RAIL_NAME,
          result: "REJECTED_BEFORE_BROADCAST",
        }
      const a = "attempt" in out ? out.attempt : undefined
      return {
        executionId: prepared.executionId,
        rail: CELO_X402_RAIL_NAME,
        ...(a?.txHash ? { txHash: a.txHash } : {}),
        result:
          a?.state === "CONFIRMED" || a?.state === "SUBMITTED"
            ? "BROADCAST_CONFIRMED"
            : a?.state === "REJECTED"
              ? "REJECTED_BEFORE_BROADCAST"
              : "BROADCAST_UNKNOWN",
      }
    },
    async observe(submission: ExecutionSubmission): Promise<ExecutionObservation> {
      const a = await reconcile(submission.executionId, { replay: false })
      return {
        executionId: a.executionId,
        ...(a.txHash ? { txHash: a.txHash } : {}),
        settlementStatus:
          a.state === "CONFIRMED"
            ? a.verify?.finality === "FINALIZED"
              ? "FINALIZED"
              : "INCLUDED"
            : a.state === "DISPUTED"
              ? "MISMATCH"
              : "UNOBSERVED",
        observedAt: iso(),
      }
    },
    async reconcile(executionId: string): Promise<SettlementResult> {
      const a = await reconcile(executionId)
      const obs: ExecutionObservation = {
        executionId,
        ...(a.txHash ? { txHash: a.txHash } : {}),
        settlementStatus: a.state === "CONFIRMED" ? "INCLUDED" : "UNOBSERVED",
        observedAt: iso(),
      }
      if (a.state === "CONFIRMED")
        return { executionId, status: "RESOLVED", decision: "SETTLED", observations: [obs] }
      if (a.state === "FAILED_SAFE" || a.state === "REJECTED")
        return { executionId, status: "RESOLVED", decision: "REVERSED", observations: [obs] }
      if (a.state === "DISPUTED")
        return { executionId, status: "REQUIRED", decision: "DISPUTED", observations: [obs] }
      return { executionId, status: "REQUIRED", decision: "UNKNOWN", observations: [obs] }
    },
  }

  return {
    pay,
    reconcile,
    rail,
    getAttempt: (executionId: string) => store.get(executionId),
    listAttempts: () => [...store.values()],
  }
}

export type CeloX402Rail = ReturnType<typeof createCeloX402Rail>
