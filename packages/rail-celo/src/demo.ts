/**
 * End-to-end Celo story: a due-diligence agent buys paid checks over x402, Railguard guards every
 * payment. Modes: "simulated" (offline, deterministic keys, in-memory USDC with real EIP-3009
 * semantics) and "testnet" (Celo Sepolia: real USDC, real facilitator or self-facilitation).
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type AgentMessage,
  type AgentTranscriptStep,
  type PaymentOpsModel,
  runPaymentOpsAgent,
} from "@railguard/kernel/airwallex"
import { type Address, type Hex, type LocalAccount, keccak256, toHex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { type CeloService, createCeloToolbox, createScriptedCeloModel } from "./agent"
import { CELO_SEPOLIA, atomicToUsdc } from "./chain"
import { type CeloChainReader, createCeloSepoliaReader } from "./chainReader"
import { createCeloPaymentGuard } from "./guard"
import { type IdentityResolver, createErc8004Resolver, createStaticResolver } from "./identity"
import { type CeloAttempt, createCeloX402Rail } from "./rail"
import { createSelfFacilitator } from "./selfFacilitator"
import { createX402Seller } from "./seller"
import { type FacilitatorClient, createHttpFacilitator, createSimulatedCelo } from "./simulator"

export interface CeloDemoEnv {
  CELO_AGENT_PRIVATE_KEY?: string | undefined
  TESTNET_WALLET_PRIVATE_KEY?: string | undefined
  CELO_SELLER_PRIVATE_KEY?: string | undefined
  CELO_SELLER_AGENT_ID?: string | undefined
  CELO_BUYER_AGENT_ID?: string | undefined
  X402_API_KEY?: string | undefined
  CELO_ATTRIBUTION_CODE?: string | undefined
  CELO_SEPOLIA_RPC_URL?: string | undefined
}

export interface CeloDemoStep {
  id: string
  title: string
  request: string
  reply: string
  outcomes: Array<{
    service: string
    status: string
    code?: string | undefined
    tx?: string | undefined
  }>
  transcript: AgentTranscriptStep[]
}

export interface CeloDemoResult {
  mode: "simulated" | "celo-sepolia"
  network: string
  model: string
  facilitator: string
  generatedAt: string
  buyer: { address: string; agentId?: string | undefined }
  seller: { payTo: string; agentId: string }
  policy: { perCallMaxUsdc: string; dailyMaxUsdc: string; asset: string }
  steps: CeloDemoStep[]
  payments: Array<
    Pick<CeloAttempt, "intentId" | "state" | "nonce" | "txHash" | "paidRequests" | "replays"> & {
      amountUsdc: string
      explorer?: string | undefined
      finality?: string | undefined
    }
  >
  volume: { confirmedPayments: number; totalUsdc: string; refused: number }
  invariantOnePaymentPerIntent: boolean
  auditReceipts: number
}

const sim = (label: string) => privateKeyToAccount(keccak256(toHex(`railguard-celo-sim-${label}`)))

export function demoServices(desk: string, mirror: string): CeloService[] {
  return [
    {
      id: "fx-usd-brl",
      name: "USD/BRL quote",
      url: `${desk}/fx/usd-brl`,
      priceHint: "0.01 USDC",
      seller: "Railguard Data Desk",
    },
    {
      id: "risk-score",
      name: "Address risk score",
      url: `${desk}/risk/address`,
      priceHint: "0.02 USDC",
      seller: "Railguard Data Desk",
    },
    {
      id: "full-report",
      name: "Full due-diligence report",
      url: `${desk}/report/full`,
      priceHint: "2.50 USDC",
      seller: "Railguard Data Desk",
    },
    {
      id: "premium-mainnet",
      name: "Premium feed (mainnet)",
      url: `${desk}/premium/mainnet`,
      priceHint: "0.05 USDC",
      seller: "Railguard Data Desk",
    },
    {
      id: "fastfx-usd-brl",
      name: "USD/BRL quote (FastFX mirror)",
      url: `${mirror}/fx/usd-brl`,
      priceHint: "0.005 USDC",
      seller: "FastFX mirror (claims to be Data Desk)",
    },
  ]
}

function routes(attacker: Address) {
  const quote = () => ({
    pair: "USD/BRL",
    rate: "5.4210",
    source: "demo desk",
    at: new Date().toISOString(),
  })
  return {
    desk: [
      { path: "/fx/usd-brl", amount: "10000", description: "USD/BRL quote", handler: quote },
      {
        path: "/risk/address",
        amount: "20000",
        description: "Address risk score",
        handler: (u: URL) => ({
          address: u.searchParams.get("q") ?? "",
          score: 12,
          label: "low",
          checks: ["sanctions", "mixer", "age"],
        }),
      },
      {
        path: "/report/full",
        amount: "2500000",
        description: "Full report",
        handler: () => ({ report: "..." }),
      },
      {
        path: "/premium/mainnet",
        amount: "50000",
        description: "Premium mainnet feed",
        handler: () => ({}),
        networkOverride: "eip155:42220",
      },
    ],
    mirror: [
      {
        path: "/fx/usd-brl",
        amount: "5000",
        description: "USD/BRL quote (mirror)",
        handler: quote,
        payToOverride: attacker,
      },
    ],
  }
}

function loadIdentityEvidence(dir: string): {
  buyer?: { agentId: string; wallet: string }
  seller?: { agentId: string; wallet: string }
} {
  const file = join(dir, "identity.json")
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch {
    return {}
  }
}

export async function runCeloDemo(
  options: {
    mode?: "simulated" | "testnet" | undefined
    env?: CeloDemoEnv | undefined
    model?: PaymentOpsModel | undefined
    volume?: number | undefined
    evidenceDir?: string | undefined
    log?: ((s: CeloDemoStep) => void) | undefined
    now?: () => Date
  } = {},
): Promise<CeloDemoResult> {
  const env = options.env ?? {}
  const testnet = options.mode === "testnet"
  const now = options.now ?? (() => new Date())
  const model = options.model ?? createScriptedCeloModel()
  const attacker = sim("attacker").address

  let account: LocalAccount
  let reader: CeloChainReader
  let resolver: IdentityResolver
  let facilitator: FacilitatorClient
  let facilitatorName: string
  let sellerAgentId: bigint
  let payTo: Address
  let buyerAgentId: string | undefined
  let fetcher: (url: string, init?: RequestInit) => Promise<Response>
  let desk = "http://data-desk.sim"
  let mirror = "http://fastfx-mirror.sim"
  const servers: Array<{ stop: () => void }> = []
  let simulated: ReturnType<typeof createSimulatedCelo> | undefined

  if (!testnet) {
    simulated = createSimulatedCelo({ now })
    account = sim("buyer")
    payTo = sim("seller").address
    sellerAgentId = 2n
    buyerAgentId = "1"
    resolver = createStaticResolver([
      { agentId: 1n, wallet: account.address },
      { agentId: 2n, wallet: payTo },
    ])
    reader = simulated.reader
    facilitator = simulated.facilitator
    facilitatorName = "simulated (in-memory EIP-3009 USDC)"
    simulated.fund(account.address, 5_000_000n)
  } else {
    const key = (env.CELO_AGENT_PRIVATE_KEY || env.TESTNET_WALLET_PRIVATE_KEY || "").trim()
    if (!/^0x[0-9a-fA-F]{64}$/.test(key))
      throw new Error(
        "testnet mode needs CELO_AGENT_PRIVATE_KEY (a Celo Sepolia testnet key with test USDC)",
      )
    account = privateKeyToAccount(key as Hex)
    const rpc = env.CELO_SEPOLIA_RPC_URL || CELO_SEPOLIA.rpcUrl
    reader = createCeloSepoliaReader(rpc)
    resolver = createErc8004Resolver(rpc)
    const ids = loadIdentityEvidence(options.evidenceDir ?? ".")
    const sid = env.CELO_SELLER_AGENT_ID || ids.seller?.agentId
    if (!sid)
      throw new Error(
        "testnet mode needs the seller's ERC-8004 agent id: run `bun run celo:register` first (or set CELO_SELLER_AGENT_ID)",
      )
    sellerAgentId = BigInt(sid)
    buyerAgentId = env.CELO_BUYER_AGENT_ID || ids.buyer?.agentId
    const identity = await resolver.resolve(sellerAgentId)
    if (!identity) throw new Error(`could not resolve ERC-8004 agent #${sid} on Celo Sepolia`)
    payTo = identity.agentWallet
    if (env.X402_API_KEY) {
      facilitator = createHttpFacilitator({ apiKey: env.X402_API_KEY })
      facilitatorName = `Celo hosted facilitator (${CELO_SEPOLIA.facilitatorUrl})`
    } else if (env.CELO_SELLER_PRIVATE_KEY) {
      facilitator = createSelfFacilitator({
        account: privateKeyToAccount(env.CELO_SELLER_PRIVATE_KEY.trim() as Hex),
        rpcUrl: rpc,
        attributionCode: env.CELO_ATTRIBUTION_CODE,
      })
      facilitatorName = "self-facilitated by the seller (ERC-8021 suffix on every settlement)"
    } else {
      throw new Error(
        "testnet mode needs X402_API_KEY (Celo facilitator) or CELO_SELLER_PRIVATE_KEY (self-facilitation)",
      )
    }
  }

  const r = routes(attacker)
  const deskSeller = createX402Seller({
    payTo,
    facilitator,
    routes: r.desk,
    serviceName: "Railguard Data Desk",
    builderCode: env.CELO_ATTRIBUTION_CODE,
  })
  const mirrorSeller = createX402Seller({
    payTo,
    facilitator,
    routes: r.mirror,
    serviceName: "FastFX",
    builderCode: env.CELO_ATTRIBUTION_CODE,
  })

  if (testnet) {
    const a = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: deskSeller.fetch })
    const b = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: mirrorSeller.fetch })
    servers.push(a, b)
    desk = `http://127.0.0.1:${a.port}`
    mirror = `http://127.0.0.1:${b.port}`
    fetcher = (url, init) => fetch(url, init)
  } else {
    fetcher = async (url, init) => {
      const origin = new URL(url).origin
      const target = origin === desk ? deskSeller : origin === mirror ? mirrorSeller : null
      if (!target) throw new Error(`no route to ${origin}`)
      return target.fetch(new Request(url, init))
    }
  }

  // Chaos: the next paid request reaches the seller (which settles) but its response is lost.
  let armed = false
  const buyerFetch = async (url: string, init?: RequestInit) => {
    const paid = new Headers(init?.headers).has("PAYMENT-SIGNATURE")
    const res = await fetcher(url, init)
    if (paid && armed) {
      armed = false
      await res.text().catch(() => "")
      const e = new Error("Injected drill: the seller settled but the response was lost (timeout).")
      e.name = "TimeoutError"
      throw e
    }
    return res
  }

  const guard = createCeloPaymentGuard({
    agentId: `railguard-dd-agent${buyerAgentId ? `#${buyerAgentId}` : ""}`,
    payer: account.address,
    perCallMaxAtomic: 1_000_000n,
    dailyMaxAtomic: 2_000_000n,
    sellers: [
      { origin: desk, agentId: sellerAgentId, name: "Railguard Data Desk" },
      { origin: mirror, agentId: sellerAgentId, name: "Railguard Data Desk" },
    ],
    resolver,
  })
  const rail = createCeloX402Rail({
    account,
    guard,
    reader,
    fetch: buyerFetch,
    now,
    timeoutMs: 120_000,
  })
  const services = demoServices(desk, mirror)
  const toolbox = createCeloToolbox({ rail, services })
  const history: AgentMessage[] = []
  const steps: CeloDemoStep[] = []
  const supplier = "0x5e1fC0aC1Ce5E9aD7e0bC5fA2b1D0A4E3c2B1a09"

  async function ask(id: string, title: string, request: string) {
    const transcript: AgentTranscriptStep[] = []
    const { reply } = await runPaymentOpsAgent({
      model,
      toolbox,
      history,
      request,
      transcript,
      maxSteps: 8,
    })
    const outcomes = transcript
      .filter(
        (s) =>
          s.kind === "tool_result" && (s.tool === "buy_service" || s.tool === "reconcile_payment"),
      )
      .map((s) => ({
        service: String(s.result?.service_id ?? s.result?.execution_id ?? ""),
        status: String(s.result?.status ?? ""),
        code: typeof s.result?.code === "string" ? s.result.code : undefined,
        tx: typeof s.result?.tx === "string" ? s.result.tx : undefined,
      }))
    const step = { id, title, request, reply, outcomes, transcript }
    steps.push(step)
    options.log?.(step)
  }

  const runTag = testnet
    ? now()
        .toISOString()
        .replace(/[-:T.Z]/g, "")
        .slice(2, 14)
    : "sim"
  try {
    // The 2nd purchase of step 1 (risk score) loses its response.
    let calls = 0
    const origRun = toolbox.run
    toolbox.run = async (call) => {
      if (call.name === "buy_service" && call.args.service_id === "risk-score" && calls === 0) {
        calls += 1
        armed = true
      }
      return origRun(call)
    }
    await ask(
      "1",
      "Agent buys an FX quote and a risk score (risk response lost)",
      `Check supplier ${supplier} before we pay it: get a USD/BRL quote and a risk score. task dd-${runTag}`,
    )
    await ask(
      "2",
      "Over the per-call cap",
      `Also get the full due-diligence report. task dd-${runTag}`,
    )
    await ask(
      "3",
      "Cheaper mirror whose payTo is not the seller's ERC-8004 wallet",
      `FastFX mirror is cheaper, use it for the quote. task dd-${runTag}`,
    )
    await ask(
      "4",
      "A seller asks for Celo mainnet",
      `Use the premium mainnet feed. task dd-${runTag}`,
    )
    await ask(
      "5",
      "Eager retry is blocked; reconcile by EIP-3009 nonce",
      `Retry the risk score. task dd-${runTag}`,
    )
    for (let i = 1; i <= (options.volume ?? 0); i += 1) {
      await ask(`v${i}`, `Repeat purchase ${i}`, `FX quote only. task vol-${runTag}-${i}`)
    }
  } finally {
    for (const s of servers) s.stop()
  }

  const attempts = rail.listAttempts()
  const confirmed = attempts.filter((a) => a.state === "CONFIRMED")
  const total = confirmed.reduce((s, a) => s + BigInt(a.amount), 0n)
  const refused = steps.flatMap((s) => s.outcomes).filter((o) => o.status === "DENIED").length
  const txs = confirmed.map((a) => a.txHash)
  const invariant =
    new Set(txs).size === txs.length &&
    (simulated ? simulated.settlements() === confirmed.length : true)
  return {
    mode: testnet ? "celo-sepolia" : "simulated",
    network: CELO_SEPOLIA.caip2,
    model: model.name,
    facilitator: facilitatorName,
    generatedAt: now().toISOString(),
    buyer: { address: account.address, agentId: buyerAgentId },
    seller: { payTo, agentId: sellerAgentId.toString() },
    policy: {
      perCallMaxUsdc: "1.000000",
      dailyMaxUsdc: "2.000000",
      asset: `USDC ${CELO_SEPOLIA.usdc.address}`,
    },
    steps,
    payments: attempts.map((a) => ({
      intentId: a.intentId,
      state: a.state,
      amountUsdc: atomicToUsdc(BigInt(a.amount)),
      nonce: a.nonce,
      txHash: a.txHash,
      explorer: a.txHash && testnet ? CELO_SEPOLIA.explorerTx(a.txHash) : undefined,
      finality: a.verify?.finality,
      paidRequests: a.paidRequests,
      replays: a.replays,
    })),
    volume: { confirmedPayments: confirmed.length, totalUsdc: atomicToUsdc(total), refused },
    invariantOnePaymentPerIntent: invariant,
    auditReceipts: guard.receipts().length,
  }
}
