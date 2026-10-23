/** Shared helpers for the devnet scripts. Secrets are read from files/env and never printed. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { DEVNET_RPC_URL } from "../src/constants"
import { type AttemptLedger, type SolanaAttempt, createMemoryLedger } from "../src/rail"
import { type SolanaRpc, createSolanaRpc } from "../src/rpc"
import { type SolanaSigner, signerFromSecretKey } from "../src/tx"

export function env(name: string, fallback?: string): string {
  const v = process.env[name]?.trim()
  if (v) return v
  if (fallback !== undefined) return fallback
  throw new Error(`missing env ${name}`)
}

export function devnetRpc(): SolanaRpc {
  return createSolanaRpc({ url: env("SOLANA_DEVNET_RPC_URL", DEVNET_RPC_URL) })
}

/** Solana CLI keypair JSON (array of 64 numbers). Keep it outside the repo. */
export function loadSigner(): SolanaSigner {
  const path = env("SOLANA_DEVNET_KEYPAIR_PATH")
  const bytes = Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[])
  return signerFromSecretKey(bytes)
}

export function fileLedger(): { ledger: AttemptLedger; save: () => void } {
  const path = env(
    "RAILGUARD_SOLANA_LEDGER_PATH",
    join(homedir(), ".railguard-solana", "devnet-ledger.json"),
  )
  const seed = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as SolanaAttempt[]) : []
  const ledger = createMemoryLedger(seed)
  return {
    ledger,
    save: () => {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, JSON.stringify(ledger.all(), null, 2))
    },
  }
}

export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export function writeEvidence(name: string, body: unknown): string {
  const dir = join(import.meta.dir, "..", "..", "..", "..", "evidence", "solana-devnet")
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${name}.json`)
  writeFileSync(
    file,
    `${JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}\n`,
  )
  return file
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
