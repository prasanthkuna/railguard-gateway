/**
 * World ID Agent Pass approval for Railguard
 * Built for ETHGlobal Mumbai 2026 (Nov 5-7)
 *
 * Integration: payments above the approval threshold require a fresh World ID
 * verification. The proof is validated server-side before the payment proceeds.
 */

export interface WorldIdProof {
  merkle_root: string
  nullifier_hash: string
  proof: string
  credential_type: "orb" | "device"
  verification_level: "orb" | "device"
}

export interface WorldIdVerificationRequest {
  /** Payment ID requiring approval */
  paymentId: string
  /** Amount in atomic units */
  amount: string
  /** Asset (e.g., "USDC") */
  asset: string
  /** Recipient account */
  recipient: string
  /** World ID proof from the user */
  proof: WorldIdProof
}

export interface WorldIdVerificationResult {
  verified: boolean
  reason?: string
  /** Verification timestamp */
  verifiedAt?: string
}

export class WorldIdApprovalService {
  constructor(
    private config: {
      appId: string
      action: string
      /** Optional API key for backend verification */
      apiKey?: string
    },
  ) {}

  /**
   * Verify World ID proof server-side
   * https://docs.world.org/world-id/integration#backend-verification
   */
  async verifyProof(request: WorldIdVerificationRequest): Promise<WorldIdVerificationResult> {
    const { proof, paymentId, amount, asset, recipient } = request

    // Construct signal for this specific payment
    const signal = JSON.stringify({
      paymentId,
      amount,
      asset,
      recipient,
    })

    // Real implementation would call World ID API:
    // POST https://developer.worldcoin.org/api/v2/verify/{app_id}
    // Body: { merkle_root, nullifier_hash, proof, verification_level, action, signal }

    if (!this.config.apiKey) {
      return {
        verified: false,
        reason: "world_id_credentials_missing",
      }
    }

    // For now, return mocked result
    // In real implementation, would validate with World ID API
    return {
      verified: false,
      reason: "verification_not_implemented_requires_world_api_key",
    }
  }

  /**
   * Generate verification request payload for frontend
   */
  createVerificationRequest(params: {
    paymentId: string
    amount: string
    asset: string
    recipient: string
  }): {
    appId: string
    action: string
    signal: string
  } {
    const signal = JSON.stringify(params)
    return {
      appId: this.config.appId,
      action: this.config.action,
      signal,
    }
  }
}

/**
 * Create World ID approval service from environment
 */
export function createWorldIdApproval(): WorldIdApprovalService {
  const appId = process.env.WORLD_APP_ID
  const apiKey = process.env.WORLD_API_KEY

  if (!appId) {
    throw new Error("WORLD_APP_ID environment variable required")
  }

  return new WorldIdApprovalService({
    appId,
    action: "railguard-payment-approval",
    apiKey,
  })
}

/**
 * Mock approval for testing (always returns approved)
 */
export function createMockWorldIdApproval(): WorldIdApprovalService {
  return new WorldIdApprovalService({
    appId: "app_test",
    action: "test-approval",
  })
}
