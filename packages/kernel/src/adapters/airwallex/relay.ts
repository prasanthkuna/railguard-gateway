/**
 * Signed relay envelopes. The live sandbox runner (which holds the Airwallex keys) signs each
 * run or verified webhook with an Ed25519 private key; the API verifies with the committed public
 * key before persisting. The API never needs the Airwallex keys or a shared secret.
 */
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto"

export type RelayKind = "live_chaos_run" | "webhook_event"

export interface RelayEnvelope {
  kind: RelayKind
  issuedAt: string
  /** JSON string; signed as-is. */
  payload: string
  /** base64 Ed25519 signature over `${kind}\n${issuedAt}\n${sha256(payload)}`. */
  signature: string
  keyId: string
}

function message(kind: string, issuedAt: string, payload: string): Buffer {
  const digest = createHash("sha256").update(payload).digest("hex")
  return Buffer.from(`railguard-relay-v1\n${kind}\n${issuedAt}\n${digest}`)
}

export function relayKeyId(publicKeyPem: string): string {
  return createHash("sha256").update(publicKeyPem.trim()).digest("hex").slice(0, 16)
}

export function signRelayEnvelope(
  kind: RelayKind,
  payload: unknown,
  privateKeyPem: string,
  issuedAt = new Date().toISOString(),
): RelayEnvelope {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload)
  const key = createPrivateKey(privateKeyPem)
  const signature = sign(null, message(kind, issuedAt, body), key).toString("base64")
  const pub = createPublicKey(key).export({ type: "spki", format: "pem" }).toString()
  return { kind, issuedAt, payload: body, signature, keyId: relayKeyId(pub) }
}

export type RelayVerdict =
  | { ok: true; payload: unknown }
  | { ok: false; reason: "bad_shape" | "unknown_key" | "bad_signature" | "stale" }

export function verifyRelayEnvelope(
  envelope: Partial<RelayEnvelope> | null | undefined,
  publicKeyPem: string,
  options: { nowMs?: number; toleranceMs?: number } = {},
): RelayVerdict {
  if (
    !envelope ||
    typeof envelope.kind !== "string" ||
    typeof envelope.issuedAt !== "string" ||
    typeof envelope.payload !== "string" ||
    typeof envelope.signature !== "string"
  ) {
    return { ok: false, reason: "bad_shape" }
  }
  if (!publicKeyPem.trim() || envelope.keyId !== relayKeyId(publicKeyPem)) {
    return { ok: false, reason: "unknown_key" }
  }
  let good = false
  try {
    good = verify(
      null,
      message(envelope.kind, envelope.issuedAt, envelope.payload),
      createPublicKey(publicKeyPem),
      Buffer.from(envelope.signature, "base64"),
    )
  } catch {
    good = false
  }
  if (!good) return { ok: false, reason: "bad_signature" }
  const at = Date.parse(envelope.issuedAt)
  const now = options.nowMs ?? Date.now()
  if (!Number.isFinite(at) || Math.abs(now - at) > (options.toleranceMs ?? 15 * 60_000)) {
    return { ok: false, reason: "stale" }
  }
  return { ok: true, payload: JSON.parse(envelope.payload) }
}
