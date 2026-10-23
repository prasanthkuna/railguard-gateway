/**
 * Offline PayPal Payouts sandbox stand-in (no keys, no network). It implements the two PayPal
 * guarantees the rail relies on, so the demo and tests exercise the real code paths:
 *  - PayPal-Request-Id: a repeated id returns the stored result of the first call (no new payout).
 *  - sender_batch_id: a reused id is refused with a link to the original batch.
 * Faults can be injected to drop a response AFTER PayPal committed the payout (the dangerous case).
 */
import type { CreatePayoutRequest, PayPalPayoutBatch } from "./client"

export type PayPalSimFault =
  | "timeout_after_commit"
  | "timeout_before_commit"
  | "http_500_after_commit"

export interface PayPalSimulator {
  fetch: (url: string, init: RequestInit) => Promise<Response>
  inject(fault: PayPalSimFault): void
  /** Every payout batch PayPal holds (the count that must never exceed one per intent). */
  batches(): PayPalPayoutBatch[]
  /** Number of POST /v1/payments/payouts calls received. */
  createRequests(): number
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

export function createPayPalSimulator(
  options: { baseUrl?: string; now?: () => Date; claimedReceivers?: string[] } = {},
): PayPalSimulator {
  const baseUrl = (options.baseUrl ?? "https://api-m.sandbox.paypal.com").replace(/\/+$/, "")
  const now = options.now ?? (() => new Date())
  const byId = new Map<string, PayPalPayoutBatch>()
  const bySender = new Map<string, string>()
  const byRequestId = new Map<string, { status: number; body: unknown }>()
  const faults: PayPalSimFault[] = []
  const reads = new Map<string, number>()
  let creates = 0
  let seq = 0

  const claimed = (r: string) =>
    !options.claimedReceivers ||
    options.claimedReceivers.map((x) => x.toLowerCase()).includes(r.toLowerCase())

  function materialize(id: string): PayPalPayoutBatch {
    const batch = byId.get(id) as PayPalPayoutBatch
    const n = (reads.get(id) ?? 0) + 1
    reads.set(id, n)
    // The create response says PENDING; any later read sees the processed batch.
    if (n >= 1 && batch.batch_header.batch_status === "PENDING") {
      batch.batch_header.batch_status = "SUCCESS"
      batch.batch_header.time_completed = now().toISOString()
      for (const item of batch.items ?? []) {
        item.transaction_status = claimed(item.payout_item.receiver) ? "SUCCESS" : "UNCLAIMED"
        item.transaction_id = `SIMTXN${String(seq).padStart(6, "0")}`
      }
    }
    return structuredClone(batch)
  }

  async function handle(url: string, init: RequestInit): Promise<Response> {
    const u = new URL(url)
    const method = (init.method ?? "GET").toUpperCase()
    const headers = new Headers(init.headers as HeadersInit)
    if (u.pathname === "/v1/oauth2/token" && method === "POST") {
      return json(200, {
        access_token: "SIM-ACCESS-TOKEN",
        token_type: "Bearer",
        expires_in: 32400,
      })
    }
    if (!headers.get("authorization")?.startsWith("Bearer "))
      return json(401, { name: "AUTHENTICATION_FAILURE" })

    if (u.pathname === "/v1/payments/payouts" && method === "POST") {
      creates += 1
      const fault = faults.shift()
      if (fault === "timeout_before_commit")
        throw new DOMException("The operation was aborted.", "AbortError")
      const requestId = headers.get("paypal-request-id") ?? ""
      if (requestId && byRequestId.has(requestId)) {
        const stored = byRequestId.get(requestId) as { status: number; body: PayPalPayoutBatch }
        // PayPal returns the latest status of the earlier request.
        return json(stored.status, materialize(stored.body.batch_header.payout_batch_id))
      }
      const req = JSON.parse(String(init.body)) as CreatePayoutRequest
      const senderId = req.sender_batch_header.sender_batch_id
      if (bySender.has(senderId)) {
        const original = bySender.get(senderId) as string
        return json(400, {
          name: "USER_BUSINESS_ERROR",
          message: "Batch with given sender_batch_id already exists",
          debug_id: "sim-dup",
          details: [
            { field: "sender_batch_id", issue: "Batch with given sender_batch_id already exists" },
          ],
          links: [
            { href: `${baseUrl}/v1/payments/payouts/${original}`, rel: "self", method: "GET" },
          ],
        })
      }
      seq += 1
      const id = `SIMBATCH${String(seq).padStart(6, "0")}`
      const batch: PayPalPayoutBatch = {
        batch_header: {
          payout_batch_id: id,
          batch_status: "PENDING",
          sender_batch_header: {
            sender_batch_id: senderId,
            email_subject: req.sender_batch_header.email_subject,
          },
          time_created: now().toISOString(),
        },
        items: req.items.map((item, i) => ({
          payout_item_id: `SIMITEM${String(seq).padStart(4, "0")}${i}`,
          transaction_status: "PENDING",
          payout_batch_id: id,
          payout_item: { ...item },
        })),
        links: [{ href: `${baseUrl}/v1/payments/payouts/${id}`, rel: "self", method: "GET" }],
      }
      byId.set(id, batch)
      bySender.set(senderId, id)
      const created = { batch_header: { ...batch.batch_header }, links: batch.links }
      if (requestId) byRequestId.set(requestId, { status: 201, body: created })
      reads.set(id, 0)
      if (fault === "timeout_after_commit")
        throw new DOMException("The operation was aborted.", "AbortError")
      if (fault === "http_500_after_commit")
        return json(500, { name: "INTERNAL_SERVER_ERROR", debug_id: "sim-500" })
      return json(201, created)
    }

    const m = u.pathname.match(/^\/v1\/payments\/payouts\/([A-Z0-9]+)$/)
    if (m && method === "GET") {
      const id = m[1] as string
      if (!byId.has(id)) return json(404, { name: "RESOURCE_NOT_FOUND" })
      return json(200, materialize(id))
    }
    if (u.pathname === "/v1/notifications/verify-webhook-signature" && method === "POST") {
      const body = JSON.parse(String(init.body)) as { transmission_sig?: string }
      return json(200, {
        verification_status: body.transmission_sig === "sim-valid" ? "SUCCESS" : "FAILURE",
      })
    }
    return json(404, { name: "NOT_FOUND" })
  }

  return {
    fetch: handle,
    inject: (fault) => {
      faults.push(fault)
    },
    batches: () => [...byId.values()].map((b) => structuredClone(b)),
    createRequests: () => creates,
  }
}
