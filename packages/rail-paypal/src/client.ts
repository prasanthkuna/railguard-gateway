/**
 * PayPal REST client for the Payouts API (sandbox only).
 *
 * - OAuth2 client-credentials token, cached until 60 s before expiry.
 * - Every create carries a PayPal-Request-Id (idempotency key, stored by PayPal for 30 days)
 *   AND a deterministic sender_batch_id (PayPal refuses a reused one for 30 days).
 * - Errors are classified. A timeout, network error, 5xx, 409 or 429 is AMBIGUOUS: the payout
 *   may exist. The rail turns AMBIGUOUS into UNKNOWN and never sends a fresh create.
 */

export const PAYPAL_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com"

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface PayPalCredentials {
  clientId: string
  clientSecret: string
}

export interface PayPalClientOptions {
  credentials: PayPalCredentials
  baseUrl?: string | undefined
  fetch?: FetchLike | undefined
  /** Per-request timeout. A timed-out create is AMBIGUOUS (PayPal may have created the batch). */
  timeoutMs?: number | undefined
  now?: () => number
}

/**
 * AMBIGUOUS: may or may not have been applied (timeout, network, 5xx, 409, 429).
 * DUPLICATE_BATCH: PayPal already holds a batch for this sender_batch_id (link to it attached).
 * REJECTED: definitively not applied (4xx validation, insufficient funds, etc.).
 * AUTH: token call failed; the payout request was never sent.
 */
export type PayPalErrorKind = "AMBIGUOUS" | "DUPLICATE_BATCH" | "REJECTED" | "AUTH"

export class PayPalApiError extends Error {
  readonly kind: PayPalErrorKind
  readonly status?: number | undefined
  readonly name_?: string | undefined
  readonly debugId?: string | undefined
  /** For DUPLICATE_BATCH: the HATEOAS link PayPal returns to the original batch. */
  readonly originalBatchHref?: string | undefined

  constructor(
    kind: PayPalErrorKind,
    message: string,
    extra: {
      status?: number | undefined
      name?: string | undefined
      debugId?: string | undefined
      originalBatchHref?: string | undefined
    } = {},
  ) {
    super(message)
    this.name = "PayPalApiError"
    this.kind = kind
    this.status = extra.status
    this.name_ = extra.name
    this.debugId = extra.debugId
    this.originalBatchHref = extra.originalBatchHref
  }
}

export interface PayPalMoney {
  value: string
  currency: string
}

export interface PayPalPayoutItemRequest {
  recipient_type: "EMAIL" | "PHONE" | "PAYPAL_ID"
  amount: PayPalMoney
  receiver: string
  note?: string | undefined
  sender_item_id: string
  recipient_wallet?: "PAYPAL" | "VENMO" | undefined
}

export interface CreatePayoutRequest {
  sender_batch_header: {
    sender_batch_id: string
    email_subject?: string | undefined
    email_message?: string | undefined
  }
  items: PayPalPayoutItemRequest[]
}

export interface PayPalLink {
  href: string
  rel: string
  method?: string | undefined
}

export interface PayPalPayoutItem {
  payout_item_id: string
  transaction_id?: string | undefined
  transaction_status?: string | undefined
  payout_batch_id?: string | undefined
  payout_item: {
    recipient_type?: string | undefined
    amount: PayPalMoney
    receiver: string
    sender_item_id?: string | undefined
    note?: string | undefined
  }
  errors?: { name?: string; message?: string } | undefined
}

export interface PayPalPayoutBatch {
  batch_header: {
    payout_batch_id: string
    batch_status: string
    sender_batch_header: { sender_batch_id: string; email_subject?: string | undefined }
    time_created?: string | undefined
    time_completed?: string | undefined
    amount?: PayPalMoney | undefined
  }
  items?: PayPalPayoutItem[] | undefined
  links?: PayPalLink[] | undefined
}

export interface WebhookVerificationInput {
  webhookId: string
  headers: Record<string, string | undefined>
  event: Record<string, unknown>
}

export interface PayPalClient {
  readonly baseUrl: string
  /** POST /v1/payments/payouts with PayPal-Request-Id. A replay with the same id returns the original batch. */
  createPayout(request: CreatePayoutRequest, paypalRequestId: string): Promise<PayPalPayoutBatch>
  /** GET /v1/payments/payouts/{payout_batch_id} (authoritative status incl. items). */
  getPayoutBatch(payoutBatchId: string): Promise<PayPalPayoutBatch>
  /** GET a HATEOAS href (used for the duplicate sender_batch_id link). Same host only. */
  getByHref(href: string): Promise<PayPalPayoutBatch>
  /** POST /v1/notifications/verify-webhook-signature. Returns true only for SUCCESS. */
  verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean>
}

export function isSandboxBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname
    return host.includes("sandbox") || host === "localhost" || host === "127.0.0.1"
  } catch {
    return false
  }
}

/** Railguard's PayPal rail is sandbox-only for the hackathon. Production keys are refused. */
export function assertSandboxBaseUrl(baseUrl: string): void {
  if (!isSandboxBaseUrl(baseUrl)) {
    throw new Error(`paypal: refusing non-sandbox base URL ${baseUrl}`)
  }
}

interface PayPalErrorBody {
  name?: string
  message?: string
  debug_id?: string
  details?: Array<{ field?: string; issue?: string; description?: string }>
  links?: PayPalLink[]
}

async function readErrorBody(res: Response): Promise<PayPalErrorBody> {
  try {
    return (await res.json()) as PayPalErrorBody
  } catch {
    return {}
  }
}

/** PayPal answers a reused sender_batch_id with an error that links to the original batch. */
export function isDuplicateBatchError(status: number, body: PayPalErrorBody): string | undefined {
  if (status < 400 || status >= 500) return undefined
  const text = [
    body.name,
    body.message,
    ...(body.details ?? []).map((d) => `${d.issue} ${d.description}`),
  ]
    .filter(Boolean)
    .join(" ")
  if (!/duplicate|already\s+(exists|used|been used)|sender_batch_id/i.test(text)) return undefined
  const link = (body.links ?? []).find((l) => /\/v1\/payments\/payouts\//.test(l.href))
  return link?.href ?? ""
}

export function createPayPalClient(options: PayPalClientOptions): PayPalClient {
  const baseUrl = (options.baseUrl ?? PAYPAL_SANDBOX_BASE_URL).replace(/\/+$/, "")
  assertSandboxBaseUrl(baseUrl)
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init))
  const timeoutMs = options.timeoutMs ?? 15_000
  const now = options.now ?? Date.now
  let token: { value: string; expiresAtMs: number } | null = null

  async function send(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await doFetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async function accessToken(force = false): Promise<string> {
    if (!force && token && token.expiresAtMs - 60_000 > now()) return token.value
    const basic = Buffer.from(
      `${options.credentials.clientId}:${options.credentials.clientSecret}`,
    ).toString("base64")
    let res: Response
    try {
      res = await send(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      })
    } catch (error) {
      throw new PayPalApiError("AUTH", `token request failed: ${(error as Error).message}`)
    }
    if (!res.ok)
      throw new PayPalApiError("AUTH", `token request failed: HTTP ${res.status}`, {
        status: res.status,
      })
    const body = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!body.access_token) throw new PayPalApiError("AUTH", "token response missing access_token")
    token = { value: body.access_token, expiresAtMs: now() + (body.expires_in ?? 900) * 1000 }
    return token.value
  }

  async function authed(url: string, init: RequestInit, retryAuth = true): Promise<Response> {
    const bearer = await accessToken()
    let res: Response
    try {
      res = await send(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
          ...(init.headers as Record<string, string> | undefined),
        },
      })
    } catch (error) {
      throw new PayPalApiError("AMBIGUOUS", `request failed: ${(error as Error).message}`)
    }
    if (res.status === 401 && retryAuth) {
      token = null
      await accessToken(true)
      return authed(url, init, false)
    }
    return res
  }

  async function classify(res: Response): Promise<never> {
    const body = await readErrorBody(res)
    const extra = { status: res.status, name: body.name, debugId: body.debug_id }
    const dupHref = isDuplicateBatchError(res.status, body)
    if (dupHref !== undefined) {
      throw new PayPalApiError("DUPLICATE_BATCH", body.message ?? "sender_batch_id already used", {
        ...extra,
        originalBatchHref: dupHref || undefined,
      })
    }
    if (res.status >= 500 || res.status === 409 || res.status === 429) {
      throw new PayPalApiError("AMBIGUOUS", `HTTP ${res.status} ${body.name ?? ""}`.trim(), extra)
    }
    throw new PayPalApiError(
      "REJECTED",
      `HTTP ${res.status} ${body.name ?? ""} ${body.message ?? ""}`.trim(),
      extra,
    )
  }

  return {
    baseUrl,

    async createPayout(request, paypalRequestId) {
      const res = await authed(`${baseUrl}/v1/payments/payouts`, {
        method: "POST",
        headers: { "PayPal-Request-Id": paypalRequestId },
        body: JSON.stringify(request),
      })
      if (!res.ok) return classify(res)
      return (await res.json()) as PayPalPayoutBatch
    },

    async getPayoutBatch(payoutBatchId) {
      const res = await authed(
        `${baseUrl}/v1/payments/payouts/${encodeURIComponent(payoutBatchId)}`,
        {
          method: "GET",
        },
      )
      if (!res.ok) return classify(res)
      return (await res.json()) as PayPalPayoutBatch
    },

    async getByHref(href) {
      const target = new URL(href)
      if (target.origin !== new URL(baseUrl).origin) {
        throw new PayPalApiError("REJECTED", `refusing cross-origin link ${target.origin}`)
      }
      const res = await authed(target.toString(), { method: "GET" })
      if (!res.ok) return classify(res)
      return (await res.json()) as PayPalPayoutBatch
    },

    async verifyWebhookSignature(input) {
      const h = (k: string) => input.headers[k] ?? input.headers[k.toLowerCase()]
      const res = await authed(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        body: JSON.stringify({
          auth_algo: h("paypal-auth-algo"),
          cert_url: h("paypal-cert-url"),
          transmission_id: h("paypal-transmission-id"),
          transmission_sig: h("paypal-transmission-sig"),
          transmission_time: h("paypal-transmission-time"),
          webhook_id: input.webhookId,
          webhook_event: input.event,
        }),
      })
      if (!res.ok) return false
      const body = (await res.json()) as { verification_status?: string }
      return body.verification_status === "SUCCESS"
    },
  }
}
