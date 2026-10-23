import { describe, expect, test } from "bun:test"
import { createPublicKey, verify } from "node:crypto"
import bs58 from "bs58"
import { DEVNET_USDC_MINT, MEMO_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants"
import { newTestSecretKey } from "./testKeys"
import {
  compactU16,
  compileLegacyMessage,
  memoInstruction,
  signTransaction,
  signerFromSecretKey,
  transferCheckedInstruction,
  unsignedTransactionBase64,
} from "./tx"

const BLOCKHASH = "11111111111111111111111111111111"

function paymentMessage(owner: string) {
  return compileLegacyMessage({
    feePayer: owner,
    recentBlockhash: BLOCKHASH,
    instructions: [
      memoInstruction("rg_0123456789abcdef0123456789abcdef01234567"),
      transferCheckedInstruction({
        source: "So11111111111111111111111111111111111111112",
        mint: DEVNET_USDC_MINT,
        destination: "SysvarRent111111111111111111111111111111111",
        owner,
        amount: 10_000n,
        decimals: 6,
      }),
    ],
  })
}

describe("Solana transaction builder", () => {
  test("shortvec encoding matches the Solana spec", () => {
    expect(compactU16(0)).toEqual([0])
    expect(compactU16(127)).toEqual([0x7f])
    expect(compactU16(128)).toEqual([0x80, 0x01])
    expect(compactU16(16384)).toEqual([0x80, 0x80, 0x01])
  })

  test("message header: one writable signer (fee payer), programs and mint read-only", () => {
    const signer = signerFromSecretKey(newTestSecretKey())
    const msg = paymentMessage(signer.publicKey)
    expect(msg[0]).toBe(1) // signatures
    expect(msg[1]).toBe(0) // read-only signed
    expect(msg[2]).toBe(3) // mint, token program, memo program
    expect(msg[3]).toBe(6) // account count
    expect(bs58.encode(msg.subarray(4, 36))).toBe(signer.publicKey)
    const keys = Array.from({ length: 6 }, (_, i) =>
      bs58.encode(msg.subarray(4 + i * 32, 36 + i * 32)),
    )
    expect(keys.slice(3)).toEqual([DEVNET_USDC_MINT, MEMO_PROGRAM_ID, TOKEN_PROGRAM_ID])
  })

  test("TransferChecked data = [12, u64 LE amount, decimals]", () => {
    const ix = transferCheckedInstruction({
      source: "So11111111111111111111111111111111111111112",
      mint: DEVNET_USDC_MINT,
      destination: "SysvarRent111111111111111111111111111111111",
      owner: "SysvarC1ock11111111111111111111111111111111",
      amount: 1_250_000n,
      decimals: 6,
    })
    expect([...ix.data]).toEqual([12, 0xd0, 0x12, 0x13, 0, 0, 0, 0, 0, 6])
  })

  test("signature verifies over the message with the signer's public key", () => {
    const signer = signerFromSecretKey(newTestSecretKey())
    const msg = paymentMessage(signer.publicKey)
    const { wire, signature } = signTransaction(msg, signer)
    expect(wire[0]).toBe(1)
    const sig = wire.subarray(1, 65)
    expect(bs58.encode(sig)).toBe(signature)
    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex")
    const pub = createPublicKey({
      key: Buffer.concat([spkiPrefix, Buffer.from(bs58.decode(signer.publicKey))]),
      format: "der",
      type: "spki",
    })
    expect(verify(null, Buffer.from(msg), pub, Buffer.from(sig))).toBe(true)
  })

  test("unsigned form has one empty signature slot (wallet such as PayBox signs)", () => {
    const signer = signerFromSecretKey(newTestSecretKey())
    const b = Buffer.from(unsignedTransactionBase64(paymentMessage(signer.publicKey)), "base64")
    expect(b[0]).toBe(1)
    expect(b.subarray(1, 65).every((x) => x === 0)).toBe(true)
  })

  test("a keypair file whose public half does not match its seed is refused", () => {
    const a = newTestSecretKey()
    const b = newTestSecretKey()
    const bad = Uint8Array.from([...a.subarray(0, 32), ...b.subarray(32)])
    expect(() => signerFromSecretKey(bad)).toThrow("keypair_public_key_mismatch")
  })
})
