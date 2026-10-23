/**
 * Kit 11 on Metal testnet + Airwallex sandbox (fake money only).
 *
 *   cd labs/metal-kit11 && npm install
 *   node --env-file=../../.env --import tsx live.ts            # full run, writes evidence
 *   node --env-file=../../.env --import tsx live.ts --no-airwallex
 *
 * Keys live OUTSIDE the repo in %USERPROFILE%\.railguard-metal (RAILGUARD_METAL_HOME):
 *   owner-key.json            business account owner (only the owner steps read it)
 *   customer-owner-key.json   simulated customer's account owner
 *   ops-key.json              funded key that records refusals on chain
 *   upstream-key.json, bridge-key.json   payee addresses (upstream seller, earnings holder)
 *   rpc-url.txt               the RPC endpoint (bought over x402 by ops-key)
 * Agents only ever get a mandate credential + its mandate key, never an owner key.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import type { Server } from "node:http"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { METAL_NETWORKS, registerMetalScheme } from "@metalntwx/metal-pay"
import {
  SIGNED_OFFER_REQUIRED,
  requireSignedOffer,
  signedOfferOf,
} from "@metalntwx/metal-pay/mandates"
import { writeMip20Contract } from "@metalntwx/metal-ts"
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server"
import { paymentMiddleware } from "@x402/express"
import express from "express"
import {
  http,
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatUnits,
  parseUnits,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
  type AgentRole,
  type Allocation,
  type DeliveredQuote,
  KIT11,
  type Kit11Rail,
  METAL_TESTNET,
  type MandateTerms,
  type SaleRecord,
  centsToUsdz,
  classifyPay,
  classifyPull,
  createAirwallexRestTreasury,
  createGeminiKit11Model,
  createSimulatedTreasury,
  explorerTx,
  initialAllocation,
  parseCliOutput,
  runKit11,
  usdzToCents,
} from "../../packages/kernel/src/adapters/metal"
import { metalAgent } from "./metalCli"

const HOME = process.env.RAILGUARD_METAL_HOME ?? join(homedir(), ".railguard-metal")
const K = (f: string) => join(HOME, f)
const REPO = resolve(import.meta.dirname, "..", "..")
process.env.METAL_RPC_URL = readFileSync(K("rpc-url.txt"), "utf8").trim()
const RPC = process.env.METAL_RPC_URL
const USDZ = METAL_TESTNET.usdz as `0x${string}`
const UP_PORT = 4511
const Q_PORT = 4512
const argv = new Set(process.argv.slice(2))
const runId = `kit11-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 13)}`
const runDir = K(join("runs", runId))
mkdirSync(runDir, { recursive: true })

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T
const addr = (f: string) => readJson<{ address: string }>(K(f)).address
const privateKey = (f: string) => readJson<{ privateKey: `0x${string}` }>(K(f)).privateKey

async function accountOf(ownerFile: string): Promise<string> {
  const cacheFile = K("accounts.json")
  const cache = existsSync(cacheFile) ? readJson<Record<string, string>>(cacheFile) : {}
  if (cache[ownerFile]) return cache[ownerFile] as string
  // `account create` continues from an existing owner key and prints its account.
  const r = await metalAgent(["account", "create", "--out", K(ownerFile)], { quiet: true })
  const a = parseCliOutput(r.text).fields.account
  if (!a) throw new Error(`no account for ${ownerFile}: ${r.text}`)
  writeFileSync(cacheFile, JSON.stringify({ ...cache, [ownerFile]: a }, null, 2))
  return a
}

const transport = http(RPC)
const publicClient = createPublicClient({ transport })
const balanceOf = async (a: string) =>
  (await publicClient.readContract({
    address: USDZ,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [a as `0x${string}`],
  })) as bigint

async function topUp(ownerFile: string, account: string, usdz: string) {
  const want = parseUnits(usdz, 18)
  const have = await balanceOf(account)
  if (have >= want) return { tx: undefined, balance: formatUnits(have, 18) }
  const hash = await writeMip20Contract({
    walletClient: createWalletClient({
      account: privateKeyToAccount(privateKey(ownerFile)),
      transport,
    }),
    publicClient,
    abi: erc20Abi,
    address: USDZ,
    functionName: "transfer",
    args: [account as `0x${string}`, want - have],
    gasToken: USDZ,
    gasFallback: 200_000n,
  } as never)
  await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
  return { tx: hash as string, balance: formatUnits(await balanceOf(account), 18) }
}

// ----- owner steps (read the owner key) ---------------------------------------------------------

interface Cred {
  credential: string
  keyFile: string
  mandateId: string
}

async function issueMandate(
  name: string,
  principal: string,
  terms: MandateTerms,
  ownerFile: string,
  description: string,
  reuseKey?: string,
): Promise<Cred & { issuerPublic: string }> {
  const out = join(runDir, `${name}.json`)
  const args = [
    "mandate",
    "credential",
    "create",
    "--principal",
    principal,
    "--cap",
    centsToUsdz(terms.capCents),
    "--budget",
    centsToUsdz(terms.budgetCents),
    "--key",
    K(ownerFile),
    "--out",
    out,
    "--description",
    description,
  ]
  for (const p of terms.payees) args.push("--payee", p)
  if (reuseKey) args.push("--mandate-key-file", reuseKey)
  const r = await metalAgent(args)
  const f = parseCliOutput(r.text).fields
  if (!f.mandate) throw new Error(`credential create failed for ${name}`)
  return {
    credential: out,
    keyFile: reuseKey ?? (f["mandate-key-file"] ?? "").replace(/ \(created\)$/, ""),
    mandateId: f.mandate,
    issuerPublic: f["issuer-public-file"] ?? "",
  }
}

async function bind(c: Cred, ownerFile: string) {
  const r = await metalAgent([
    "mandate",
    "bind",
    "--credential",
    c.credential,
    "--key",
    K(ownerFile),
  ])
  const f = parseCliOutput(r.text).fields
  if (!f.bound) throw new Error(`bind failed: ${r.text}`)
  return f.transaction
}

// ----- x402 servers: the upstream seller and our query route --------------------------------------

const facilitator = new HTTPFacilitatorClient({ url: METAL_NETWORKS.testnet.facilitatorUrl })
const state = {
  upstreamCents: KIT11.upstreamPriceCents,
  queryCents: KIT11.queryPriceCents,
  wrongOrders: new Set<number>(),
  sourcing: undefined as Cred | undefined,
  orders: new Map<
    number,
    {
      signedOffer?: string
      transaction?: string
      delivered?: DeliveredQuote
      sourcingTx?: string
      refusal?: string
    }
  >(),
  upstreamPayTo: "",
  accountPayTo: "",
}

function startUpstream(): Promise<Server> {
  const server = registerMetalScheme(new x402ResourceServer(facilitator), { networks: ["testnet"] })
  const app = express()
  app.use(
    paymentMiddleware(
      {
        "GET /market-data": {
          accepts: {
            scheme: "exact",
            network: METAL_TESTNET.network,
            payTo: state.upstreamPayTo,
            price: () => centsToUsdz(state.upstreamCents),
          },
          description: "Upstream market data, per call",
        },
      } as never,
      server,
    ),
  )
  app.get("/market-data", (req, res) => {
    const n = Number(req.header("x-order-no") ?? 0)
    const wrong = state.wrongOrders.has(n)
    res.json({
      symbol: "ACME",
      price: wrong ? "0.00" : (101.25 + n / 100).toFixed(2),
      asOf: wrong ? "2026-01-01T00:00:00Z" : new Date().toISOString(),
      source: "upstream-metal-testnet",
    })
  })
  return new Promise((ok) => {
    const s = app.listen(UP_PORT, "127.0.0.1", () => ok(s))
  })
}

function startQueryRoute(): Promise<Server> {
  const server = requireSignedOffer(
    registerMetalScheme(new x402ResourceServer(facilitator), { networks: ["testnet"] }),
    { rpcUrl: RPC },
  )
  server.onAfterSettle(async ({ paymentPayload, result, transportContext }: never) => {
    const r = result as {
      success: boolean
      transaction?: string
      extra?: { settlement?: { first: boolean } }
    }
    if (!r.success || !r.extra?.settlement?.first) return
    const ctx = transportContext as
      | { request?: { adapter?: { getHeader(n: string): string | undefined } } }
      | undefined
    const n = Number(ctx?.request?.adapter?.getHeader("x-order-no") ?? 0)
    const order = signedOfferOf(paymentPayload)
    const rec = state.orders.get(n) ?? {}
    rec.signedOffer = typeof order === "string" ? order : JSON.stringify(order)
    rec.transaction = r.transaction
    state.orders.set(n, rec)
  })
  const app = express()
  app.use(
    paymentMiddleware(
      {
        "GET /query": {
          accepts: {
            scheme: "exact",
            network: METAL_TESTNET.network,
            payTo: state.accountPayTo,
            price: () => centsToUsdz(state.queryCents),
            extra: { ...SIGNED_OFFER_REQUIRED, resource: "GET /query" },
          },
          description: "One market-data query, paid per call with a signed order",
        },
      } as never,
      server as never,
    ),
  )
  app.get("/query", async (req, res) => {
    const n = Number(req.header("x-order-no") ?? 0)
    const c = state.sourcing
    if (!c) return void res.status(503).json({ error: "sourcing agent not ready" })
    // The sourcing agent buys the upstream input under ITS mandate (it holds no owner key).
    const r = await metalAgent([
      "pay",
      `http://127.0.0.1:${UP_PORT}/market-data`,
      "--mandate",
      c.credential,
      "--mandate-key-file",
      c.keyFile,
      "--header",
      `x-order-no: ${n}`,
    ])
    const pay = classifyPay(r.text)
    const rec = state.orders.get(n) ?? {}
    if (pay.outcome !== "PAID") {
      rec.refusal = pay.reason ?? pay.outcome
      state.orders.set(n, rec)
      // Error status: the middleware then does not settle the buyer's payment.
      return void res.status(502).json({ error: "upstream_refused", reason: rec.refusal })
    }
    rec.sourcingTx = pay.transaction
    rec.delivered = JSON.parse(pay.body ?? "{}") as DeliveredQuote
    state.orders.set(n, rec)
    res.json(rec.delivered)
  })
  return new Promise((ok) => {
    const s = app.listen(Q_PORT, "127.0.0.1", () => ok(s))
  })
}

// ----- the Metal testnet rail -------------------------------------------------------------------

async function main() {
  console.log(`Railguard Kit 11 live run ${runId} on Metal testnet (${METAL_TESTNET.network})`)
  const account = await accountOf("owner-key.json")
  const customerAccount = await accountOf("customer-owner-key.json")
  const upstream = addr("upstream-key.json")
  const bridge = addr("bridge-key.json")
  state.upstreamPayTo = upstream
  state.accountPayTo = account
  console.log(
    `business account ${account}\ncustomer account ${customerAccount}\nupstream ${upstream}\nbridge ${bridge}`,
  )

  // Fund: the business account holds exactly what the three budgets add up to (20 *USDZ).
  const funding = {
    business: await topUp("owner-key.json", account, centsToUsdz(KIT11.totalBudgetCents)),
    customer: await topUp("customer-owner-key.json", customerAccount, "2.00"),
  }
  console.log(
    `funded business ${funding.business.balance} *USDZ, customer ${funding.customer.balance} *USDZ`,
  )

  // Previous run's credentials are revoked so only this run's mandates are live.
  const prevFile = K("live-mandates.json")
  if (existsSync(prevFile)) {
    const prev = readJson<Record<string, { credential: string; owner: string }>>(prevFile)
    for (const [name, p] of Object.entries(prev)) {
      if (existsSync(p.credential))
        await metalAgent(["mandate", "revoke", "--credential", p.credential, "--key", K(p.owner)], {
          quiet: true,
        }).then((r) =>
          console.log(
            `revoked previous ${name}: ${/revoked|transaction/.test(r.text) ? "yes" : "already replaced or revoked"}`,
          ),
        )
    }
  }

  const allocation: Allocation = initialAllocation({ upstream, bridge })
  const creds: Record<AgentRole, Cred> = {} as never
  const bindTx: Record<string, string | undefined> = {}
  let issuerPublic = ""
  for (const role of ["sourcing", "support", "treasury"] as AgentRole[]) {
    const c = await issueMandate(
      `${role}-v1`,
      account,
      allocation[role],
      "owner-key.json",
      `Railguard ${role} agent (${runId})`,
    )
    issuerPublic = c.issuerPublic
    bindTx[role] = await bind(c, "owner-key.json")
    creds[role] = c
  }
  const customer = await issueMandate(
    "customer-v1",
    customerAccount,
    { capCents: 10, budgetCents: 100, payees: [account] },
    "customer-owner-key.json",
    `Customer data agent (${runId})`,
  )
  bindTx.customer = await bind(customer, "customer-owner-key.json")
  writeFileSync(
    prevFile,
    JSON.stringify(
      {
        sourcing: { credential: creds.sourcing.credential, owner: "owner-key.json" },
        support: { credential: creds.support.credential, owner: "owner-key.json" },
        treasury: { credential: creds.treasury.credential, owner: "owner-key.json" },
        customer: { credential: customer.credential, owner: "customer-owner-key.json" },
      },
      null,
      2,
    ),
  )
  state.sourcing = creds.sourcing
  const versions: Record<AgentRole, number> = { sourcing: 1, support: 1, treasury: 1 }
  const replacedCreds: Array<{ role: AgentRole; credential: string }> = []

  const servers = [await startUpstream(), await startQueryRoute()]
  const startedAt = Date.now()

  const verifyOut: Record<string, string> = {}
  const rail: Kit11Rail = {
    mode: "metal-testnet",
    addresses: { account, upstream, bridge, customerAccount },
    async setUpstreamPrice(c) {
      state.upstreamCents = c
    },
    async setQueryPrice(c) {
      state.queryCents = c
    },
    async sellQuery(orderNo, opts = {}) {
      if (opts.wrongData) state.wrongOrders.add(orderNo)
      const queryPriceCents = state.queryCents
      const upstreamPriceCents = state.upstreamCents
      const r = await metalAgent([
        "pay",
        `http://127.0.0.1:${Q_PORT}/query`,
        "--mandate",
        customer.credential,
        "--mandate-key-file",
        customer.keyFile,
        "--header",
        `x-order-no: ${orderNo}`,
      ])
      const pay = classifyPay(r.text)
      const rec = state.orders.get(orderNo) ?? {}
      const base: SaleRecord = {
        orderNo,
        outcome: "UNKNOWN",
        queryPriceCents,
        upstreamPriceCents,
        customerNonce: pay.nonce,
        refusal: rec.refusal,
      }
      if (pay.outcome === "PAID") {
        return {
          ...base,
          outcome: "SOLD",
          customerTx: pay.transaction,
          signedOffer: pay.signedOffer ?? rec.signedOffer,
          sourcingTx: rec.sourcingTx,
          delivered: rec.delivered ?? (JSON.parse(pay.body ?? "{}") as DeliveredQuote),
        }
      }
      if (pay.outcome === "REFUSED")
        return { ...base, outcome: "NOT_CHARGED", refusal: rec.refusal ?? pay.reason }
      return base // UNKNOWN: runKit11 reconciles against /settlements
    },
    async pull(role, p) {
      const c = creds[role]
      const r = await metalAgent([
        "mandate",
        "pull",
        "--credential",
        c.credential,
        "--mandate-key-file",
        c.keyFile,
        "--to",
        p.to,
        "--amount",
        centsToUsdz(p.cents),
        "--payment-id",
        p.paymentId,
      ])
      const x = classifyPull(r.text)
      return {
        outcome: x.outcome,
        alreadyPaid: x.alreadyPaid,
        transaction: x.transaction,
        reason: x.reason,
      }
    },
    async recordRefusal(role, p) {
      const c = creds[role]
      const r = await metalAgent([
        "mandate",
        "pull",
        "--credential",
        c.credential,
        "--mandate-key-file",
        c.keyFile,
        "--to",
        p.to,
        "--amount",
        centsToUsdz(p.cents),
        "--payment-id",
        p.paymentId,
        "--key",
        K("ops-key.json"),
        "--record-refusal",
      ])
      const x = classifyPull(r.text)
      return { transaction: x.transaction, reason: x.reason ?? x.outcome }
    },
    async replaceMandate(role, terms) {
      versions[role] += 1
      const old = creds[role]
      const c = await issueMandate(
        `${role}-v${versions[role]}`,
        account,
        terms,
        "owner-key.json",
        `Railguard ${role} agent (${runId}) v${versions[role]}`,
        old.keyFile,
      )
      const r = await metalAgent([
        "mandate",
        "replace",
        "--credential",
        c.credential,
        "--replaces",
        old.credential,
        "--key",
        K("owner-key.json"),
      ])
      const f = parseCliOutput(r.text).fields
      if (!f.transaction) throw new Error(`replace failed for ${role}`)
      replacedCreds.push({ role, credential: old.credential })
      creds[role] = c
      if (role === "sourcing") state.sourcing = c
      return { transaction: f.transaction, mandateId: c.mandateId }
    },
    async mandateState(role) {
      const r = await metalAgent(["mandate", "status", "--credential", creds[role].credential], {
        quiet: true,
      })
      const m = /spent\s+([\d.]+)\s*\*USDZ\s+of\s+([\d.]+)/.exec(r.text)
      return {
        spentCents: m?.[1] ? usdzToCents(m[1]) : 0,
        budgetCents: m?.[2] ? usdzToCents(m[2]) : 0,
        capCents: 0,
        revoked: /revoked\s+yes/.test(r.text),
        mandateId: creds[role].mandateId,
      }
    },
    async verifyMandate(role) {
      const r = await metalAgent([
        "mandate",
        "verify",
        "--credential",
        creds[role].credential,
        "--issuer",
        issuerPublic,
      ])
      verifyOut[`${role}-v${versions[role]}`] = r.text
      const verified = /verified\s+yes/.test(r.text)
      const payments = (r.text.match(/^\s*payment\b/gim) ?? []).length
      const refusals = (r.text.match(/^\s*refus/gim) ?? []).length
      return {
        verified,
        payments,
        refusals,
        detail: r.text.split(/\r?\n/).find((l) => /verified/.test(l)) ?? "",
      }
    },
    async verifySignedOrder(sale) {
      if (!sale.customerTx || !sale.signedOffer)
        return { ok: false, detail: "no signed order kept for this sale" }
      const r = await metalAgent([
        "mandate",
        "verify",
        "--credential",
        customer.credential,
        "--issuer",
        customer.issuerPublic,
        "--tx",
        sale.customerTx,
        "--signed-offer",
        sale.signedOffer,
      ])
      const ok = /verified\s+yes/.test(r.text)
      return {
        ok,
        detail: ok
          ? "signed order verified against the payment on chain (buyer's agent placed it)"
          : (r.text.split(/\r?\n/).find((l) => /step|error/.test(l)) ?? "verify failed"),
      }
    },
    async findSettlement(payTo, nonce) {
      const res = await fetch(
        `${METAL_TESTNET.facilitator}/settlements?payTo=${payTo}&since=${startedAt - 60_000}`,
      )
      const body = (await res.json()) as {
        settlements?: Array<{ id: string; transaction: string }>
      }
      const s = (body.settlements ?? []).find((x) =>
        x.id.toLowerCase().endsWith(nonce.toLowerCase().replace(/^0x/, "")),
      )
      return s ? { found: true, transaction: s.transaction } : { found: false }
    },
  }

  const useAirwallex =
    !argv.has("--no-airwallex") &&
    Boolean(
      process.env.AIRWALLEX_CLIENT_ID &&
        process.env.AIRWALLEX_API_KEY &&
        process.env.AIRWALLEX_EUR_BENEFICIARY_ID,
    )
  const treasury = useAirwallex
    ? createAirwallexRestTreasury({
        credentials: {
          clientId: process.env.AIRWALLEX_CLIENT_ID as string,
          apiKey: process.env.AIRWALLEX_API_KEY as string,
        },
        baseUrl: process.env.AIRWALLEX_BASE_URL,
        eurBeneficiaryId: process.env.AIRWALLEX_EUR_BENEFICIARY_ID as string,
        globalAccountId: process.env.AIRWALLEX_GLOBAL_ACCOUNT_ID,
      })
    : createSimulatedTreasury()
  const models =
    process.env.GEMINI_API_KEY && !argv.has("--scripted")
      ? [...new Set([process.env.KIT11_MODEL ?? "gemini-3.8-flash", "gemini-2.5-flash"])].map(
          (model) =>
            createGeminiKit11Model({ apiKey: process.env.GEMINI_API_KEY as string, model }),
        )
      : []

  let result: Awaited<ReturnType<typeof runKit11>> | undefined
  try {
    result = await runKit11({
      rail,
      treasury,
      models,
      allocation,
      runId,
      salesBefore: 3,
      salesAfter: 2,
      wrongDataOrders: [2],
      resendEarnings: true,
      // Approval is bound to the exact terms; --approve-limits records the operator's approval.
      approve: (p) => {
        console.log(`\nAPPROVAL NEEDED ${p.approvalHash}: option ${p.option.id} ${p.option.title}`)
        const ok = argv.has("--approve-limits")
        console.log(
          ok
            ? "approved by operator (--approve-limits)"
            : "not approved (run with --approve-limits)",
        )
        return ok
      },
      onEvent: (e) =>
        console.log(
          `\n[${e.step}] ${e.actor}: ${e.detail}${e.transaction ? `\n  ${explorerTx(e.transaction)}` : ""}`,
        ),
    })
  } finally {
    for (const s of servers) s.close()
    // The latest credentials are the ones the next run revokes.
    writeFileSync(
      prevFile,
      JSON.stringify(
        {
          ...Object.fromEntries(
            Object.entries(creds).map(([r, c]) => [
              r,
              { credential: c.credential, owner: "owner-key.json" },
            ]),
          ),
          customer: { credential: customer.credential, owner: "customer-owner-key.json" },
        },
        null,
        2,
      ),
    )
  }

  const evidence = {
    kind: "railguard.metal.kit11.live",
    runId,
    generatedAt: new Date().toISOString(),
    network: METAL_TESTNET.network,
    explorer: METAL_TESTNET.explorer,
    facilitator: METAL_TESTNET.facilitator,
    // Record the model that actually answered (a fallback may answer if the first model fails).
    model: answeringModel(result) ?? models[0]?.name ?? "scripted-rules",
    modelsAttempted: models.map((m) => m.name),
    treasury: treasury.mode,
    addresses: { account, customerAccount, upstream, bridge },
    funding: {
      businessTx: funding.business.tx,
      businessBalance: funding.business.balance,
      customerTx: funding.customer.tx,
    },
    mandates: {
      ...Object.fromEntries(Object.entries(creds).map(([r, c]) => [r, c.mandateId])),
      customer: customer.mandateId,
    },
    bindTx,
    result,
    verifyOutput: verifyOut,
  }
  const outDir = join(REPO, "evidence", "metal-testnet")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, "kit11-live.json"), `${JSON.stringify(evidence, null, 2)}\n`)
  writeFileSync(join(runDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log("\nevidence -> evidence/metal-testnet/kit11-live.json")
  console.log(`invariants ${JSON.stringify(result?.invariants)}`)
}

main().catch((e) => {
  console.error(`run failed: ${(e as Error).message}`)
  process.exit(1)
})

/** Collects every `decidedBy` in the run result; returns the answering model(s). */
function answeringModel(value: unknown): string | undefined {
  const found = new Set<string>()
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) {
        if (k === "decidedBy" && typeof x === "string" && x !== "scripted-rules") found.add(x)
        else walk(x)
      }
  }
  walk(value)
  return found.size ? [...found].join("+") : undefined
}
