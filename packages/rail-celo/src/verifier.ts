/**
 * Celo settlement verifier. A facilitator saying "success" is a status, not evidence. Railguard reads
 * the receipt itself and checks: tx succeeded, the USDC contract emitted Transfer(from -> payTo, value)
 * AND AuthorizationUsed(from, nonce) for THIS intent's nonce, and how final the block is.
 */
import type { Address, Hex } from "viem"
import { type CeloChainReader, decodeUsdcLog } from "./chainReader"

export type CeloVerifyStatus = "CONFIRMED" | "PENDING" | "MISMATCH" | "REVERTED" | "NOT_FOUND"

export interface CeloVerifyResult {
  status: CeloVerifyStatus
  txHash: Hex
  blockNumber?: string | undefined
  finality: "FINALIZED" | "INCLUDED" | "NONE"
  checks: { receipt: boolean; transfer: boolean; nonce: boolean; asset: boolean }
  mismatch: string[]
}

export async function verifyCeloUsdcSettlement(
  reader: CeloChainReader,
  input: {
    txHash: Hex
    token: Address
    from: Address
    to: Address
    value: bigint
    nonce: Hex
    requireFinalized?: boolean | undefined
  },
): Promise<CeloVerifyResult> {
  const base = {
    txHash: input.txHash,
    checks: { receipt: false, transfer: false, nonce: false, asset: false },
    mismatch: [] as string[],
  }
  const receipt = await reader.receipt(input.txHash)
  if (!receipt) return { ...base, status: "NOT_FOUND", finality: "NONE" }
  if (receipt.status !== "success")
    return {
      ...base,
      status: "REVERTED",
      finality: "INCLUDED",
      blockNumber: receipt.blockNumber.toString(),
      checks: { ...base.checks, receipt: true },
    }
  const tokenLogs = receipt.logs.filter(
    (l) => l.address.toLowerCase() === input.token.toLowerCase(),
  )
  let transfer = false
  let nonce = false
  const mismatch: string[] = []
  for (const log of tokenLogs) {
    const ev = decodeUsdcLog(log)
    if (!ev) continue
    if (ev.eventName === "Transfer") {
      const a = ev.args as { from: Address; to: Address; value: bigint }
      if (a.from.toLowerCase() === input.from.toLowerCase()) {
        if (a.to.toLowerCase() !== input.to.toLowerCase()) mismatch.push("payTo")
        else if (a.value !== input.value) mismatch.push("amount")
        else transfer = true
      }
    }
    if (ev.eventName === "AuthorizationUsed") {
      const a = ev.args as { authorizer: Address; nonce: Hex }
      if (
        a.authorizer.toLowerCase() === input.from.toLowerCase() &&
        a.nonce.toLowerCase() === input.nonce.toLowerCase()
      )
        nonce = true
    }
  }
  if (!nonce) mismatch.push("nonce")
  if (!transfer && !mismatch.includes("payTo") && !mismatch.includes("amount"))
    mismatch.push("transfer")
  const finalized = await reader.finalizedBlockNumber()
  const finality = receipt.blockNumber <= finalized ? "FINALIZED" : "INCLUDED"
  const checks = { receipt: true, transfer, nonce, asset: tokenLogs.length > 0 }
  if (mismatch.length > 0)
    return {
      ...base,
      status: "MISMATCH",
      finality,
      blockNumber: receipt.blockNumber.toString(),
      checks,
      mismatch,
    }
  const status: CeloVerifyStatus =
    input.requireFinalized && finality !== "FINALIZED" ? "PENDING" : "CONFIRMED"
  return {
    ...base,
    status,
    finality,
    blockNumber: receipt.blockNumber.toString(),
    checks,
    mismatch,
  }
}
