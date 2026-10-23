/**
 * EIP-3009 transferWithAuthorization for the x402 exact scheme.
 * Railguard derives the 32-byte nonce from the intent id, so the nonce IS the request id:
 * USDC itself refuses a second transfer with the same (from, nonce), and authorizationState(from, nonce)
 * is an on-chain "was this request executed?" lookup for reconciliation.
 */
import { type Address, type Hex, type LocalAccount, keccak256, toHex } from "viem"
import type { Eip3009Authorization } from "./x402"

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const

export function railguardNonce(intentId: string): Hex {
  return keccak256(toHex(`railguard:celo:x402:${intentId}`))
}

/** x402 payment-identifier id (16-128 chars), stable per intent. */
export function paymentIdentifierFor(intentId: string): string {
  return `pay_rg_${railguardNonce(intentId).slice(2, 42)}`
}

export interface Eip3009Domain {
  name: string
  version: string
  chainId: number
  verifyingContract: Address
}

export function typedDataFor(domain: Eip3009Domain, auth: Eip3009Authorization) {
  return {
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: auth.from as Address,
      to: auth.to as Address,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce as Hex,
    },
  }
}

export async function signTransferAuthorization(
  account: LocalAccount,
  domain: Eip3009Domain,
  auth: Eip3009Authorization,
): Promise<Hex> {
  if (account.address.toLowerCase() !== auth.from.toLowerCase())
    throw new Error("eip3009: signer is not the payer")
  return account.signTypedData(typedDataFor(domain, auth))
}
