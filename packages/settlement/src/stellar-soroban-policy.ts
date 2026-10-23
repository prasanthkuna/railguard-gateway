/**
 * Verify a Railguard Soroban policy execution on Stellar testnet via Horizon.
 *
 * The policy contract (contracts/soroban/railguard-policy) binds each intent to
 * agent, recipient, asset and amount, and derives a deterministic request id:
 *   sha256(XDR(ScVal::Vec[agent, recipient, asset, i128 amount, u64 nonce]))
 * This module recomputes that id off-chain (no SDK dependency), then checks the
 * `execute` transaction on Horizon: right contract, right function, right
 * request id, and an asset transfer that matches the intent exactly.
 * Anything that does not match is RECONCILIATION_REQUIRED, never CONFIRMED.
 */

import { createHash } from "node:crypto"
import { STELLAR_TESTNET_USDC_ASSET } from "./stellar-testnet"

export const STELLAR_TESTNET_HORIZON = "https://horizon-testnet.stellar.org"

/** Circle testnet USDC on Stellar. */
export const STELLAR_TESTNET_USDC = {
  ...STELLAR_TESTNET_USDC_ASSET,
  /** Stellar Asset Contract id for USDC:issuer on testnet. */
  sac: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
} as const

/** Railguard policy deployment used for the public proof (testnet). */
export const STELLAR_POLICY_PROOF = {
  contractId: "CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N",
  deployTx: "d9c74cb081c1b5cf03fc921bec3b21e02b9995b93614eaf5d5b53c14206462d8",
  setBudgetTx: "6bca3dcc2ad8522fc0208590c50c4d2f9b1025b9a574b1e738b54e2be4003bc8",
  grantTx: "063cfeb9165754d71309bd996ae5b117b34caf1e5d887fc6facbe2bee2be076e",
  executeTx: "2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353",
  admin: "GB62LQKQ7UDFSYSKCF4B7WCPVHDNAYBAFITIQJNNINAKMKZVEP3RBE7X",
  agent: "GDX7EBCAC4NVLPBE4TGDNEUEA2TAGOYCKELCQP245YMHA66GV6PIDLP5",
  recipient: "GATQQK34YWBIHF3KTSFL4EFEPTIFH5UJK347CLKAJGYO437KRKTU22VO",
  amountStroops: 12_500_000n,
  amount: "1.2500000",
  nonce: 1n,
  budgetStroops: 50_000_000n,
  requestId: "a51ce40f43414f30b131c12b6812200053d1db0d93fa679f004f0a49114268db",
} as const

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function crc16xmodem(bytes: Uint8Array): number {
  let crc = 0
  for (const b of bytes) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc
}

export type StrKeyKind = "account" | "contract"

/** Decode a G... (account) or C... (contract) strkey to its 32-byte payload. */
export function decodeStrKey(key: string): { kind: StrKeyKind; bytes: Uint8Array } {
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of key) {
    const idx = B32.indexOf(ch)
    if (idx < 0) throw new Error("strkey_invalid_char")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  const raw = Uint8Array.from(out)
  if (raw.length !== 35) throw new Error("strkey_invalid_length")
  const body = raw.subarray(0, 33)
  const crc = (raw[33] ?? 0) | ((raw[34] ?? 0) << 8)
  if (crc16xmodem(body) !== crc) throw new Error("strkey_bad_checksum")
  const version = raw[0]
  const kind: StrKeyKind | undefined =
    version === 6 << 3 ? "account" : version === 2 << 3 ? "contract" : undefined
  if (!kind) throw new Error("strkey_unsupported_version")
  return { kind, bytes: Uint8Array.from(raw.subarray(1, 33)) }
}

function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

function u64(n: bigint): number[] {
  const out: number[] = []
  for (let i = 7; i >= 0; i--) out.push(Number((n >> BigInt(i * 8)) & 0xffn))
  return out
}

/** XDR of ScVal::Address for a G... or C... strkey. */
export function scvAddressXdr(key: string): Uint8Array {
  const { kind, bytes } = decodeStrKey(key)
  const head = kind === "account" ? [...u32(18), ...u32(0), ...u32(0)] : [...u32(18), ...u32(1)]
  return Uint8Array.from([...head, ...bytes])
}

function scvI128Xdr(v: bigint): number[] {
  const twos = BigInt.asUintN(128, v)
  return [...u32(10), ...u64(twos >> 64n), ...u64(twos & 0xffff_ffff_ffff_ffffn)]
}

/** Same id the contract returns from `request_id` / `grant`. */
export function stellarPolicyRequestId(input: {
  agent: string
  recipient: string
  asset: string
  amountStroops: bigint
  nonce: bigint
}): string {
  const items = [
    scvAddressXdr(input.agent),
    scvAddressXdr(input.recipient),
    scvAddressXdr(input.asset),
    Uint8Array.from(scvI128Xdr(input.amountStroops)),
    Uint8Array.from([...u32(5), ...u64(input.nonce)]),
  ]
  const parts: number[] = [...u32(16), ...u32(1), ...u32(items.length)]
  for (const it of items) parts.push(...it)
  return createHash("sha256").update(Uint8Array.from(parts)).digest("hex")
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64")
}

export interface HorizonInvokeOperation {
  type: string
  transaction_successful?: boolean
  source_account?: string
  parameters?: Array<{ type: string; value: string }>
  asset_balance_changes?: Array<{
    asset_type: string
    asset_code?: string
    asset_issuer?: string
    type: string
    from?: string
    to?: string
    amount: string
  }>
}

export interface SorobanPolicyExpectation {
  contractId: string
  agent: string
  recipient: string
  asset: { code: string; issuer: string; sac: string }
  amountStroops: bigint
  nonce: bigint
}

export interface SorobanPolicyVerifyResult {
  status: "CONFIRMED" | "RECONCILIATION_REQUIRED" | "FAILED"
  requestId: string
  reason?: string
  transfer?: { from?: string; to?: string; amount: string; asset: string }
}

export function stroopsToAmount(stroops: bigint): string {
  const neg = stroops < 0n
  const s = (neg ? -stroops : stroops).toString().padStart(8, "0")
  return `${neg ? "-" : ""}${s.slice(0, -7)}.${s.slice(-7)}`
}

/** Pure check of a Horizon invoke_host_function operation against the intent. */
export function checkSorobanPolicyExecution(
  successful: boolean,
  op: HorizonInvokeOperation | undefined,
  exp: SorobanPolicyExpectation,
): SorobanPolicyVerifyResult {
  const requestId = stellarPolicyRequestId({
    agent: exp.agent,
    recipient: exp.recipient,
    asset: exp.asset.sac,
    amountStroops: exp.amountStroops,
    nonce: exp.nonce,
  })
  const fail = (status: SorobanPolicyVerifyResult["status"], reason: string) => ({
    status,
    requestId,
    reason,
  })
  if (!op || op.type !== "invoke_host_function")
    return fail("RECONCILIATION_REQUIRED", "no_invoke_operation")
  if (!successful) return fail("FAILED", "transaction_not_successful")
  const p = op.parameters ?? []
  if (p[0]?.value !== b64(scvAddressXdr(exp.contractId)))
    return fail("RECONCILIATION_REQUIRED", "contract_mismatch")
  const execSym = b64(Uint8Array.from([...u32(15), ...u32(7), ...Buffer.from("execute"), 0]))
  if (p[1]?.value !== execSym) return fail("RECONCILIATION_REQUIRED", "function_mismatch")
  const idXdr = b64(Uint8Array.from([...u32(13), ...u32(32), ...Buffer.from(requestId, "hex")]))
  if (p[2]?.value !== idXdr) return fail("RECONCILIATION_REQUIRED", "request_id_mismatch")
  const transfers = (op.asset_balance_changes ?? []).filter((c) => c.type === "transfer")
  if (transfers.length !== 1) return fail("RECONCILIATION_REQUIRED", "transfer_count_mismatch")
  const t = transfers[0]
  if (!t) return fail("RECONCILIATION_REQUIRED", "transfer_count_mismatch")
  const transfer = {
    from: t.from,
    to: t.to,
    amount: t.amount,
    asset: `${t.asset_code}:${t.asset_issuer}`,
  }
  if (t.asset_code !== exp.asset.code || t.asset_issuer !== exp.asset.issuer)
    return { ...fail("RECONCILIATION_REQUIRED", "asset_mismatch"), transfer }
  if (t.from !== exp.agent || t.to !== exp.recipient)
    return { ...fail("RECONCILIATION_REQUIRED", "party_mismatch"), transfer }
  if (t.amount !== stroopsToAmount(exp.amountStroops))
    return { ...fail("RECONCILIATION_REQUIRED", "amount_mismatch"), transfer }
  return { status: "CONFIRMED", requestId, transfer }
}

export async function verifyStellarSorobanPolicyExecution(
  txHash: string,
  exp: SorobanPolicyExpectation,
  horizonUrl = STELLAR_TESTNET_HORIZON,
  fetchImpl: typeof fetch = fetch,
): Promise<SorobanPolicyVerifyResult & { txHash: string }> {
  const txRes = await fetchImpl(`${horizonUrl}/transactions/${txHash}`)
  if (!txRes.ok) throw new Error(`horizon_tx_${txRes.status}`)
  const tx = (await txRes.json()) as { successful?: boolean }
  const opsRes = await fetchImpl(`${horizonUrl}/transactions/${txHash}/operations?limit=10`)
  if (!opsRes.ok) throw new Error(`horizon_http_${opsRes.status}`)
  const ops = (await opsRes.json()) as { _embedded?: { records?: HorizonInvokeOperation[] } }
  const op = ops._embedded?.records?.find((r) => r.type === "invoke_host_function")
  return { txHash, ...checkSorobanPolicyExecution(tx.successful === true, op, exp) }
}

export function proofExpectation(): SorobanPolicyExpectation {
  return {
    contractId: STELLAR_POLICY_PROOF.contractId,
    agent: STELLAR_POLICY_PROOF.agent,
    recipient: STELLAR_POLICY_PROOF.recipient,
    asset: STELLAR_TESTNET_USDC,
    amountStroops: STELLAR_POLICY_PROOF.amountStroops,
    nonce: STELLAR_POLICY_PROOF.nonce,
  }
}
