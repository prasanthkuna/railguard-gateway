/** In-memory Airwallex sandbox simulator (FetchLike) for tests and the offline demo. Fake money only. */
import type { AirwallexTransfer, FetchLike } from "./client"
import { signAirwallexWebhook } from "./webhook"

export type CreateFault =
  /** Airwallex creates the transfer, but the response never arrives (client times out). */
  | "timeout_after_create"
  /** Request times out before Airwallex receives it (no transfer created). */
  | "timeout_before_create"
  /** Airwallex returns 503 after creating the transfer. */
  | "503_after_create"

export interface AirwallexSimulator {
  fetch: FetchLike
  /** Faults applied to the next create calls, in order. */
  queueCreateFault(fault: CreateFault): void
  setStatus(transferId: string, status: string): AirwallexTransfer
  transfers(): AirwallexTransfer[]
  createCallsFor(requestId: string): number
  webhookFor(
    transferId: string,
    eventName: string,
    secret: string,
    timestampMs: number,
  ): { rawBody: string; timestamp: string; signature: string }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function timeoutError(): Error {
  const error = new Error("The operation timed out.")
  error.name = "TimeoutError"
  return error
}

export function createAirwallexSimulator(options: { now?: () => Date } = {}): AirwallexSimulator {
  const now = options.now ?? (() => new Date())
  const byId = new Map<string, AirwallexTransfer>()
  const createCalls = new Map<string, number>()
  const faults: CreateFault[] = []
  let seq = 0

  const simFetch: FetchLike = async (url, init) => {
    const u = new URL(url)
    const method = (init.method ?? "GET").toUpperCase()
    if (u.pathname === "/api/v1/authentication/login" && method === "POST") {
      return json(201, {
        token: "sim-token",
        expires_at: new Date(now().getTime() + 30 * 60_000).toISOString(),
      })
    }
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization
    if (auth !== "Bearer sim-token") return json(401, { code: "credentials_invalid" })

    if (u.pathname === "/api/v1/transfers/create" && method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, string>
      const requestId = body.request_id ?? ""
      createCalls.set(requestId, (createCalls.get(requestId) ?? 0) + 1)
      const fault = faults.shift()
      if (fault === "timeout_before_create") throw timeoutError()
      if ([...byId.values()].some((t) => t.request_id === requestId)) {
        return json(400, { code: "duplicate_request_id", message: "duplicate request_id" })
      }
      seq += 1
      const ts = now().toISOString()
      const transfer: AirwallexTransfer = {
        id: `sim_tr_${String(seq).padStart(4, "0")}`,
        request_id: requestId,
        status: "PROCESSING",
        transfer_amount: Number(body.transfer_amount),
        transfer_currency: body.transfer_currency,
        source_currency: body.source_currency,
        beneficiary_id: body.beneficiary_id,
        reference: body.reference,
        short_reference_id: `SIM-${seq}`,
        created_at: ts,
        updated_at: ts,
      }
      byId.set(transfer.id, transfer)
      if (fault === "timeout_after_create") throw timeoutError()
      if (fault === "503_after_create") return json(503, { code: "service_unavailable" })
      return json(201, transfer)
    }
    if (u.pathname === "/api/v1/transfers" && method === "GET") {
      const requestId = u.searchParams.get("request_id")
      const items = [...byId.values()].filter((t) => !requestId || t.request_id === requestId)
      return json(200, { items, page_after: null, page_before: null })
    }
    const match = u.pathname.match(/^\/api\/v1\/transfers\/([^/]+)$/)
    if (match && method === "GET") {
      const transfer = byId.get(decodeURIComponent(match[1] ?? ""))
      return transfer ? json(200, transfer) : json(404, { code: "not_found" })
    }
    return json(404, { code: "not_found" })
  }

  return {
    fetch: simFetch,
    queueCreateFault: (fault) => {
      faults.push(fault)
    },
    setStatus(transferId, status) {
      const transfer = byId.get(transferId)
      if (!transfer) throw new Error(`no transfer ${transferId}`)
      const next = { ...transfer, status, updated_at: now().toISOString() }
      byId.set(transferId, next)
      return next
    },
    transfers: () => [...byId.values()],
    createCallsFor: (requestId) => createCalls.get(requestId) ?? 0,
    webhookFor(transferId, eventName, secret, timestampMs) {
      const transfer = byId.get(transferId)
      if (!transfer) throw new Error(`no transfer ${transferId}`)
      const rawBody = JSON.stringify({
        id: `evt_sim_${transferId}_${eventName}`,
        name: eventName,
        created_at: new Date(timestampMs).toISOString(),
        version: "2025-06-30",
        data: { object: transfer },
      })
      const timestamp = String(timestampMs)
      return { rawBody, timestamp, signature: signAirwallexWebhook(rawBody, timestamp, secret) }
    },
  }
}
