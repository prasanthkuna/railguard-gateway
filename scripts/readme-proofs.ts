/**
 * Regenerates the proof table in README.md (between PROOFS markers) and the
 * shields.io endpoint badge at .github/badges/proofs.json from committed files
 * under evidence/. Output is deterministic: it only changes when evidence does.
 *
 *   bun run readme:proofs          # write
 *   bun run readme:proofs --check  # exit 1 if README or badge is stale
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(import.meta.dir, "..")
const README = join(ROOT, "README.md")
const BADGE = join(ROOT, ".github/badges/proofs.json")
const SITE = "https://railguard-site.vercel.app"
const REPO = "https://github.com/prasanthkuna/railguard-gateway"
const START = "<!-- PROOFS:START -->"
const END = "<!-- PROOFS:END -->"

type Row = {
  rail: string
  href?: string
  proven: string
  verified: boolean
  /** Status text when verified. Arbitrum uses "Settlement verified", never "settled". */
  okLabel: string
  link: string
  linkText: string
  date: string
}

// biome-ignore lint/suspicious/noExplicitAny: evidence JSON is loosely shaped
type Json = any

const read = (rel: string): string | null => {
  const p = join(ROOT, rel)
  return existsSync(p) ? readFileSync(p, "utf8") : null
}
const json = (rel: string): Json | null => {
  const s = read(rel)
  return s ? JSON.parse(s) : null
}
const day = (iso?: string): string => {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
const short = (h: string) => (h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h)
const units = (raw: string, decimals: number) => {
  const n = Number(raw) / 10 ** decimals
  return Number.isFinite(n) ? String(n) : raw
}
const evmConfirmed = (m: Json) => m?.ok === true && m?.settlement?.status === "CONFIRMED"

const sources: Array<() => Row | null> = [
  () => {
    const m = json("evidence/arbitrum-sepolia/manifest.json")
    if (!m) return null
    return {
      rail: "Arbitrum Sepolia",
      href: `${SITE}/proof/arbitrum-sepolia`,
      proven: `${units(m.expected.amount, 6)} USDC external-wallet transfer matched on chain (token, sender, recipient, amount)`,
      verified: evmConfirmed(m),
      okLabel: "Settlement verified",
      link: m.explorerUrl,
      linkText: short(m.txHash),
      date: day(m.generatedAt),
    }
  },
  () => {
    const md = read("evidence/arbitrum-sepolia-hook/README.md")
    if (!md) return null
    const exact = md.match(/\| Railguard\w+ \|.*exact match/g) ?? []
    const hook = md.match(/RailguardExecutionHook \| `(0x[0-9a-fA-F]{40})`/)?.[1]
    const checked = md.match(/Checked (\d{4}-\d{2}-\d{2})/)?.[1]
    return {
      rail: "Arbitrum Sepolia",
      href: `${REPO}/tree/main/evidence/arbitrum-sepolia-hook`,
      proven: `${exact.length} Railguard hook contracts deployed, source verified on Arbiscan and Sourcify`,
      verified: exact.length === 3 && Boolean(hook),
      okLabel: "Source verified",
      link: hook ? `https://sepolia.arbiscan.io/address/${hook}#code` : "",
      linkText: hook ? short(hook) : "-",
      date: day(checked),
    }
  },
  () => {
    const m = json("evidence/stellar-soroban-policy/manifest.json")
    if (!m) return null
    const rejected = Object.entries(m)
      .filter(([k]) => k.startsWith("rejections_recorded"))
      .flatMap(([, v]) => v as unknown[]).length
    return {
      rail: "Stellar Soroban",
      href: `${SITE}/proof/stellar-testnet`,
      proven: `Policy contract paid ${Number(m.intent.amount)} USDC once and rejected ${rejected} bad calls (replay, wrong recipient, overspend)`,
      verified: m.status === "CONFIRMED",
      okLabel: "CONFIRMED",
      link: `https://stellar.expert/explorer/testnet/tx/${m.transactions.execute}`,
      linkText: short(m.transactions.execute),
      date: day(m.generatedAt),
    }
  },
  () => {
    const m = json("evidence/stellar-testnet/manifest.json")
    if (!m) return null
    return {
      rail: "Stellar testnet",
      href: `${SITE}/proof/stellar-testnet`,
      proven: `${Number(m.facts.amount)} XLM payment confirmed from Horizon facts`,
      verified: m.status === "CONFIRMED" && m.facts?.successful === true,
      okLabel: "CONFIRMED",
      link: `https://stellar.expert/explorer/testnet/tx/${m.transaction_hash}`,
      linkText: short(m.transaction_hash),
      date: day(m.generatedAt),
    }
  },
  () => {
    const m = json("evidence/monad-testnet/manifest.json")
    if (!m) return null
    return {
      rail: "Monad testnet",
      href: `${SITE}/proof/monad-testnet`,
      proven: `${units(m.expected.amount, 6)} USDC transfer matched from receipt logs`,
      verified: evmConfirmed(m),
      okLabel: "CONFIRMED",
      link: m.explorerUrl,
      linkText: short(m.txHash),
      date: day(m.generatedAt),
    }
  },
  () => {
    const m = json("evidence/metal-testnet/kit11-live.json")
    if (!m) return null
    const ev: Json[] = m.result?.events ?? []
    const verifiedMandates = ev.filter(
      (e) => e.step === "MANDATE_VERIFIED" && e.outcome === "VERIFIED",
    ).length
    const refusal = ev.find((e) => e.step === "REFUSAL_RECORDED" && e.outcome === "REFUSED")
    const dupBlocked = ev.some(
      (e) => e.step === "DUPLICATE_PAYOUT_BLOCKED" && e.outcome === "BLOCKED",
    )
    return {
      rail: "Metal testnet",
      href: `${SITE}/proof/metal-testnet`,
      proven: `${verifiedMandates} agents under on-chain limits: over-cap buy refused, duplicate payout blocked`,
      verified: verifiedMandates === 3 && Boolean(refusal) && dupBlocked,
      okLabel: "CONFIRMED",
      link: refusal ? `${m.explorer}/tx/${refusal.transaction}` : "",
      linkText: refusal ? short(refusal.transaction) : "-",
      date: day(m.generatedAt),
    }
  },
  () => {
    const m = json("evidence/airwallex-sandbox/chaos-live.json")
    if (!m) return null
    return {
      rail: "Airwallex sandbox",
      href: "https://prebroadcast.vercel.app/incidents",
      proven: `Create response lost, ${m.retriesBlocked} retry blocked, exactly ${m.airwallexTransfersCreated} transfer (fake money)`,
      verified: m.label === "CONFIRMED" && m.airwallexTransfersCreated === 1,
      okLabel: "CONFIRMED",
      link: `${REPO}/blob/main/evidence/airwallex-sandbox/chaos-live.json`,
      linkText: "chaos-live.json",
      date: day(m.finishedAt),
    }
  },
]

const rows = sources.map((f) => f()).filter((r): r is Row => r !== null)
const verified = rows.filter((r) => r.verified).length

const cell = (s: string) => s.replace(/\|/g, "\\|")
const table = [
  "| Chain / rail | What was proven | Status | Tx / explorer | Date |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map((r) =>
    [
      r.href ? `[${r.rail}](${r.href})` : r.rail,
      cell(r.proven),
      r.verified ? `✅ ${r.okLabel}` : "⚠️ Not verified",
      r.link ? `[\`${r.linkText}\`](${r.link})` : "-",
      r.date,
    ].join(" | "),
  ).map((l) => `| ${l} |`),
  `| Base Sepolia | Verifier matches a live USDC transfer, re-run by CI on every push | [![Testnet Evidence](${REPO}/actions/workflows/testnet-evidence.yml/badge.svg?branch=main)](${REPO}/actions/workflows/testnet-evidence.yml) | latest run | live |`,
]

const block = [
  START,
  "<!-- Generated by scripts/readme-proofs.ts from evidence/. Do not edit by hand. -->",
  "",
  ...table,
  "",
  `<sub>${verified} of ${rows.length} committed proofs verified from files in [\`evidence/\`](evidence). Regenerated by [readme-proofs](.github/workflows/readme-proofs.yml).</sub>`,
  END,
].join("\n")

const badge = `${JSON.stringify(
  {
    schemaVersion: 1,
    label: "proofs verified",
    message: `${verified}/${rows.length}`,
    color: verified === rows.length ? "5CF2B2" : "orange",
    labelColor: "0D1115",
  },
  null,
  2,
)}\n`

const readme = readFileSync(README, "utf8")
const s = readme.indexOf(START)
const e = readme.indexOf(END)
if (s < 0 || e < s) {
  console.error(`README.md is missing ${START} ... ${END} markers`)
  process.exit(1)
}
const nextReadme = readme.slice(0, s) + block + readme.slice(e + END.length)
const prevBadge = existsSync(BADGE) ? readFileSync(BADGE, "utf8") : ""

if (process.argv.includes("--check")) {
  const stale = nextReadme !== readme || prevBadge !== badge
  console.log(stale ? "Proof table is stale. Run: bun run readme:proofs" : "Proof table is up to date.")
  process.exit(stale ? 1 : 0)
}
if (nextReadme !== readme) writeFileSync(README, nextReadme)
if (prevBadge !== badge) writeFileSync(BADGE, badge)
console.log(`${verified}/${rows.length} proofs verified. README ${nextReadme !== readme ? "updated" : "unchanged"}.`)
