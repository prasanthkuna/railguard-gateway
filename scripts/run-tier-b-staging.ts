#!/usr/bin/env bun
/**
 * Tier B on staging Encore (requires WorkOS access token from operator session).
 * Usage:
 *   TIER_B_ACCESS_TOKEN=eyJ... bun run scripts/run-tier-b-staging.ts
 * Optional: TIER_B_TX_HASH=0x... (skip on-chain; only observe)
 */

const API = process.env.TIER_B_API_URL ?? "https://staging-railguard-s4ii.encr.app"
const TOKEN = process.env.TIER_B_ACCESS_TOKEN?.trim()
const ORG = process.env.TIER_B_ORG_ID?.trim()

if (!TOKEN) {
  console.error("Set TIER_B_ACCESS_TOKEN (WorkOS JWT from prebroadcast localStorage)")
  process.exit(1)
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  }
  if (ORG) headers["X-Organization-Id"] = ORG
  const res = await fetch(`${API}${path}`, { ...init, headers })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`)
  return text ? (JSON.parse(text) as T) : ({} as T)
}

const DEMO_RECIPIENT = "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233"
const DEMO_AMOUNT = "10000"

async function main() {
  const observeOnly = process.env.TIER_B_OBSERVE_ONLY === "1"
  const executionId = process.env.TIER_B_EXECUTION_ID?.trim()
  const txHashOnly = process.env.TIER_B_TX_HASH?.trim()
  if (observeOnly) {
    if (!executionId || !txHashOnly) {
      console.error("TIER_B_OBSERVE_ONLY=1 requires TIER_B_EXECUTION_ID and TIER_B_TX_HASH")
      process.exit(1)
    }
    const observed = await api<{ status: string; txHash: string; explorerUrl?: string }>(
      `/v1/executions/${executionId}/observe`,
      { method: "POST", body: JSON.stringify({ txHash: txHashOnly }) },
    )
    console.log("observe:", JSON.stringify(observed, null, 2))
    return
  }

  const idem = `idem_arb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const expires = new Date(Date.now() + 86_400_000).toISOString()

  const created = await api<{ intent: { id?: string }; status: string }>("/v1/intents", {
    method: "POST",
    body: JSON.stringify({
      principal: { organizationId: "demo", actorId: "agent-demo", actorType: "agent" },
      action: { type: "transfer", purpose: "Arbitrum Tier B demo" },
      counterparty: { address: DEMO_RECIPIENT },
      value: { amount: DEMO_AMOUNT, asset: "USDC" },
      constraints: { expiresAt: expires, network: "arbitrum-sepolia" },
      idempotencyKey: idem,
      context: { task: "hackquest-tier-b" },
    }),
  })

  const intentId = created.intent?.id
  if (!intentId) throw new Error("missing intent id")

  await api(`/v1/intents/${intentId}/authorize`, { method: "POST", body: "{}" })

  const ext = await api<{
    executionId: string
    status: string
    broadcastSheet: Record<string, unknown>
  }>(`/v1/intents/${intentId}/execute-external`, { method: "POST", body: "{}" })

  console.log(JSON.stringify({ intentId, executionId: ext.executionId, status: ext.status, broadcastSheet: ext.broadcastSheet }, null, 2))

  const txHash = process.env.TIER_B_TX_HASH?.trim()
  if (txHash) {
    const observed = await api<{ status: string; txHash: string; explorerUrl?: string }>(
      `/v1/executions/${ext.executionId}/observe`,
      { method: "POST", body: JSON.stringify({ txHash }) },
    )
    console.log("observe:", JSON.stringify(observed, null, 2))
  } else {
    console.error("Send USDC then: TIER_B_TX_HASH=0x... bun run scripts/run-tier-b-staging.ts with same token and re-run observe-only — or set TIER_B_OBSERVE_ONLY=1")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
