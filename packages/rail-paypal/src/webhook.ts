/**
 * PayPal webhook intake. The signature is verified with PayPal (verify-webhook-signature), and even a
 * verified event is only a hint: Railguard re-reads the batch from PayPal before changing any state.
 */
import type { PayPalClient } from "./client"
import type { PayPalAttempt, PayPalExecutionRail } from "./rail"

export const PAYPAL_PAYOUT_EVENTS = [
  "PAYMENT.PAYOUTSBATCH.SUCCESS",
  "PAYMENT.PAYOUTSBATCH.DENIED",
  "PAYMENT.PAYOUTSBATCH.PROCESSING",
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
  "PAYMENT.PAYOUTS-ITEM.FAILED",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED",
  "PAYMENT.PAYOUTS-ITEM.RETURNED",
  "PAYMENT.PAYOUTS-ITEM.REFUNDED",
  "PAYMENT.PAYOUTS-ITEM.REVERSED",
  "PAYMENT.PAYOUTS-ITEM.UNCLAIMED",
  "PAYMENT.PAYOUTS-ITEM.HELD",
  "PAYMENT.PAYOUTS-ITEM.DENIED",
] as const

export type WebhookOutcome =
  | {
      accepted: false
      reason: "bad_signature" | "unsupported_event" | "unknown_batch" | "duplicate_event"
    }
  | { accepted: true; attempt: PayPalAttempt }

export function createPayPalWebhookHandler(deps: {
  client: PayPalClient
  rail: PayPalExecutionRail
  webhookId: string
}) {
  const seen = new Set<string>()
  return async function handle(
    headers: Record<string, string | undefined>,
    event: Record<string, unknown>,
  ): Promise<WebhookOutcome> {
    const ok = await deps.client.verifyWebhookSignature({
      webhookId: deps.webhookId,
      headers,
      event,
    })
    if (!ok) return { accepted: false, reason: "bad_signature" }
    const id = String(event.id ?? "")
    if (id && seen.has(id)) return { accepted: false, reason: "duplicate_event" }
    if (id) seen.add(id)
    const type = String(event.event_type ?? "")
    if (!(PAYPAL_PAYOUT_EVENTS as readonly string[]).includes(type))
      return { accepted: false, reason: "unsupported_event" }
    const resource = (event.resource ?? {}) as Record<string, unknown>
    const header = (resource.batch_header ?? {}) as Record<string, unknown>
    const batchId = String(resource.payout_batch_id ?? header.payout_batch_id ?? "")
    const senderBatchId = String(
      ((header.sender_batch_header ?? {}) as Record<string, unknown>).sender_batch_id ??
        resource.sender_batch_id ??
        "",
    )
    const attempt = deps.rail.findAttempt(batchId) ?? deps.rail.findAttempt(senderBatchId)
    if (!attempt) return { accepted: false, reason: "unknown_batch" }
    // Never trust the payload for money state: re-read from PayPal.
    const updated = attempt.payoutBatchId
      ? await deps.rail.refresh(attempt.executionId)
      : (await deps.rail.reconcileAttempt(attempt.executionId)).attempt
    return { accepted: true, attempt: updated }
  }
}
