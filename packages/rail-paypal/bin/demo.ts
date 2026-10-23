#!/usr/bin/env bun
/**
 * Railguard x PayPal: AI accounts-payable agent demo.
 *
 *   bun run paypal:demo            # offline simulator, no keys (scripted model, or Gemini if GEMINI_API_KEY is set)
 *   bun run paypal:demo --live     # real PayPal sandbox (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX_RECEIVER_EMAIL)
 *   add --json to print the full result, --save to write docs/hackathons/paypal/evidence/<mode>-latest.json
 *
 * Secrets are read from the environment and never printed.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createApModel, createScriptedApModel } from "../src/agent"
import { type ApDemoEnv, type ApDemoStep, runApDemo } from "../src/demo"

const args = new Set(process.argv.slice(2))
const live = args.has("--live")
const model = args.has("--scripted")
  ? createScriptedApModel()
  : createApModel(process.env as Record<string, string | undefined>)

function print(step: ApDemoStep) {
  console.log(`\n=== Step ${step.id}: ${step.title}`)
  console.log(`> ${step.request}`)
  for (const t of step.transcript) {
    if (t.kind === "tool_call") console.log(`  [agent -> ${t.tool}] ${JSON.stringify(t.args)}`)
    if (t.kind === "tool_result") {
      const r = t.result ?? {}
      const brief =
        t.tool === "read_invoices"
          ? `${(r.invoices as unknown[] | undefined)?.length ?? 0} invoice(s)`
          : JSON.stringify({
              invoice: r.invoice,
              status: r.status,
              code: r.code,
              batch: r.payout_batch_id,
              create_calls: r.create_calls,
              replays: r.idempotent_replays,
              via: r.via,
            })
      console.log(`  [railguard] ${brief}`)
    }
    if (t.kind === "system") console.log(`  [human] ${t.text}`)
  }
  console.log(`  agent: ${step.reply.replace(/\n/g, "\n         ")}`)
}

const result = await runApDemo({
  model,
  env: process.env as ApDemoEnv,
  live,
  log: args.has("--json") ? undefined : print,
})

if (args.has("--json")) console.log(JSON.stringify(result, null, 2))
else {
  console.log(`\nMode: ${result.mode} | model: ${result.model}`)
  console.log(`Budget: ${result.budget.used} of ${result.budget.limit} USD used`)
  console.log("Payouts:")
  for (const p of result.payouts)
    console.log(
      `  ${p.intentId}  ${p.amount} USD  ${p.state}  batch=${p.payoutBatchId ?? "-"}  creates=${p.createCalls} replays=${p.replays}`,
    )
  console.log(
    `PayPal create POSTs: ${result.paypalCreatePosts} | one payout per invoice: ${result.invariantOnePayoutPerInvoice ? "YES" : "NO"}`,
  )
}
if (args.has("--save")) {
  const dir = join(import.meta.dir, "..", "..", "..", "docs", "hackathons", "paypal", "evidence")
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${result.mode}-latest.json`)
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`saved ${file}`)
}
if (!result.invariantOnePayoutPerInvoice) process.exit(1)
