/** Airwallex Payouts API client (auth + transfers). Network/timeouts are classified, never retried blindly. */

export const AIRWALLEX_SANDBOX_BASE_URL = "https://api-demo.airwallex.com"
export const AIRWALLEX_PRODUCTION_BASE_URL = "https://api.airwallex.com"

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface AirwallexCredentials {
  clientId: string
  apiKey: string
}

export interface AirwallexClientOptions {
  credentials: AirwallexCredentials
  baseUrl?: string | undefined
  fetch?: FetchLike | undefined
  /** Per-request timeout. A timed-out create is AMBIGUOUS (the transfer may exist). */
  timeoutMs?: number | undefined
  now?: () => number
}

/**
 * AMBIGUOUS: the request may or may not have been applied (timeout, network, 5xx, 409, 429).
 * DUPLICATE_REQUEST: Airwallex already has a transfer for this request_id.
 * REJECTED: definitively not applied (4xx validation).
 * AUTH: login failed; the transfer request was never sent.
 */
export type AirwallexErrorKind = "AMBIGUOUS" | "DUPLICATE_REQUEST" | "REJECTED" | "AUTH"

export class AirwallexApiError extends Error {
  readonly kind: AirwallexErrorKind
  readonly status?: number | undefined
  readonly code?: string | undefined

  constructor(kind: AirwallexErrorKind, message: string, status?: number, code?: string) {
    super(message)
    this.name = "AirwallexApiError"
    this.kind = kind
    this.status = status
    this.code = code
  }
}

export interface AirwallexTransfer {
  id: string
  request_id: string
  status: string
  transfer_amount?: number | string | undefined
  transfer_currency?: string | undefined
  source_currency?: string | undefined
  source_amount?: number | string | undefined
  beneficiary_id?: string | undefined
  reference?: string | undefined
  short_reference_id?: string | undefined
  created_at?: string | undefined
  updated_at?: string | undefined
  failure?: { code?: string; message?: string }
}

export interface CreateTransferRequest {
  request_id: string
  beneficiary_id: string
  transfer_amount: string
  transfer_currency: string
  source_currency: string
  transfer_method?: "LOCAL" | "SWIFT" | undefined
  reason: string
  reference: string
  metadata?: Record<string, string> | undefined
}

export interface AirwallexClient {
  readonly baseUrl: string
  createTransfer(request: CreateTransferRequest): Promise<AirwallexTransfer>
  getTransfer(id: string): Promise<AirwallexTransfer>
  /** Authoritative lookup used for reconciliation (request_id is unique for 7 days). */
  findTransferByRequestId(requestId: string): Promise<AirwallexTransfer | null>
}

interface TokenState {
  token: string
  expiresAtMs: number
}

function isSandboxBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname
    return host.includes("demo") || host.includes("sandbox") || host === "localhost"
  } catch {
    return false
  }
}

export function assertSandboxBaseUrl(baseUrl: string): void {
  if (!isSandboxBaseUrl(baseUrl)) {
    throw new Error(`airwallex: refusing non-sandbox base URL ${baseUrl}`)
  }
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { code?: string }
    return typeof body.code === "string" ? body.code : undefined
  } catch {
    return undefined
  }
}

export function createAirwallexClient(options: AirwallexClientOptions): AirwallexClient {
  const baseUrl = (options.baseUrl ?? AIRWALLEX_SANDBOX_BASE_URL).replace(/\/+$/, "")
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init))
  const timeoutMs = options.timeoutMs ?? 10_000
  const now = options.now ?? Date.now
  let tokenState: TokenState | null = null

  async function send(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await doFetch(`${baseUrl}${path}`, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async function login(force = false): Promise<string> {
    if (!force && tokenState && tokenState.expiresAtMs - 60_000 > now()) return tokenState.token
    let res: Response
    try {
      res = await send("/api/v1/authentication/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": options.credentials.clientId,
          "x-api-key": options.credentials.apiKey,
        },
      })
    } catch (error) {
      throw new AirwallexApiError("AUTH", `login failed: ${(error as Error).message}`)
    }
    if (!res.ok) throw new AirwallexApiError("AUTH", `login failed: HTTP ${res.status}`, res.status)
    const body = (await res.json()) as { token?: string; expires_at?: string }
    if (!body.token) throw new AirwallexApiError("AUTH", "login response missing token")
    const parsed = body.expires_at ? Date.parse(body.expires_at) : Number.NaN
    tokenState = {
      token: body.token,
      expiresAtMs: Number.isFinite(parsed) ? parsed : now() + 25 * 60_000,
    }
    return tokenState.token
  }

  async function authed(path: string, init: RequestInit, retryAuth = true): Promise<Response> {
    const token = await login()
    let res: Response
    try {
      res = await send(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers as Record<string, string> | undefined),
        },
      })
    } catch (error) {
      throw new AirwallexApiError("AMBIGUOUS", `request failed: ${(error as Error).message}`)
    }
    if (res.status === 401 && retryAuth) {
      tokenState = null
      await login(true)
      return authed(path, init, false)
    }
    return res
  }

  async function classify(res: Response): Promise<never> {
    const code = await readErrorCode(res)
    if (res.status === 400 && code === "request_id_duplicate") {
      throw new AirwallexApiError("DUPLICATE_REQUEST", "request_id already used", 400, code)
    }
    if (res.status >= 500 || res.status === 409 || res.status === 429) {
      throw new AirwallexApiError("AMBIGUOUS", `HTTP ${res.status}`, res.status, code)
    }
    throw new AirwallexApiError("REJECTED", `HTTP ${res.status}`, res.status, code)
  }

  return {
    baseUrl,

    async createTransfer(request) {
      const res = await authed("/api/v1/transfers/create", {
        method: "POST",
        body: JSON.stringify(request),
      })
      if (!res.ok) return classify(res)
      return (await res.json()) as AirwallexTransfer
    },

    async getTransfer(id) {
      const res = await authed(`/api/v1/transfers/${encodeURIComponent(id)}`, { method: "GET" })
      if (!res.ok) return classify(res)
      return (await res.json()) as AirwallexTransfer
    },

    async findTransferByRequestId(requestId) {
      const res = await authed(`/api/v1/transfers?request_id=${encodeURIComponent(requestId)}`, {
        method: "GET",
      })
      if (!res.ok) return classify(res)
      const body = (await res.json()) as { items?: AirwallexTransfer[] }
      return body.items?.find((t) => t.request_id === requestId) ?? null
    },
  }
}
