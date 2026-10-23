/** Runs the metal-agent CLI (v0.3.3) as a child process. Never prints key files or the RPC URL. */
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const pkgDir = dirname(require.resolve("@metalntwx/metal-agent/package.json"))
const BIN = join(pkgDir, "dist", "index.js")

export interface CliRun {
  args: string[]
  text: string
  code: number | null
  timedOut: boolean
}

export function metalAgent(
  args: string[],
  opts: { timeoutMs?: number; quiet?: boolean } = {},
): Promise<CliRun> {
  const full = [...args, ...(args[0] === "key" ? [] : ["--network", "testnet"])]
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...full], { env: process.env, windowsHide: true })
    let text = ""
    child.stdout.on("data", (d) => {
      text += d.toString()
    })
    child.stderr.on("data", (d) => {
      text += d.toString()
    })
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, opts.timeoutMs ?? 150_000)
    child.on("close", (code) => {
      clearTimeout(timer)
      const clean = text.replace(/Assertion failed:.*UV_HANDLE_CLOSING.*\n?/g, "")
      if (!opts.quiet) {
        const shown = clean.replace(
          /https:\/\/rpc-testnet\.metalntwx\.com\/v1\/[A-Za-z0-9_-]+/g,
          "<rpc-endpoint>",
        )
        console.log(
          `  $ metal-agent ${args.map((a) => (a.length > 70 ? `${a.slice(0, 67)}...` : a)).join(" ")}`,
        )
        for (const l of shown.split(/\r?\n/).filter(Boolean))
          console.log(`    ${l.length > 220 ? `${l.slice(0, 217)}...` : l}`)
      }
      resolve({ args, text: clean, code, timedOut })
    })
  })
}
