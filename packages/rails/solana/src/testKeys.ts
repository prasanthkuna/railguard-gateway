/** Test-only helper: a fresh Ed25519 keypair in Solana CLI layout (seed + public key). */
import { generateKeyPairSync } from "node:crypto"

export function newTestSecretKey(): Uint8Array {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519")
  const pk8 = privateKey.export({ format: "der", type: "pkcs8" })
  const spki = publicKey.export({ format: "der", type: "spki" })
  const seed = pk8.subarray(pk8.length - 32)
  const pub = spki.subarray(spki.length - 32)
  return Uint8Array.from([...seed, ...pub])
}
