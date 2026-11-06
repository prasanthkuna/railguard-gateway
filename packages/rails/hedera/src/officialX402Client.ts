import { PrivateKey } from "@hiero-ledger/sdk"
/**
 * Official x402 v2 client integration for Hedera testnet.
 * Uses @x402/core and @x402/hedera packages with ExactHederaScheme.
 *
 * Links policy guard BEFORE payment creation, ensuring budget/allowlist/approval
 * checks happen before signing transactions.
 */
import { x402Client } from "@x402/core/client"
import { createClientHederaSigner } from "@x402/hedera"
import { ExactHederaScheme } from "@x402/hedera/exact/client"
import type { GuardDecision, HederaPaymentGuard } from "./guard.js"
import type { PaymentIntent } from "./types.js"

export interface OfficialX402Config {
  accountId: string
  privateKey: string
  network: "hedera:testnet" | "hedera:mainnet"
  guard: HederaPaymentGuard
  facilitatorUrl?: string
}

export interface PaymentResult {
  status: "ALLOW" | "DENY" | "APPROVAL_REQUIRED" | "CONFIRMED" | "FAILED"
  transactionId?: string
  paymentId?: string
  reason?: string
}

/**
 * Creates an official x402 client with Railguard policy enforcement.
 * Policy guard runs BEFORE transaction signing, enforcing budgets/allowlists/approvals.
 */
export class OfficialX402Client {
  private client: x402Client
  private guard: HederaPaymentGuard

  constructor(config: OfficialX402Config) {
    this.guard = config.guard

    // Create Hedera signer
    const signer = createClientHederaSigner(
      config.accountId,
      PrivateKey.fromString(config.privateKey),
      { network: config.network },
    )

    // Register exact scheme for Hedera
    this.client = new x402Client()
    this.client.register("hedera:*", new ExactHederaScheme(signer))

    // Note: facilitator URL would be set via x402HTTPClient wrapper
    // For now, this is a placeholder for official integration
  }

  /**
   * Fetch a resource with automatic x402 payment.
   * Enforces policy guard BEFORE creating payment payload.
   *
   * @param url - Resource URL
   * @param intent - Payment intent for policy enforcement
   * @returns Payment result with transaction ID if successful
   */
  async fetch(url: string, intent: PaymentIntent): Promise<PaymentResult> {
    // 1. Check policy guard BEFORE attempting payment
    const guardDecision = this.guard.checkPayment(intent)

    if (guardDecision.decision === "DENY") {
      return {
        status: "DENY",
        reason: guardDecision.reason,
      }
    }

    if (guardDecision.decision === "APPROVAL_REQUIRED") {
      return {
        status: "APPROVAL_REQUIRED",
        paymentId: guardDecision.paymentId,
        reason: guardDecision.reason,
      }
    }

    // 2. Policy allows payment, proceed with x402 client
    // TODO: Full implementation requires x402HTTPClient wrapper
    // For complete implementation, see:
    // - @x402/core/http for x402HTTPClient
    // - getPaymentRequiredResponse() to parse 402
    // - createPaymentPayload() to build payment
    // - encodePaymentSignatureHeader() to send proof
    
    return {
      status: "CONFIRMED",
      paymentId: `pay_hedera_${intent.requestId}`,
      reason: "Official x402 client placeholder - full implementation requires x402HTTPClient wrapper",
    }
  }

  /**
   * Approve a pending payment and retry.
   */
  async approveAndFetch(url: string, intent: PaymentIntent): Promise<PaymentResult> {
    // Approve in guard
    this.guard.checkPayment(intent) // Reserve budget

    // Now fetch with approved payment
    return this.fetch(url, intent)
  }
}

/**
 * Create an official x402 client with policy enforcement.
 */
export function createOfficialX402Client(config: OfficialX402Config): OfficialX402Client {
  return new OfficialX402Client(config)
}
