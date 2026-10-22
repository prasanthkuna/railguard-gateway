import { describe, expect, test } from "bun:test"
import { generateKeyPairSync } from "node:crypto"
import { relayKeyId, signRelayEnvelope, verifyRelayEnvelope } from "./relay"

function keys() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519")
  return {
    pub: publicKey.export({ type: "spki", format: "pem" }).toString(),
    priv: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  }
}

describe("relay envelopes (Ed25519)", () => {
  test("round trip and key id", () => {
    const k = keys()
    const env = signRelayEnvelope("live_chaos_run", { transferId: "t1" }, k.priv)
    expect(env.keyId).toBe(relayKeyId(k.pub))
    const v = verifyRelayEnvelope(env, k.pub)
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.payload).toEqual({ transferId: "t1" })
  })

  test("tampered payload, wrong key, stale and malformed are rejected", () => {
    const k = keys()
    const other = keys()
    const env = signRelayEnvelope("webhook_event", { a: 1 }, k.priv)
    expect(verifyRelayEnvelope({ ...env, payload: '{"a":2}' }, k.pub)).toEqual({
      ok: false,
      reason: "bad_signature",
    })
    expect(verifyRelayEnvelope({ ...env, kind: "live_chaos_run" }, k.pub)).toEqual({
      ok: false,
      reason: "bad_signature",
    })
    expect(verifyRelayEnvelope(env, other.pub)).toEqual({ ok: false, reason: "unknown_key" })
    expect(verifyRelayEnvelope(env, "")).toEqual({ ok: false, reason: "unknown_key" })
    expect(verifyRelayEnvelope(env, k.pub, { nowMs: Date.now() + 3_600_000 })).toEqual({
      ok: false,
      reason: "stale",
    })
    expect(verifyRelayEnvelope(null, k.pub)).toEqual({ ok: false, reason: "bad_shape" })
    const forged = signRelayEnvelope("webhook_event", { a: 1 }, other.priv)
    expect(verifyRelayEnvelope({ ...forged, keyId: env.keyId }, k.pub)).toEqual({
      ok: false,
      reason: "bad_signature",
    })
  })
})
