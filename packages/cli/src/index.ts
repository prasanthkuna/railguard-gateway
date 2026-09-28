#!/usr/bin/env bun
import { parseArgs } from "node:util"
import { runInject, runRaceBudget, runVerifyApf } from "./commands/failure"
import { runDoctor, runLab, runVerify } from "./commands/ops"
import { runProtect } from "./commands/protect"
import {
  runAuthorize,
  runEvidence,
  runExecute,
  runIntentCreate,
  runMetrics,
  runPay,
} from "./commands/v5"
import { resolveRailguardEnv } from "./config"

const HELP = `Railguard CLI — financial execution firewall (v0.1.0-alpha)

Public commands:
  railguard scan [--base-url URL]       posture & configuration
  railguard attack [lab args...]        Failure Lab adversarial profiles
  railguard protect [--base-url URL]    protection setup
  railguard status [--base-url URL]     execution metrics
  railguard receipts [id] [--base-url]  verify & evidence

Advanced:
  doctor verify inject race lab metrics intent authorize execute pay evidence

Environment:
  RAILGUARD_BASE_URL       API base (default http://localhost:4000)
  RAILGUARD_ACCESS_TOKEN   Bearer token for Gateway API calls
`

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    "base-url": { type: "string" },
    "payment-intent-id": { type: "string" },
  },
  allowPositionals: true,
  strict: false,
})

async function main(): Promise<number> {
  if (values.help) {
    console.log(HELP)
    return 0
  }

  const env = resolveRailguardEnv({
    baseUrl: values["base-url"] as string | undefined,
  })

  const [cmd, sub, arg] = positionals

  if (!cmd) {
    console.log(HELP)
    return 1
  }

  try {
    switch (cmd) {
      case "scan":
        await runDoctor(env, { banner: "Railguard scan — posture & configuration" })
        return 0
      case "doctor":
        await runDoctor(env)
        return 0
      case "attack":
        return runLab(positionals.slice(1))
      case "status":
        await runMetrics(env, { banner: "Railguard status — execution metrics" })
        return 0
      case "receipts":
        console.log("Railguard receipts — verify & evidence\n")
        if (sub?.toUpperCase().startsWith("APF-")) return runVerifyApf(sub, env)
        return runVerify(env, sub)
      case "protect":
        return runProtect(env)
      case "inject":
        if (!sub)
          throw new Error(
            "usage: railguard inject <rpc-timeout|duplicate-retry|reorg|signer-timeout>",
          )
        return runInject(sub, positionals.slice(2))
      case "race":
        if (sub !== "budget") throw new Error("usage: railguard race budget [--requests N]")
        return runRaceBudget(Number(positionals[2] ?? 100))
      case "verify":
        if (sub?.toUpperCase().startsWith("APF-")) return runVerifyApf(sub, env)
        return runVerify(env, sub)
      case "lab":
        return runLab(positionals.slice(1))
      case "metrics":
        await runMetrics(env)
        return 0
      case "evidence":
        if (!sub) throw new Error("usage: railguard evidence <executionId>")
        await runEvidence(env, sub)
        return 0
      case "intent":
        if (sub !== "create") throw new Error("usage: railguard intent create [file.json]")
        await runIntentCreate(env, arg)
        return 0
      case "authorize":
        if (!sub) throw new Error("usage: railguard authorize <intentId>")
        await runAuthorize(env, sub)
        return 0
      case "execute":
        if (!sub) throw new Error("usage: railguard execute <intentId>")
        await runExecute(env, sub, values["payment-intent-id"] as string | undefined)
        return 0
      case "pay":
        await runPay(env, sub, values["payment-intent-id"] as string | undefined)
        return 0
      default:
        console.error(`unknown command: ${cmd}\n`)
        console.log(HELP)
        return 1
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

process.exit(await main())
