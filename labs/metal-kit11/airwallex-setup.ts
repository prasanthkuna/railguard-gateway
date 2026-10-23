/**
 * One-time Airwallex SANDBOX setup for Kit 11 (fake money): a EUR licensor beneficiary (DE IBAN,
 * LOCAL/SEPA) and a USD global account for crediting Metal earnings. Writes ids to ../../.env.
 * Never prints credentials.
 *   node --env-file=../../.env --import tsx airwallex-setup.ts
 */
import { resolve } from "node:path"
import { setEnvVar } from "../../scripts/lib-env-file"

const base = (process.env.AIRWALLEX_BASE_URL ?? "https://api-demo.airwallex.com").replace(
  /\/+$/,
  "",
)
if (!/demo|sandbox/.test(base)) throw new Error("sandbox only")
const envFile = resolve(import.meta.dirname, "..", "..", ".env")

const login = await fetch(`${base}/api/v1/authentication/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-client-id": process.env.AIRWALLEX_CLIENT_ID ?? "",
    "x-api-key": process.env.AIRWALLEX_API_KEY ?? "",
  },
})
if (!login.ok) throw new Error(`login HTTP ${login.status}`)
const token = ((await login.json()) as { token: string }).token
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : null,
  })
  const text = await r.text()
  return { status: r.status, body: text ? JSON.parse(text) : {} }
}

const ga = await call("GET", "/api/v1/global_accounts")
const items = (ga.body.items ?? []) as Array<{
  id: string
  currency?: string
  status?: string
  country_code?: string
  required_features?: Array<{ currency: string }>
}>
console.log(
  `global accounts: ${items.map((g) => `${g.id.slice(0, 8)}… ${g.currency ?? (g.required_features ?? []).map((f) => f.currency).join("/")} ${g.status ?? ""}`).join(", ") || "none"}`,
)
let usd = items.find(
  (g) => g.currency === "USD" || (g.required_features ?? []).some((f) => f.currency === "USD"),
)
if (!usd) {
  const c = await call("POST", "/api/v1/global_accounts/create", {
    request_id: crypto.randomUUID(),
    country_code: "US",
    required_features: [{ currency: "USD", transfer_method: "LOCAL" }],
  })
  console.log(`create USD global account: HTTP ${c.status} ${c.body.code ?? ""}`)
  usd = c.body
}
if (usd?.id)
  console.log(`USD global account ${setEnvVar(envFile, "AIRWALLEX_GLOBAL_ACCOUNT_ID", usd.id)}`)

const bal = await call("GET", "/api/v1/balances/current")
console.log(
  `balances: ${((bal.body ?? []) as Array<{ currency: string; available_amount: number }>)
    .filter((b) => ["USD", "EUR"].includes(b.currency))
    .map((b) => `${b.currency} ${b.available_amount}`)
    .join(", ")}`,
)

if (process.env.AIRWALLEX_EUR_BENEFICIARY_ID && !process.argv.includes("--force")) {
  console.log("EUR beneficiary already set in .env")
} else {
  const beneficiary = {
    entity_type: "COMPANY",
    company_name: "Datafeed Licensing GmbH",
    address: {
      country_code: "DE",
      city: "Berlin",
      street_address: "Friedrichstrasse 68",
      postcode: "10117",
    },
    bank_details: {
      account_currency: "EUR",
      bank_country_code: "DE",
      account_name: "Datafeed Licensing GmbH",
      iban: "DE89370400440532013000",
      swift_code: "COBADEFFXXX",
    },
  }
  const v = await call("POST", "/api/v1/beneficiaries/validate", {
    beneficiary,
    transfer_methods: ["LOCAL"],
  })
  console.log(
    `validate: HTTP ${v.status} ${v.status >= 400 ? JSON.stringify(v.body).slice(0, 400) : "ok"}`,
  )
  const c = await call("POST", "/api/v1/beneficiaries/create", {
    beneficiary,
    transfer_methods: ["LOCAL"],
    nickname: "Kit11 EUR licensor",
  })
  if (c.status >= 400) {
    console.log(`create beneficiary: HTTP ${c.status} ${JSON.stringify(c.body).slice(0, 500)}`)
    process.exit(1)
  }
  const id = c.body.beneficiary_id ?? c.body.id
  console.log(
    `EUR beneficiary ${String(id).slice(0, 8)}… ${setEnvVar(envFile, "AIRWALLEX_EUR_BENEFICIARY_ID", id)}`,
  )
}
