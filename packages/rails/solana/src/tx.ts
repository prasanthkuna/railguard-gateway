/**
 * Minimal Solana legacy transaction builder for one guarded SPL payment:
 * [Memo(request_id), TransferChecked(source -> destination)].
 *
 * No SDK dependency: the wire format is small and fully covered by tests, and the same bytes can be
 * returned unsigned (for a wallet such as PayBox to sign) or signed locally with an Ed25519 key.
 */
import { createPrivateKey, createPublicKey, sign as edSign } from "node:crypto"
import bs58 from "bs58"
import { MEMO_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants"

export interface AccountMeta {
  pubkey: string
  isSigner: boolean
  isWritable: boolean
}

export interface Instruction {
  programId: string
  keys: AccountMeta[]
  data: Uint8Array
}

export function decodePubkey(value: string): Uint8Array {
  const bytes = bs58.decode(value)
  if (bytes.length !== 32) throw new Error("invalid_pubkey")
  return bytes
}

export function isPubkey(value: string): boolean {
  try {
    decodePubkey(value)
    return true
  } catch {
    return false
  }
}

/** Solana "shortvec" length prefix. */
export function compactU16(n: number): number[] {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff) throw new Error("compact_u16_range")
  const out: number[] = []
  let rem = n
  for (;;) {
    let elem = rem & 0x7f
    rem >>= 7
    if (rem === 0) {
      out.push(elem)
      return out
    }
    elem |= 0x80
    out.push(elem)
  }
}

function u64le(value: bigint): number[] {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) throw new Error("u64_range")
  const out: number[] = []
  let v = value
  for (let i = 0; i < 8; i++) {
    out.push(Number(v & 0xffn))
    v >>= 8n
  }
  return out
}

/** SPL Token TransferChecked (instruction 12). Owner signs; mint and decimals are checked on-chain. */
export function transferCheckedInstruction(input: {
  source: string
  mint: string
  destination: string
  owner: string
  amount: bigint
  decimals: number
  programId?: string
}): Instruction {
  return {
    programId: input.programId ?? TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: input.source, isSigner: false, isWritable: true },
      { pubkey: input.mint, isSigner: false, isWritable: false },
      { pubkey: input.destination, isSigner: false, isWritable: true },
      { pubkey: input.owner, isSigner: true, isWritable: false },
    ],
    data: Uint8Array.from([12, ...u64le(input.amount), input.decimals]),
  }
}

/** SPL Memo v2. The memo is the Railguard request id, so a payment can be found again by memo. */
export function memoInstruction(memo: string): Instruction {
  return { programId: MEMO_PROGRAM_ID, keys: [], data: new TextEncoder().encode(memo) }
}

/** Compile a legacy message. The fee payer is the only signer (PayBox and most wallets require that). */
export function compileLegacyMessage(input: {
  feePayer: string
  recentBlockhash: string
  instructions: Instruction[]
}): Uint8Array {
  type Meta = { pubkey: string; isSigner: boolean; isWritable: boolean; order: number }
  const metas = new Map<string, Meta>()
  let order = 0
  const add = (pubkey: string, isSigner: boolean, isWritable: boolean) => {
    const prev = metas.get(pubkey)
    if (prev) {
      prev.isSigner ||= isSigner
      prev.isWritable ||= isWritable
    } else {
      metas.set(pubkey, { pubkey, isSigner, isWritable, order: order++ })
    }
  }
  add(input.feePayer, true, true)
  for (const ix of input.instructions) {
    for (const k of ix.keys) add(k.pubkey, k.isSigner, k.isWritable)
  }
  for (const ix of input.instructions) add(ix.programId, false, false)

  const all = [...metas.values()]
  const rank = (m: Meta) => (m.isSigner ? (m.isWritable ? 0 : 1) : m.isWritable ? 2 : 3)
  // Fee payer first, then stable order inside each class (signer/writable buckets).
  all.sort((a, b) => {
    if (a.pubkey === input.feePayer) return -1
    if (b.pubkey === input.feePayer) return 1
    return rank(a) - rank(b) || a.order - b.order
  })
  const signers = all.filter((m) => m.isSigner)
  if (signers.length !== 1) throw new Error("exactly_one_signer_required")
  const readonlySigned = signers.filter((m) => !m.isWritable).length
  const readonlyUnsigned = all.filter((m) => !m.isSigner && !m.isWritable).length
  const index = new Map(all.map((m, i) => [m.pubkey, i]))

  const bytes: number[] = [signers.length, readonlySigned, readonlyUnsigned]
  bytes.push(...compactU16(all.length))
  for (const m of all) bytes.push(...decodePubkey(m.pubkey))
  bytes.push(...decodePubkey(input.recentBlockhash))
  bytes.push(...compactU16(input.instructions.length))
  for (const ix of input.instructions) {
    bytes.push(index.get(ix.programId) as number)
    bytes.push(...compactU16(ix.keys.length))
    for (const k of ix.keys) bytes.push(index.get(k.pubkey) as number)
    bytes.push(...compactU16(ix.data.length))
    bytes.push(...ix.data)
  }
  return Uint8Array.from(bytes)
}

/** Wire transaction: shortvec(signatures) + signatures + message. Unsigned slots are zero bytes. */
export function serializeTransaction(message: Uint8Array, signatures: Uint8Array[]): Uint8Array {
  const numSigners = message[0] ?? 0
  if (signatures.length !== numSigners) throw new Error("signature_count_mismatch")
  const out: number[] = [...compactU16(numSigners)]
  for (const s of signatures) {
    if (s.length !== 64) throw new Error("signature_length")
    out.push(...s)
  }
  out.push(...message)
  if (out.length > 1232) throw new Error("transaction_too_large")
  return Uint8Array.from(out)
}

export function unsignedTransactionBase64(message: Uint8Array): string {
  return Buffer.from(serializeTransaction(message, [new Uint8Array(64)])).toString("base64")
}

/** An Ed25519 signer built from a Solana CLI keypair (64 bytes: 32-byte seed + 32-byte public key). */
export interface SolanaSigner {
  publicKey: string
  sign(message: Uint8Array): Uint8Array
}

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex")

export function signerFromSecretKey(secretKey: Uint8Array): SolanaSigner {
  if (secretKey.length !== 64) throw new Error("secret_key_length")
  const seed = Buffer.from(secretKey.subarray(0, 32))
  const key = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  })
  const spki = createPublicKey(key).export({ format: "der", type: "spki" })
  const derived = Uint8Array.from(spki.subarray(spki.length - 32))
  const claimed = secretKey.subarray(32)
  if (Buffer.compare(Buffer.from(derived), Buffer.from(claimed)) !== 0) {
    throw new Error("keypair_public_key_mismatch")
  }
  return {
    publicKey: bs58.encode(derived),
    sign: (message) => Uint8Array.from(edSign(null, Buffer.from(message), key)),
  }
}

/** Transaction signature (base58 of the first signature) is the Solana transaction id. */
export function signTransaction(
  message: Uint8Array,
  signer: SolanaSigner,
): { wire: Uint8Array; signature: string } {
  const sig = signer.sign(message)
  return { wire: serializeTransaction(message, [sig]), signature: bs58.encode(sig) }
}
