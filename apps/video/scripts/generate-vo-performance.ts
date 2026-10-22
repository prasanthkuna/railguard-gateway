/**
 * Audio-first sparse VO master (approve before Remotion sync).
 *
 *   bun run apps/video/scripts/generate-vo-performance.ts
 *
 * Env:
 *   RAILGUARD_VO_PROVIDER=edge|qwen|elevenlabs
 *   RAILGUARD_VO_VOICE=en-US-GuyNeural
 *   RAILGUARD_USE_OLLAMA=1          — polish lines via local Ollama (LLM, not TTS)
 *   OLLAMA_HOST=http://127.0.0.1:11434
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DIRECTOR = process.env.RAILGUARD_VO_DIRECTOR
  ? resolve(process.env.RAILGUARD_VO_DIRECTOR)
  : join(ROOT, "director", "voice-performance.json")
const VO_DIR = join(ROOT, "public", "vo")
const OUT_BASENAME = process.env.RAILGUARD_VO_OUT_BASENAME ?? "vo-master"
const WORK = join(VO_DIR, `.work-${OUT_BASENAME}`)
const OUT_WAV = join(VO_DIR, `${OUT_BASENAME}.wav`)
const OUT_MP3 = join(VO_DIR, `${OUT_BASENAME}.mp3`)
const OUT_JSON = join(VO_DIR, `${OUT_BASENAME}.json`)
const GRANT_COPY = join(ROOT, "..", "..", "media", "grant", "vo-master.wav")

const PROVIDER = (process.env.RAILGUARD_VO_PROVIDER ?? "edge").toLowerCase()
const VOICE = process.env.RAILGUARD_VO_VOICE ?? "en-US-GuyNeural"
const DEFAULT_RATE = process.env.RAILGUARD_VO_RATE ?? "-6%"
const DEFAULT_PITCH = process.env.RAILGUARD_VO_PITCH ?? "-2Hz"
const USE_OLLAMA = process.env.RAILGUARD_USE_OLLAMA === "1"
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"
const QWEN_PY = join(ROOT, ".venv-vo-qwen", "Scripts", "python.exe")

type Direction = { rate?: string; pitch?: string; pauseAfterSec?: number }
type Beat = { id: string; text: string; direction?: Direction }
type Silent = { id: string; durationSec: number; note?: string }
type PerformanceFile = {
  narratorInstruct: string
  ollamaModel?: string
  beats: Beat[]
  silentBlocks?: Silent[]
  beatsAfterSilence?: Beat[]
  silentBlocksTail?: Silent[]
}

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false })
  if (r.status !== 0) throw new Error(`${cmd} failed`)
}

function ffprobeDuration(path: string): number {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { encoding: "utf8" },
  )
  return Number.parseFloat(r.stdout.trim()) || 0
}

function silenceWav(path: string, sec: number) {
  if (sec <= 0) return
  run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", String(sec), path])
}

async function ollamaPolish(text: string, instruct: string, model: string): Promise<string> {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      prompt: `Rewrite ONE spoken VO line. Output ONLY the line (no quotes, no explanation).\nVoice direction: ${instruct}\nLine: ${text}`,
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  const data = (await res.json()) as { response?: string }
  const out = data.response?.trim().split("\n")[0]?.trim()
  return out && out.length > 2 ? out : text
}

function edgeSynth(text: string, outMp3: string, dir: Direction) {
  run("edge-tts", [
    `--voice=${VOICE}`,
    `--rate=${dir.rate ?? DEFAULT_RATE}`,
    `--pitch=${dir.pitch ?? DEFAULT_PITCH}`,
    "--text",
    text,
    "--write-media",
    outMp3,
  ])
}

function qwenSynth(text: string, outWav: string, instruct: string) {
  if (!existsSync(QWEN_PY)) throw new Error("Missing .venv-vo-qwen — run bun run video:vo:install")
  process.env.RAILGUARD_VOICE_INSTRUCT = instruct
  run(QWEN_PY, [
    join(ROOT, "scripts", "tts", "qwen_voice_design.py"),
    "--text",
    text,
    "--out",
    outWav,
  ])
}

function mp3ToWav(mp3: string, wav: string) {
  run("ffmpeg", ["-y", "-i", mp3, "-ar", "48000", "-ac", "1", wav])
}

async function synthBeat(beat: Beat, instruct: string, ollamaModel: string): Promise<string> {
  let text = beat.text
  if (USE_OLLAMA) {
    text = await ollamaPolish(text, instruct, ollamaModel)
    console.log(`  [ollama] ${beat.id}: ${text}`)
  }

  const wav = join(WORK, `${beat.id}.wav`)
  if (PROVIDER === "qwen") {
    qwenSynth(text, wav, instruct)
    return wav
  }

  const mp3 = join(WORK, `${beat.id}.mp3`)
  edgeSynth(text, mp3, beat.direction ?? {})
  mp3ToWav(mp3, wav)
  return wav
}

async function main() {
  const perf = JSON.parse(readFileSync(DIRECTOR, "utf8")) as PerformanceFile
  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(WORK, { recursive: true })
  mkdirSync(VO_DIR, { recursive: true })

  const timeline: {
    id: string
    kind: "speech" | "silence"
    startSec: number
    endSec: number
    text?: string
    note?: string
  }[] = []

  const concatParts: string[] = []
  let cursor = 0

  async function appendSpeech(beat: Beat) {
    console.log(`[speech] ${beat.id}`)
    const wav = await synthBeat(beat, perf.narratorInstruct, perf.ollamaModel ?? "gemma3:4b")
    const dur = ffprobeDuration(wav)
    timeline.push({
      id: beat.id,
      kind: "speech",
      startSec: cursor,
      endSec: cursor + dur,
      text: beat.text,
    })
    concatParts.push(wav)
    cursor += dur
    const pause = beat.direction?.pauseAfterSec ?? 0
    if (pause > 0) {
      const s = join(WORK, `sil-${beat.id}.wav`)
      silenceWav(s, pause)
      concatParts.push(s)
      timeline.push({
        id: `${beat.id}_pause`,
        kind: "silence",
        startSec: cursor,
        endSec: cursor + pause,
        note: "breath",
      })
      cursor += pause
    }
  }

  function appendSilence(block: Silent) {
    console.log(`[silence] ${block.id} (${block.durationSec}s)`)
    const s = join(WORK, `${block.id}.wav`)
    silenceWav(s, block.durationSec)
    concatParts.push(s)
    timeline.push({
      id: block.id,
      kind: "silence",
      startSec: cursor,
      endSec: cursor + block.durationSec,
      note: block.note,
    })
    cursor += block.durationSec
  }

  console.log(`[vo-master] provider=${PROVIDER} voice=${VOICE} ollama=${USE_OLLAMA}`)
  for (const b of perf.beats) await appendSpeech(b)
  for (const s of perf.silentBlocks ?? []) appendSilence(s)
  for (const b of perf.beatsAfterSilence ?? []) await appendSpeech(b)
  for (const s of perf.silentBlocksTail ?? []) appendSilence(s)

  const listFile = join(WORK, "concat.txt")
  writeFileSync(
    listFile,
    concatParts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"),
  )
  const raw = join(WORK, "raw.wav")
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", raw])

  run("ffmpeg", [
    "-y",
    "-i",
    raw,
    "-af",
    "highpass=f=70,lowpass=f=16000,acompressor=threshold=-18dB:ratio=2:attack=10:release=120:makeup=1,loudnorm=I=-16:TP=-1.0:LRA=8",
    "-ar",
    "48000",
    "-ac",
    "1",
    OUT_WAV,
  ])

  run("ffmpeg", ["-y", "-i", OUT_WAV, "-c:a", "libmp3lame", "-b:a", "192k", OUT_MP3])

  const totalSec = ffprobeDuration(OUT_WAV)
  const manifest = {
    generatedAt: new Date().toISOString(),
    provider: PROVIDER,
    voice: VOICE,
    totalSec,
    fps: 30,
    totalFrames: Math.ceil(totalSec * 30),
    approved: false,
    timeline,
    note: "Set approved:true after listen; then run video:vo:sync-hero",
  }
  writeFileSync(OUT_JSON, `${JSON.stringify(manifest, null, 2)}\n`)

  if (OUT_BASENAME === "vo-master") {
    mkdirSync(dirname(GRANT_COPY), { recursive: true })
    writeFileSync(GRANT_COPY, readFileSync(OUT_WAV))
  }

  console.log(`\n[vo-master] ${OUT_WAV} (${totalSec.toFixed(2)}s)`)
  console.log(`[vo-master] preview: ${OUT_MP3}`)
  console.log(`[vo-master] ${OUT_JSON}`)
  if (OUT_BASENAME === "vo-master") console.log(`[vo-master] copy: ${GRANT_COPY}`)
  console.log("\nListen and approve before video sync.")
  rmSync(WORK, { recursive: true, force: true })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
