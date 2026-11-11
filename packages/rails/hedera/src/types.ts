/**
 * Hedera payment types
 */

export interface HederaAccountId {
  /** Format: "0.0.12345" */
  accountId: string
}

export interface HederaExpectedPayment {
  /** HTS token ID (e.g., "0.0.429274" for testnet USDC) or "HBAR" */
  tokenId: string
  /** Account that must receive the payment */
  recipient: string
  /** Amount in atomic units (HBAR: tinybars, HTS: token decimals) */
  amount: bigint
  /** Optional: account that must send the payment */
  sender?: string
  /** Optional: transaction memo containing Railguard request ID */
  memo?: string
}

export interface HederaTransactionFacts {
  /** Transaction ID from Hedera (e.g., "0.0.12345@1635360000.123456789") */
  transactionId: string
  /** Consensus timestamp */
  consensusTimestamp: string
  /** Result: "SUCCESS", "INSUFFICIENT_ACCOUNT_BALANCE", etc. */
  result: string
  /** Token transfers */
  transfers: Array<{
    tokenId: string
    account: string
    amount: bigint
  }>
  /** HBAR transfers */
  hbarTransfers: Array<{
    account: string
    amount: bigint
  }>
  /** Transaction memo */
  memo?: string
  /** Charged fee in tinybars */
  chargedTxFee: bigint
}

export type HederaVerifyStatus =
  | "CONFIRMED"
  | "PENDING"
  | "NOT_FOUND"
  | "FAILED"
  | "RECONCILIATION_REQUIRED"

export interface HederaVerifyResult {
  status: HederaVerifyStatus
  reason?: string
  facts?: HederaTransactionFacts
}
