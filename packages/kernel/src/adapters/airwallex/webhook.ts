/** Airwallex webhook signature check: HMAC-SHA256(secret, x-timestamp + raw body), hex. */
import { createHmac, timingSafeEqual } from "node:crypto"
import type { AirwallexTransfer } from "./client"

export interface VerifyWebhookInput {
  rawBody: string
  timestamp: string | null | undefined
  signature: string | null | undefined
  secret: string
  /** Allowed clock skew; x-timestamp is Unix milliseconds. */
  toleranceMs?: number | undefined
  nowMs?: number | undefined
}

export type VerifyWebhookResult =
  | { ok: true }
  | {
      ok: false
      reason: "missing_headers" | "missing_secret" | "bad_signature" | "stale_timestamp"
    }

export function signAirwallexWebhook(rawBody: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("hex")
}

export function verifyAirwallexWebhook(input: VerifyWebhookInput): VerifyWebhookResult {
  if (!input.secret) return { ok: false, reason: "missing_secret" }
  if (!input.timestamp || !input.signature) return { ok: false, reason: "missing_headers" }
  const expected = Buffer.from(signAirwallexWebhook(input.rawBody, input.timestamp, input.secret))
  const received = Buffer.from(input.signature.trim().toLowerCase())
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "bad_signature" }
  }
  const ts = Number(input.timestamp)
  const now = input.nowMs ?? Date.now()
  const tolerance = input.toleranceMs ?? 5 * 60_000
  if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) {
    return { ok: false, reason: "stale_timestamp" }
  }
  return { ok: true }
}

export interface AirwallexTransferEvent {
  eventId: string
  name: string
  createdAt?: string | undefined
  transfer: AirwallexTransfer
}

/** Parse only after the signature is verified. Returns null for non-transfer events. */
export function parseAirwallexTransferEvent(rawBody: string): AirwallexTransferEvent | null {
  const event = JSON.parse(rawBody) as {
    id?: string | undefined
    name?: string | undefined
    created_at?: string | undefined
    data?: { object?: AirwallexTransfer }
  }
  if (!event.name?.startsWith("payout.transfer.") || event.name.includes(".funding.")) return null
  const transfer = event.data?.object
  if (!transfer?.id || !transfer.request_id) return null
  return { eventId: event.id ?? "", name: event.name, createdAt: event.created_at, transfer }
}
