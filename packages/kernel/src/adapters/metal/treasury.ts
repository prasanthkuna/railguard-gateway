/**
 * Airwallex side of Kit 11: credit Metal earnings as a sandbox deposit (the sandbox cannot receive
 * stablecoins, so the deposit carries the Metal tx hash as its reference), convert USD to EUR and pay
 * the EUR licence fee. Sandbox-only calls sit behind this one interface.
 */
import {
  AIRWALLEX_SANDBOX_BASE_URL,
  type AirwallexCredentials,
  type FetchLike,
  assertSandboxBaseUrl,
  createAirwallexClient,
} from "../airwallex/client"

export interface DepositResult {
  depositId?: string | undefined
  status: string
  amount: string
  reference: string
  /** true when an existing deposit with this reference was found instead of creating another. */
  reused: boolean
}

export interface ConversionResult {
  conversionId: string
  status: string
  buyAmount: string
  sellAmount?: string | undefined
  rate?: string | undefined
  reused: boolean
}

export interface LicenceTransferResult {
  transferId: string
  status: string
  amount: string
  currency: string
  requestId: string
  reused: boolean
}

export interface AirwallexTreasury {
  readonly mode: "simulated" | "airwallex-sandbox"
  creditEarnings(p: { amountUsd: string; metalTx: string }): Promise<DepositResult>
  convertToEur(p: { buyEur: string; requestId: string }): Promise<ConversionResult>
  payLicenceFee(p: {
    amountEur: string
    requestId: string
    reference: string
  }): Promise<LicenceTransferResult>
}

export function createSimulatedTreasury(): AirwallexTreasury {
  const deposits = new Map<string, DepositResult>()
  const conversions = new Map<string, ConversionResult>()
  const transfers = new Map<string, LicenceTransferResult>()
  return {
    mode: "simulated",
    async creditEarnings({ amountUsd, metalTx }) {
      const prior = deposits.get(metalTx)
      if (prior) return { ...prior, reused: true }
      const d = {
        depositId: `dep_sim_${deposits.size + 1}`,
        status: "SETTLED",
        amount: amountUsd,
        reference: metalTx,
        reused: false,
      }
      deposits.set(metalTx, d)
      return d
    },
    async convertToEur({ buyEur, requestId }) {
      const prior = conversions.get(requestId)
      if (prior) return { ...prior, reused: true }
      const c = {
        conversionId: `conv_sim_${conversions.size + 1}`,
        status: "SETTLED",
        buyAmount: buyEur,
        sellAmount: (Number(buyEur) * 1.08).toFixed(2),
        rate: "0.9259",
        reused: false,
      }
      conversions.set(requestId, c)
      return c
    },
    async payLicenceFee({ amountEur, requestId }) {
      const prior = transfers.get(requestId)
      if (prior) return { ...prior, reused: true }
      const t = {
        transferId: `tfr_sim_${transfers.size + 1}`,
        status: "PAID",
        amount: amountEur,
        currency: "EUR",
        requestId,
        reused: false,
      }
      transfers.set(requestId, t)
      return t
    },
  }
}

export interface RestTreasuryOptions {
  credentials: AirwallexCredentials
  baseUrl?: string | undefined
  fetch?: FetchLike | undefined
  /** EUR beneficiary for the licensor (created once with POST /beneficiaries/create). */
  eurBeneficiaryId: string
  globalAccountId?: string | undefined
}

export function createAirwallexRestTreasury(options: RestTreasuryOptions): AirwallexTreasury {
  const baseUrl = (options.baseUrl ?? AIRWALLEX_SANDBOX_BASE_URL).replace(/\/+$/, "")
  assertSandboxBaseUrl(baseUrl)
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init))
  const transfers = createAirwallexClient({
    credentials: options.credentials,
    baseUrl,
    fetch: doFetch,
    timeoutMs: 20_000,
  })
  let token: string | null = null

  async function login(): Promise<string> {
    if (token) return token
    const res = await doFetch(`${baseUrl}/api/v1/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": options.credentials.clientId,
        "x-api-key": options.credentials.apiKey,
      },
    })
    if (!res.ok) throw new Error(`airwallex login: HTTP ${res.status}`)
    token = ((await res.json()) as { token: string }).token
    return token
  }

  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await login()}` },
      body: body === undefined ? null : JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      let code = ""
      try {
        code = (JSON.parse(text) as { code?: string; message?: string }).code ?? ""
      } catch {}
      throw new Error(`airwallex ${method} ${path}: HTTP ${res.status} ${code}`.trim())
    }
    return (text ? JSON.parse(text) : {}) as T
  }

  async function usdGlobalAccount(): Promise<string> {
    if (options.globalAccountId) return options.globalAccountId
    const list = await call<{
      items?: Array<{
        id: string
        currency?: string
        required_features?: Array<{ currency: string }>
        status?: string
      }>
    }>("GET", "/api/v1/global_accounts")
    const usd = (list.items ?? []).find(
      (g) => g.currency === "USD" || (g.required_features ?? []).some((f) => f.currency === "USD"),
    )
    if (!usd) throw new Error("no USD global account in the sandbox (create one, then rerun)")
    return usd.id
  }

  async function findDeposit(
    reference: string,
  ): Promise<{ id?: string; status?: string; amount?: number } | undefined> {
    const list = await call<{
      items?: Array<{ id?: string; reference?: string; status?: string; amount?: number }>
    }>("GET", "/api/v1/deposits?page_size=100")
    return (list.items ?? []).find((d) => d.reference === reference)
  }

  return {
    mode: "airwallex-sandbox",
    async creditEarnings({ amountUsd, metalTx }) {
      // The Metal tx hash is the deposit's reference: look it up first, never credit twice.
      const prior = await findDeposit(metalTx)
      if (prior) {
        return {
          depositId: prior.id,
          status: prior.status ?? "UNKNOWN",
          amount: amountUsd,
          reference: metalTx,
          reused: true,
        }
      }
      const ga = await usdGlobalAccount()
      const d = await call<{ id?: string; status?: string }>(
        "POST",
        "/api/v1/simulation/deposit/create",
        {
          global_account_id: ga,
          amount: Number(amountUsd),
          payer_name: "Metal earnings (Railguard treasury agent)",
          reference: metalTx,
        },
      )
      const seen = await findDeposit(metalTx).catch(() => undefined)
      return {
        depositId: d.id ?? seen?.id,
        status: seen?.status ?? d.status ?? "PENDING",
        amount: amountUsd,
        reference: metalTx,
        reused: false,
      }
    },
    async convertToEur({ buyEur, requestId }) {
      try {
        const c = await call<{
          conversion_id?: string
          id?: string
          status?: string
          buy_amount?: number
          sell_amount?: number
          client_rate?: number
        }>("POST", "/api/v1/fx/conversions/create", {
          request_id: requestId,
          buy_currency: "EUR",
          sell_currency: "USD",
          buy_amount: buyEur,
          term_agreement: true,
        })
        return {
          conversionId: c.conversion_id ?? c.id ?? "",
          status: c.status ?? "UNKNOWN",
          buyAmount: String(c.buy_amount ?? buyEur),
          sellAmount: c.sell_amount !== undefined ? String(c.sell_amount) : undefined,
          rate: c.client_rate !== undefined ? String(c.client_rate) : undefined,
          reused: false,
        }
      } catch (e) {
        if (!/duplicate_request_id|request_id_duplicate/.test((e as Error).message)) throw e
        return {
          conversionId: "",
          status: "DUPLICATE_REQUEST (already booked)",
          buyAmount: buyEur,
          reused: true,
        }
      }
    },
    async payLicenceFee({ amountEur, requestId, reference }) {
      // Reconcile by request_id first: an earlier attempt may have created it.
      const existing = await transfers.findTransferByRequestId(requestId)
      if (existing) {
        return {
          transferId: existing.id,
          status: existing.status,
          amount: amountEur,
          currency: "EUR",
          requestId,
          reused: true,
        }
      }
      const t = await transfers.createTransfer({
        request_id: requestId,
        beneficiary_id: options.eurBeneficiaryId,
        transfer_amount: amountEur,
        transfer_currency: "EUR",
        source_currency: "EUR",
        transfer_method: "LOCAL",
        reason: "professional_business_services",
        reference: reference.slice(0, 35),
      })
      return {
        transferId: t.id,
        status: t.status,
        amount: amountEur,
        currency: "EUR",
        requestId,
        reused: false,
      }
    },
  }
}
