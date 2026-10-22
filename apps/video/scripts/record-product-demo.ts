/**
 * Record product launch clips from director/demo-flows.json.
 * Uses puppeteer-core + Edge (Playwright recordVideo hangs on some Windows hosts).
 *
 * Run: bun run record:product
 */
import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer, { type Page } from "puppeteer-core"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const FLOWS_PATH = join(ROOT, "director", "demo-flows.json")
const CLIPS_DIR = join(ROOT, "public", "clips")
const RAW_DIR = join(CLIPS_DIR, ".raw")
const MANIFEST_PATH = join(CLIPS_DIR, "manifest.json")
const QUALITY_PATH = join(ROOT, "director", "record-quality.json")

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
]

const CAPTURE_INTERVAL_MS = 100
/** Hard stop so a stuck waitForText cannot produce multi-minute clips. */
const MAX_CHAPTER_MS = 55_000
const TEXT_TIMEOUT_MS = 18_000

type Step =
  | { goto: string }
  | { wait: number }
  | { waitForText: string }
  | { waitForUrl: string }
  | { clickTestId: string }
  | { clickText: string }
  | { scroll: number }
  | { scrollToTestId: string }
  | { scrollToId: string }

interface Chapter {
  id: string
  base: "site" | "operator" | "external"
  url?: string
  steps: Step[]
}

interface FlowFile {
  defaults: {
    viewport: { width: number; height: number }
    fps: number
    siteUrl: string
    operatorUrl: string
  }
  chapters: Chapter[]
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function findBrowser(): string {
  for (const p of BROWSERS) {
    if (existsSync(p)) return p
  }
  throw new Error("No Chrome/Edge binary found")
}

function ffprobeDuration(path: string): number {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { encoding: "utf8" },
  )
  return Number.parseFloat(r.stdout.trim()) || 0
}

function framesToMp4(framesDir: string, outputMp4: string, captureFps: number, outFps: number) {
  const pattern = join(framesDir, "f%05d.png")
  spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(captureFps),
      "-i",
      pattern,
      "-r",
      String(outFps),
      "-vf",
      "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      outputMp4,
    ],
    { stdio: "inherit" },
  )
}

async function injectCursor(page: Page) {
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("DOMContentLoaded", () => {
      if (document.getElementById("rg-recorder-cursor")) return
      const el = document.createElement("div")
      el.id = "rg-recorder-cursor"
      Object.assign(el.style, {
        position: "fixed",
        left: "0px",
        top: "0px",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        border: "2px solid rgba(92,242,178,0.95)",
        background: "rgba(8,10,12,0.35)",
        boxShadow: "0 0 12px rgba(92,242,178,0.45)",
        pointerEvents: "none",
        zIndex: "2147483647",
        transform: "translate(-50%, -50%)",
        transition: "left 0.35s ease, top 0.35s ease",
      })
      document.body.appendChild(el)
    })
  })
}

async function moveCursorTo(page: Page, x: number, y: number) {
  await page.evaluate(
    (px, py) => {
      const c = document.getElementById("rg-recorder-cursor")
      if (c) {
        c.style.left = `${px}px`
        c.style.top = `${py}px`
      }
    },
    x,
    y,
  )
  await sleep(380)
}

async function clickRipple(page: Page, x: number, y: number) {
  await page.evaluate(
    (px, py) => {
      const r = document.createElement("div")
      Object.assign(r.style, {
        position: "fixed",
        left: `${px}px`,
        top: `${py}px`,
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        border: "2px solid rgba(92,242,178,0.9)",
        transform: "translate(-50%, -50%) scale(1)",
        pointerEvents: "none",
        zIndex: "2147483646",
        transition: "transform 0.35s ease, opacity 0.35s ease",
      })
      document.body.appendChild(r)
      requestAnimationFrame(() => {
        r.style.transform = "translate(-50%, -50%) scale(4)"
        r.style.opacity = "0"
      })
      setTimeout(() => r.remove(), 400)
    },
    x,
    y,
  )
}

async function waitForText(page: Page, text: string, timeout = TEXT_TIMEOUT_MS) {
  await page.waitForFunction(
    (needle) => document.body.innerText.includes(needle),
    { timeout },
    text,
  )
}

async function smoothClickSelector(page: Page, selector: string) {
  const el = await page.waitForSelector(selector, { visible: true, timeout: TEXT_TIMEOUT_MS })
  if (!el) throw new Error(`missing ${selector}`)
  const box = await el.boundingBox()
  if (!box) throw new Error(`no box ${selector}`)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await moveCursorTo(page, x, y)
  await clickRipple(page, x, y)
  await el.click()
}

async function smoothClickText(page: Page, text: string) {
  const handle = await page.waitForFunction(
    (label) => {
      const buttons = [...document.querySelectorAll("button")]
      return buttons.find((b) => b.textContent?.trim().includes(label)) ?? null
    },
    { timeout: TEXT_TIMEOUT_MS },
    text,
  )
  const el = handle.asElement()
  if (!el) throw new Error(`button ${text}`)
  const box = await el.boundingBox()
  if (box) {
    await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2)
    await clickRipple(page, box.x + box.width / 2, box.y + box.height / 2)
  }
  await el.click()
}

function resolveBase(ch: Chapter, defaults: FlowFile["defaults"]): string {
  if (ch.base === "external") return ch.url ?? ""
  if (ch.base === "operator") return process.env.RAILGUARD_OPERATOR_URL ?? defaults.operatorUrl
  return process.env.RAILGUARD_SITE_URL ?? defaults.siteUrl
}

async function runSteps(page: Page, chapter: Chapter, baseUrl: string) {
  for (const step of chapter.steps) {
    try {
    if ("goto" in step) {
      const path = step.goto
      const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path}`
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
      await sleep(800)
    } else if ("wait" in step) {
      await sleep(step.wait)
    } else if ("waitForText" in step) {
      await waitForText(page, step.waitForText)
    } else if ("waitForUrl" in step) {
      await page.waitForFunction(
        (part) => window.location.href.includes(part),
        { timeout: 90_000 },
        step.waitForUrl,
      )
    } else if ("clickTestId" in step) {
      await smoothClickSelector(page, `[data-testid="${step.clickTestId}"]`)
    } else if ("clickText" in step) {
      await smoothClickText(page, step.clickText)
    } else if ("scroll" in step) {
      await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), step.scroll)
      await sleep(900)
    } else if ("scrollToTestId" in step) {
      await page.evaluate((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`) ?? document.getElementById(id)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, step.scrollToTestId)
      await sleep(700)
    } else if ("scrollToId" in step) {
      await page.evaluate((id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, step.scrollToId)
      await sleep(700)
    }
    } catch (e) {
      console.warn(`    step warn: ${e instanceof Error ? e.message : e}`)
    }
  }
}

async function seedOperatorRecordAuth(page: Page, operatorUrl: string) {
  const root = operatorUrl.replace(/\/$/, "")
  const token = process.env.RAILGUARD_RECORD_ACCESS_TOKEN?.trim()
  if (token) {
    const session = {
      accessToken: token,
      userID: process.env.RAILGUARD_RECORD_USER_ID || "usr_recorder",
      email: process.env.RAILGUARD_RECORD_EMAIL || "recorder@railguard.ai",
      ...(process.env.RAILGUARD_RECORD_ORG_ID
        ? { organizationID: process.env.RAILGUARD_RECORD_ORG_ID }
        : {}),
    }
    await page.goto(root, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.evaluate(
      (s) => localStorage.setItem("railguard_auth_session", JSON.stringify(s)),
      session,
    )
    console.log("    auth: WorkOS access token injected for recording")
    return
  }
  if (process.env.RAILGUARD_RECORD_DEV_AUTH === "1") {
    const orgId = process.env.RAILGUARD_RECORD_ORG_ID || "org_demo_rollout"
    await page.goto(root, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.evaluate(
      (id) => {
        localStorage.setItem(
          "railguard_identity",
          JSON.stringify({
            organizationID: id,
            userID: "usr_operator_primary",
            role: "owner",
            email: "ops@railguard.ai",
            token: "operator-token",
          }),
        )
      },
      orgId,
    )
    console.log("    auth: dev identity injected for recording")
  }
}

async function captureChapter(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  chapter: Chapter,
  defaults: FlowFile["defaults"],
  fps: number,
): Promise<{ ok: boolean; durationSec: number; note?: string }> {
  const baseUrl = resolveBase(chapter, defaults)
  const framesDir = join(RAW_DIR, chapter.id, "frames")
  rmSync(framesDir, { recursive: true, force: true })
  mkdirSync(framesDir, { recursive: true })

  const page = await browser.newPage()
  await page.setViewport({
    width: defaults.viewport.width,
    height: defaults.viewport.height,
    deviceScaleFactor: 1,
  })
  await injectCursor(page)

  let frameIndex = 0
  let capturing = true
  const chapterDeadline = Date.now() + MAX_CHAPTER_MS
  const captureLoop = (async () => {
    while (capturing && Date.now() < chapterDeadline) {
      const file = join(framesDir, `f${String(frameIndex).padStart(5, "0")}.png`)
      try {
        await page.screenshot({ path: file, type: "png" })
        frameIndex++
      } catch {
        await sleep(CAPTURE_INTERVAL_MS)
        continue
      }
      await sleep(CAPTURE_INTERVAL_MS)
    }
  })()

  const stepsPromise = (async () => {
    try {
      if (chapter.base === "external") {
        await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 120_000 })
        await sleep(1500)
      } else if (chapter.base === "operator") {
        await seedOperatorRecordAuth(page, baseUrl)
      }
      await runSteps(page, chapter, baseUrl)
      await sleep(400)
    } catch (e) {
      console.warn(`    chapter warn: ${e instanceof Error ? e.message : e}`)
    }
  })()
  await Promise.race([stepsPromise, sleep(MAX_CHAPTER_MS)])

  await sleep(600)
  capturing = false
  await captureLoop
  await page.close()

  const pngs = readdirSync(framesDir).filter((f) => f.endsWith(".png"))
  const outMp4 = join(CLIPS_DIR, `${chapter.id}.mp4`)
  if (pngs.length < 3) {
    const prev = existsSync(outMp4) ? ffprobeDuration(outMp4) : 0
    if (prev >= 2) {
      console.warn(`    kept previous ${chapter.id}.mp4 (${prev.toFixed(1)}s) — capture had too few frames`)
      return { ok: true, durationSec: prev }
    }
    return { ok: false, durationSec: 0, note: "too few frames" }
  }

  const captureFps = 1000 / CAPTURE_INTERVAL_MS
  const tmpMp4 = join(RAW_DIR, `${chapter.id}.tmp.mp4`)
  framesToMp4(framesDir, tmpMp4, captureFps, fps)
  let durationSec = ffprobeDuration(tmpMp4)
  let ok = durationSec >= 2
  if (ok) {
    writeFileSync(outMp4, readFileSync(tmpMp4))
  } else if (existsSync(outMp4)) {
    const prev = ffprobeDuration(outMp4)
    if (prev >= 2) {
      console.warn(`    kept previous ${chapter.id}.mp4 (${prev.toFixed(1)}s) — new clip too short`)
      durationSec = prev
      ok = true
    }
  } else {
    writeFileSync(outMp4, readFileSync(tmpMp4))
  }
  return { ok, durationSec, note: ok ? undefined : "clip too short" }
}

export async function runRecordProductDemo() {
  const flows = JSON.parse(readFileSync(FLOWS_PATH, "utf8")) as FlowFile
  const fps = flows.defaults.fps
  mkdirSync(CLIPS_DIR, { recursive: true })
  mkdirSync(RAW_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
      "--headless=new",
      "--disable-gpu",
    ],
  })

  const results: {
    id: string
    file: string
    durationSec: number
    frames: number
    ok: boolean
    note?: string
  }[] = []

  const submissionIds = [
    "site-failure-lab",
    "site-judge-path",
    "site-proof",
    "site-ecosystems",
    "arbiscan-tx",
  ]
  const onlyFromEnv = process.env.RECORD_CHAPTER?.split(",").map((s) => s.trim()).filter(Boolean)
  const only =
    onlyFromEnv?.length ? onlyFromEnv : process.env.RECORD_SUBMISSION === "1" ? submissionIds : undefined
  const chapters = only?.length
    ? flows.chapters.filter((c) => only.includes(c.id))
    : flows.chapters
  if (process.env.RECORD_SUBMISSION === "1") {
    console.log("[record] submission mode — site + chain only (no operator)\n")
  }

  for (const chapter of chapters) {
    console.log(`\n[record] ${chapter.id} (${chapter.base})`)
    const { ok, durationSec, note } = await captureChapter(browser, chapter, flows.defaults, fps)
    const frames = Math.max(1, Math.round(durationSec * fps))
    results.push({
      id: chapter.id,
      file: `${chapter.id}.mp4`,
      durationSec,
      frames,
      ok,
      note,
    })
    console.log(ok ? `  → ${join(CLIPS_DIR, `${chapter.id}.mp4`)} (${durationSec.toFixed(2)}s)` : `  FAIL ${note}`)
  }

  await browser.close()

  const prevQuality = existsSync(QUALITY_PATH)
    ? (JSON.parse(readFileSync(QUALITY_PATH, "utf8")) as { chapters?: typeof results }).chapters ?? []
    : []
  const mergedById = new Map<string, (typeof results)[number]>()
  for (const ch of prevQuality) mergedById.set(ch.id, ch)
  for (const ch of results) mergedById.set(ch.id, ch)
  const allChapters = [...mergedById.values()]

  const manifest = {
    generatedAt: new Date().toISOString(),
    fps,
    clips: allChapters.filter((r) => r.ok && r.durationSec > 0),
  }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

  const submission = process.env.RECORD_SUBMISSION === "1"
  const requiredIds = submission
    ? ["site-failure-lab", "site-judge-path", "site-proof", "arbiscan-tx"]
    : ["site-failure-lab", "site-proof", "op-settled-proof", "op-create-intent"]
  const requiredOk = requiredIds.every((id) => {
    const ch = mergedById.get(id)
    return ch?.ok && ch.durationSec >= 2
  })

  const quality = {
    generatedAt: manifest.generatedAt,
    pass: requiredOk,
    chapters: allChapters,
    minDurationSec: 2,
  }
  writeFileSync(QUALITY_PATH, `${JSON.stringify(quality, null, 2)}\n`)

  console.log(`\nManifest: ${MANIFEST_PATH}`)
}

const isDirectRun = import.meta.path === Bun.main
if (isDirectRun) {
  runRecordProductDemo().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
