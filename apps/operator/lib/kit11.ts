/** Server-only helpers for the Kit 11 x402 Business Agents page (simulated run + recorded Metal run). */
import recorded from "../../../evidence/metal-testnet/kit11-live.json"
import {
  KIT11,
  type Kit11Model,
  createGeminiKit11Model,
  createSimulatedKit11Rail,
  createSimulatedTreasury,
  initialAllocation,
  runKit11,
} from "../../../packages/kernel/src/adapters/metal"

const SIM_ADDR = {
  upstream: "0x5100000000000000000000000000000000000002",
  bridge: "0x5100000000000000000000000000000000000003",
}

export function recordedKit11Run() {
  return recorded
}

const runsByIp = new Map<string, number[]>()
export const PUBLIC_SIM_RUNS_PER_HOUR = 20

export function allowSimRun(ip: string): boolean {
  const now = Date.now()
  const recent = (runsByIp.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.length >= PUBLIC_SIM_RUNS_PER_HOUR) return false
  recent.push(now)
  runsByIp.set(ip, recent)
  return true
}

export async function runSimulatedKit11(opts: {
  approve: boolean
  lostAnswer: boolean
  useModel: boolean
}) {
  const allocation = initialAllocation(SIM_ADDR)
  const rail = createSimulatedKit11Rail({
    allocation,
    addresses: SIM_ADDR,
    queryPriceCents: KIT11.queryPriceCents,
    upstreamPriceCents: KIT11.upstreamPriceCents,
    dropFirstAnswer: opts.lostAnswer ? ["treasury"] : [],
  })
  const key = process.env.GEMINI_API_KEY
  const models: Kit11Model[] =
    opts.useModel && key
      ? [createGeminiKit11Model({ apiKey: key, model: "gemini-2.5-flash", timeoutMs: 15_000 })]
      : []
  const result = await runKit11({
    rail,
    treasury: createSimulatedTreasury(),
    models,
    allocation,
    approve: () => opts.approve,
    runId: `sim-${Date.now().toString(36)}`,
    resendEarnings: !opts.lostAnswer,
  })
  return { result, model: models[0]?.name ?? "scripted-rules" }
}
