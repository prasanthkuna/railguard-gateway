import { createHash } from "node:crypto"

/** Canonical JSON: sorted keys, so the same intent always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`
}

/**
 * Deterministic Railguard id for one money movement: `rg_` + sha256(intent). Used as the Metal
 * `mandate pull --payment-id` and as the Airwallex `request_id`, so a retry of the same intent is the
 * same payment (paid at most once) and a different intent can never reuse an id.
 */
export function railguardRequestId(intent: Record<string, unknown>): string {
  const digest = createHash("sha256")
    .update(`railguard:metal:${canonicalJson(intent)}`)
    .digest("hex")
  return `rg_${digest.slice(0, 40)}`
}

/** Airwallex wants a UUID-shaped request_id on some calls; derive one deterministically. */
export function deterministicUuid(intent: Record<string, unknown>): string {
  const h = createHash("sha256")
    .update(`railguard:uuid:${canonicalJson(intent)}`)
    .digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
