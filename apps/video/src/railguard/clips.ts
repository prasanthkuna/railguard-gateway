import manifest from "../../public/clips/manifest.json"
import { railguardVideoMode } from "./video-mode"

export type ClipEntry = {
  id: string
  file: string
  durationSec: number
  frames: number
  ok?: boolean
}

export const CLIPS_MANIFEST = manifest as {
  fps: number
  clips: ClipEntry[]
}

export function clipById(id: string): ClipEntry | undefined {
  return CLIPS_MANIFEST.clips.find((c) => c.id === id)
}

export function clipFrames(id: string, fallbackFrames: number): number {
  return clipById(id)?.frames ?? fallbackFrames
}

/** HackQuest hero — public site + chain only (never show WorkOS login). */
export const SUBMISSION_HERO_CLIP_IDS = [
  "site-failure-lab",
  "site-judge-path",
  "site-proof",
  "arbiscan-tx",
] as const

/** Internal / builder cut — operator B-roll (requires authenticated recording). */
export const FULL_HERO_CLIP_IDS = [
  "site-failure-lab",
  "site-proof",
  "op-settled-proof",
  "op-executions",
  "op-create-intent",
] as const

/** Hero product montage order (default: submission). */
export const HERO_PRODUCT_CLIP_IDS =
  railguardVideoMode() === "full" ? FULL_HERO_CLIP_IDS : SUBMISSION_HERO_CLIP_IDS

/** Technical tour — submission avoids operator. */
export const SUBMISSION_TECHNICAL_TOUR_CLIP_IDS = [
  "site-judge-path",
  "site-proof",
  "site-ecosystems",
  "arbiscan-tx",
] as const

export const FULL_TECHNICAL_TOUR_CLIP_IDS = [
  "site-judge-path",
  "site-proof",
  "op-settled-proof",
  "op-create-intent",
  "site-ecosystems",
  "arbiscan-tx",
] as const

export const TECHNICAL_TOUR_CLIP_IDS =
  railguardVideoMode() === "full" ? FULL_TECHNICAL_TOUR_CLIP_IDS : SUBMISSION_TECHNICAL_TOUR_CLIP_IDS

/** Operator clip ids — must not appear in submission renders. */
export const OPERATOR_CLIP_IDS = [
  "op-executions",
  "op-create-intent",
  "op-settled-proof",
] as const
