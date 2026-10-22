/**
 * Capture marketing + operator UI for Remotion product layers.
 * Run: bun run capture:product (from repo root)
 */
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "product")
const BASE = process.env.RAILGUARD_SITE_URL ?? "https://railguard-site.vercel.app"

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
]

type Shot = { name: string; path: string; waitMs: number; external?: boolean; fullPage?: boolean }

const SHOTS: Shot[] = [
  { name: "home-hero", path: "/", waitMs: 4000 },
  { name: "failure-lab", path: "/attack", waitMs: 3500 },
  { name: "proof-arbitrum-sepolia", path: "/proof/arbitrum-sepolia", waitMs: 2500, fullPage: true },
  { name: "ecosystems-arbitrum", path: "/ecosystems/arbitrum", waitMs: 3000 },
  {
    name: "arbiscan-tx",
    path: "https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d",
    waitMs: 4000,
    external: true,
    fullPage: true,
  },
]

function findBrowser(): string {
  for (const p of BROWSERS) {
    if (existsSync(p)) return p
  }
  throw new Error("No Chrome/Edge binary found")
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1920,1080"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 })

  for (const shot of SHOTS) {
    const url = shot.external ? shot.path : `${BASE}${shot.path}`
    console.log(`Capturing ${shot.name} <- ${url}`)
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 })
    await sleep(shot.waitMs)
    await page.screenshot({
      path: join(OUT_DIR, `${shot.name}.png`),
      fullPage: shot.fullPage ?? false,
    })
  }

  await browser.close()
  console.log(`Done -> ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
