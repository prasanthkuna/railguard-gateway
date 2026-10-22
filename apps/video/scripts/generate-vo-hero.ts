/**
 * Pro VO: per-beat TTS + pauses + loudness normalize.
 *
 *   bun run apps/video/scripts/generate-vo-hero.ts
 *
 * Env:
 *   RAILGUARD_VO_PROVIDER=edge|elevenlabs  (default edge)
 *   RAILGUARD_VO_VOICE=en-US-EmmaMultilingualNeural
 *   RAILGUARD_VO_RATE=-12%
 *   RAILGUARD_VO_PITCH=-2Hz
 *   ELEVENLABS_API_KEY + optional ELEVENLABS_VOICE_ID
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC = join(ROOT, "public")
const TXT = join(PUBLIC, "vo-hero.txt")
const WORK = join(PUBLIC, ".vo-work")
const OUT_WAV = join(PUBLIC, "vo-hero.wav")
const OUT_VTT = join(PUBLIC, "vo-hero.vtt")

const VOICE = process.env.RAILGUARD_VO_VOICE ?? "en-US-EmmaMultilingualNeural"
const RATE = process.env.RAILGUARD_VO_RATE ?? "-12%"
const PITCH = process.env.RAILGUARD_VO_PITCH ?? "-2Hz"
const PAUSE_SEC = Number(process.env.RAILGUARD_VO_PAUSE_SEC ?? "0.55")
const PROVIDER = (process.env.RAILGUARD_VO_PROVIDER ?? "edge").toLowerCase()

/** Default: Rachel — clear narration; override with ELEVENLABS_VOICE_ID */
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"

function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false })
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`)
}

function segmentsFromScript(): string[] {
  const raw = readFileSync(TXT, "utf8")
  return raw
    .split(/\n\s*\n/)
    .map((b) =>
      b
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
}

async function elevenLabsSegment(text: string, outMp3: string) {
  const key = process.env.ELEVENLABS_API_KEY?.trim()
  if (!key) throw new Error("ELEVENLABS_API_KEY required for elevenlabs provider")

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.62,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
      },
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
  writeFileSync(outMp3, Buffer.from(await res.arrayBuffer()))
}

function edgeSegment(text: string, outMp3: string, outVtt?: string) {
  const args = [
    `--voice=${VOICE}`,
    `--rate=${RATE}`,
    `--pitch=${PITCH}`,
    "--text",
    text,
    "--write-media",
    outMp3,
  ]
  if (outVtt) args.push("--write-subtitles", outVtt)
  run("edge-tts", args)
}

async function main() {
  if (!existsSync(TXT)) throw new Error(`Missing ${TXT}`)
  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(WORK, { recursive: true })

  const segments = segmentsFromScript()
  console.log(`[vo] provider=${PROVIDER} voice=${PROVIDER === "edge" ? VOICE : ELEVEN_VOICE}`)
  console.log(`[vo] ${segments.length} beats, pause ${PAUSE_SEC}s`)

  const partWavs: string[] = []
  const vttParts: string[] = []

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i]!
    const mp3 = join(WORK, `beat-${String(i).padStart(2, "0")}.mp3`)
    const wav = join(WORK, `beat-${String(i).padStart(2, "0")}.wav`)
    const vtt = join(WORK, `beat-${String(i).padStart(2, "0")}.vtt`)

    if (PROVIDER === "elevenlabs") {
      await elevenLabsSegment(text, mp3)
    } else {
      edgeSegment(text, mp3, vtt)
      if (existsSync(vtt)) vttParts.push(readFileSync(vtt, "utf8").trim())
    }

    run("ffmpeg", ["-y", "-i", mp3, "-ar", "48000", "-ac", "1", wav])
    partWavs.push(wav)
  }

  const silenceWav = join(WORK, "silence.wav")
  run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=48000:cl=mono`,
    "-t",
    String(PAUSE_SEC),
    silenceWav,
  ])

  const listFile = join(WORK, "concat.txt")
  const lines: string[] = []
  for (let i = 0; i < partWavs.length; i++) {
    lines.push(`file '${partWavs[i]!.replace(/\\/g, "/")}'`)
    if (i < partWavs.length - 1) {
      lines.push(`file '${silenceWav.replace(/\\/g, "/")}'`)
    }
  }
  writeFileSync(listFile, lines.join("\n"))

  const rawWav = join(WORK, "concat-raw.wav")
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", rawWav])

  const polished = join(WORK, "polished.wav")
  run("ffmpeg", [
    "-y",
    "-i",
    rawWav,
    "-af",
    "highpass=f=90,lowpass=f=14000,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar",
    "48000",
    "-ac",
    "1",
    polished,
  ])

  writeFileSync(OUT_WAV, readFileSync(polished))
  if (vttParts.length) {
    writeFileSync(OUT_VTT, `${vttParts.join("\n\n")}\n`)
  }

  const dur = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", OUT_WAV],
    { encoding: "utf8" },
  )
  console.log(`[vo] wrote ${OUT_WAV} (${dur.stdout.trim()}s)`)
  rmSync(WORK, { recursive: true, force: true })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
