/**
 * Railguard's pre-sign guard for x402 on Celo, built on @x402-guard/middleware (per-call cap, rolling
 * daily budget with reserve/commit/release, replay protection, tamper-evident receipts) plus the
 * Celo-specific checks x402-guard does not know about:
 *   - testnet only: a 402 asking for Celo mainnet is refused (MAINNET_DISABLED)
 *   - asset allowlist with the exact EIP-712 domain (USDC on Celo Sepolia, 6 decimals)
 *   - identity binding: payTo must equal the seller's ERC-8004 agentWallet
 *   - intent binding: an intent id is bound to its first requirements; a changed amount or payee is refused
 */
import { createHash } from "node:crypto"
import {
  type PaymentReceipt,
  PolicyViolationError,
  ReplayDetectedError,
  X402Guard,
} from "@x402-guard/middleware"
import type { Address } from "viem"
import { CELO_SEPOLIA, MainnetDisabledError, assertCeloTestnet, atomicToUsdc } from "./chain"
import type { AgentIdentity, IdentityResolver } from "./identity"
import type { PaymentRequired, PaymentRequirements } from "./x402"

export type CeloDenialCode =
  | "MAINNET_DISABLED"
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_ASSET"
  | "UNVERIFIED_SELLER"
  | "PAYEE_IDENTITY_MISMATCH"
  | "INTENT_CHANGED"
  | "PER_CALL_CAP"
  | "DAILY_BUDGET"
  | "REPLAY"
  | "TIMEOUT_TOO_LONG"
  | "POLICY"

export interface CeloSellerBinding {
  /** Origin of the paid API, e.g. https://data.example or http://127.0.0.1:4021 */
  origin: string
  /** ERC-8004 agent id of the seller on Celo Sepolia. */
  agentId: bigint
  name: string
}

export type CeloGuardDecision =
  | {
      allow: true
      requirements: PaymentRequirements
      seller: AgentIdentity
      receiptId: string
      authorizationId: string | undefined
      fingerprint: string
    }
  | {
      allow: false
      code: CeloDenialCode
      reason: string
      nextStep: string
      receiptId?: string | undefined
    }

export function requirementsHash(r: PaymentRequirements): string {
  return createHash("sha256")
    .update(
      JSON.stringify([r.scheme, r.network, r.asset.toLowerCase(), r.amount, r.payTo.toLowerCase()]),
    )
    .digest("hex")
}

export function createCeloPaymentGuard(options: {
  agentId: string
  payer: Address
  perCallMaxAtomic: bigint
  dailyMaxAtomic: bigint
  sellers: CeloSellerBinding[]
  resolver: IdentityResolver
  policyVersion?: string | undefined
}) {
  const guard = new X402Guard({
    policy: {
      agentId: options.agentId,
      maxPerCallAtomic: options.perCallMaxAtomic,
      allowedDomains: [],
      blockedDomains: [],
      allowedPayees: [],
      allowedAssets: [CELO_SEPOLIA.usdc.address],
      allowedNetworks: [CELO_SEPOLIA.caip2],
      windows: [{ windowSeconds: 86_400, maxAmountAtomic: options.dailyMaxAtomic }],
    },
    policyVersion: options.policyVersion ?? "celo-x402-guard-v1",
  })
  const bound = new Map<string, string>()
  const contexts = new Map<string, Parameters<X402Guard["commitAllowedSpend"]>[0]>()

  const deny = (
    code: CeloDenialCode,
    reason: string,
    nextStep: string,
    receiptId?: string,
  ): CeloGuardDecision => ({
    allow: false,
    code,
    reason,
    nextStep,
    receiptId,
  })

  async function evaluate(input: {
    required: PaymentRequired
    url: string
    intentId: string
    purpose?: string | undefined
  }): Promise<CeloGuardDecision> {
    const origin = new URL(input.url).origin
    const seller = options.sellers.find((s) => s.origin === origin)
    // Pick the first requirement on Celo Sepolia; remember why the others were refused.
    let first: CeloGuardDecision | null = null
    let chosen: PaymentRequirements | undefined
    for (const r of input.required.accepts ?? []) {
      try {
        assertCeloTestnet(r.network)
      } catch (error) {
        first ??=
          error instanceof MainnetDisabledError
            ? deny(
                "MAINNET_DISABLED",
                `The seller asks for payment on Celo mainnet (${r.network}). This agent only pays on Celo Sepolia testnet.`,
                "Use the seller's testnet endpoint, or ask the owner. The agent cannot enable mainnet.",
              )
            : deny(
                "UNSUPPORTED_NETWORK",
                `Network ${r.network} is not supported.`,
                "Use a Celo Sepolia endpoint.",
              )
        continue
      }
      const extra = (r.extra ?? {}) as { name?: string; version?: string }
      if (
        r.scheme !== "exact" ||
        r.asset.toLowerCase() !== CELO_SEPOLIA.usdc.address.toLowerCase() ||
        extra.name !== CELO_SEPOLIA.usdc.name ||
        extra.version !== CELO_SEPOLIA.usdc.version
      ) {
        first ??= deny(
          "UNSUPPORTED_ASSET",
          `Asset ${r.asset} (${extra.name ?? "?"} v${extra.version ?? "?"}) is not the allowlisted Celo Sepolia USDC.`,
          "Only USDC on Celo Sepolia is allowed.",
        )
        continue
      }
      chosen = r
      break
    }
    if (!chosen)
      return (
        first ??
        deny("UNSUPPORTED_NETWORK", "No acceptable payment option.", "Use a Celo Sepolia endpoint.")
      )
    if (chosen.maxTimeoutSeconds > 600)
      return deny(
        "TIMEOUT_TOO_LONG",
        `maxTimeoutSeconds ${chosen.maxTimeoutSeconds} is too long; Railguard signs authorizations that expire within 10 minutes.`,
        "Ask the seller for a shorter timeout.",
      )
    if (!seller)
      return deny(
        "UNVERIFIED_SELLER",
        `${origin} is not bound to an ERC-8004 agent identity in this policy.`,
        "Ask the owner to add the seller's ERC-8004 agent id.",
      )
    const identity = await options.resolver.resolve(seller.agentId)
    if (!identity)
      return deny(
        "UNVERIFIED_SELLER",
        `ERC-8004 agent #${seller.agentId} for ${seller.name} could not be resolved on Celo Sepolia.`,
        "Retry later; do not pay an unverified seller.",
      )
    if (identity.agentWallet.toLowerCase() !== chosen.payTo.toLowerCase()) {
      return deny(
        "PAYEE_IDENTITY_MISMATCH",
        `The 402 asks to pay ${chosen.payTo}, but ${seller.name}'s ERC-8004 identity (agent #${seller.agentId}) names wallet ${identity.agentWallet}.`,
        "Do not pay. A changed payee must be fixed on-chain by the seller, not in a 402 response.",
      )
    }
    const h = requirementsHash(chosen)
    const prior = bound.get(input.intentId)
    if (prior && prior !== h)
      return deny(
        "INTENT_CHANGED",
        "This intent was already bound to different payment terms (amount or payee).",
        "A human must approve the new terms as a new intent.",
      )
    const ctx = {
      agentId: options.agentId,
      payer: options.payer,
      payTo: chosen.payTo,
      amountAtomic: BigInt(chosen.amount),
      asset: chosen.asset,
      network: chosen.network,
      resource: {
        method: "GET",
        url: input.url,
        domain: new URL(input.url).hostname.toLowerCase(),
        path: new URL(input.url).pathname || "/",
      },
      ...(input.purpose ? { description: input.purpose } : {}),
      idempotencyKey: input.intentId,
    }
    try {
      const d = await guard.evaluate(ctx)
      if (d.blocked) {
        const rules = d.triggeredRules.join(",")
        if (rules.includes("amount.per_call_cap"))
          return deny(
            "PER_CALL_CAP",
            `${atomicToUsdc(BigInt(chosen.amount))} USDC is above the ${atomicToUsdc(options.perCallMaxAtomic)} USDC per-call cap.`,
            "Pick a cheaper service or ask the owner.",
            d.receiptId,
          )
        if (rules.includes("budget.window"))
          return deny(
            "DAILY_BUDGET",
            `Paying ${atomicToUsdc(BigInt(chosen.amount))} USDC would pass the ${atomicToUsdc(options.dailyMaxAtomic)} USDC daily budget (frozen UNKNOWN payments count as spent).`,
            "Wait for the window to roll, or ask the owner.",
            d.receiptId,
          )
        return deny("POLICY", `Blocked by policy: ${rules}`, "Ask the owner.", d.receiptId)
      }
      bound.set(input.intentId, h)
      contexts.set(d.receiptId, ctx)
      return {
        allow: true,
        requirements: chosen,
        seller: identity,
        receiptId: d.receiptId,
        authorizationId: d.authorizationId,
        fingerprint: d.fingerprint,
      }
    } catch (error) {
      if (error instanceof ReplayDetectedError)
        return deny(
          "REPLAY",
          "This exact payment was already authorized moments ago.",
          "Reconcile the first payment instead of paying again.",
        )
      if (error instanceof PolicyViolationError)
        return deny("POLICY", error.message, "Ask the owner.")
      throw error
    }
  }

  return {
    evaluate,
    /** Money provably moved: commit the reservation and attach the tx hash to the receipt. */
    async commit(receiptId: string, txHash: string): Promise<PaymentReceipt | undefined> {
      const ctx = contexts.get(receiptId)
      if (ctx) await guard.commitAllowedSpend(ctx, receiptId)
      contexts.delete(receiptId)
      return guard.recordSettlement(receiptId, txHash)
    },
    /** Money provably did not move (authorization expired unused, or verify refused it). */
    async release(authorizationId: string | undefined) {
      if (authorizationId) await guard.releaseAuthorization(authorizationId)
    },
    exportAuditJsonl: () => guard.exportAuditJsonl(),
    receipts: () => guard.receipts,
  }
}

export type CeloPaymentGuard = ReturnType<typeof createCeloPaymentGuard>
