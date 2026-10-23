#!/usr/bin/env bun
/**
 * Railguard x Celo: guarded x402 due-diligence agent.
 *   bun run celo:demo                     # offline, no keys
 *   bun run celo:demo --testnet           # Celo Sepolia (see docs/hackathons/celo/README.md for env)
 *   --volume N   repeat N extra paid FX quotes (testnet volume)   --save   write evidence JSON   --json
 * Keys are read from the environment and never printed. Mainnet is not supported.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createCeloAgentModel, createScriptedCeloModel } from "../src/agent"
import { CELO_SEPOLIA } from "../src/chain"
import { type CeloDemoEnv, type CeloDemoStep, runCeloDemo } from "../src/demo"

const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
const volIdx = argv.indexOf("--volume")
const volume = volIdx >= 0 ? Math.min(Number(argv[volIdx + 1] ?? 0) || 0, 50) : 0
const evidenceDir = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "docs",
  "hackathons",
  "celo",
  "evidence",
)
const model = has("--scripted")
  ? createScriptedCeloModel()
  : createCeloAgentModel(process.env as Record<string, string | undefined>)

function print(step: CeloDemoStep) {
  console.log(`\n=== Step ${step.id}: ${step.title}`)
  console.log(`> ${step.request}`)
  for (const t of step.transcript) {
    if (t.kind === "tool_call") console.log(`  [agent -> ${t.tool}] ${JSON.stringify(t.args)}`)
    if (t.kind === "tool_result" && t.tool !== "list_services") {
      const r = t.result ?? {}
      console.log(
        `  [railguard] ${JSON.stringify({ service: r.service_id, status: r.status, code: r.code, tx: r.tx, replays: r.replays })}`,
      )
    }
  }
  console.log(`  agent: ${step.reply.replace(/\n/g, "\n         ")}`)
}

const result = await runCeloDemo({
  mode: has("--testnet") ? "testnet" : "simulated",
  env: process.env as CeloDemoEnv,
  model,
  volume,
  evidenceDir,
  log: has("--json") ? undefined : print,
})
if (has("--json")) console.log(JSON.stringify(result, null, 2))
else {
  console.log(
    `\nMode: ${result.mode} (${result.network}) | facilitator: ${result.facilitator} | model: ${result.model}`,
  )
  console.log(
    `Buyer ${result.buyer.address}${result.buyer.agentId ? ` (ERC-8004 #${result.buyer.agentId})` : ""} -> seller ERC-8004 #${result.seller.agentId} wallet ${result.seller.payTo}`,
  )
  for (const p of result.payments)
    console.log(
      `  ${p.intentId}  ${p.amountUsdc} USDC  ${p.state}  ${p.txHash ? (result.mode === "celo-sepolia" ? CELO_SEPOLIA.explorerTx(p.txHash) : p.txHash) : "-"}`,
    )
  console.log(
    `Confirmed: ${result.volume.confirmedPayments} payments, ${result.volume.totalUsdc} USDC | refused: ${result.volume.refused} | one payment per intent: ${result.invariantOnePaymentPerIntent ? "YES" : "NO"}`,
  )
}
if (has("--save")) {
  mkdirSync(evidenceDir, { recursive: true })
  const file = join(evidenceDir, `${result.mode}-latest.json`)
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`saved ${file}`)
}
if (!result.invariantOnePaymentPerIntent) process.exit(1)
