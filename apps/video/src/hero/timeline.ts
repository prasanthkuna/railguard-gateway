import { FPS } from "./fps"

/** Andrew V2 master: 84.18s / 2526 frames at 30fps. */
export const HERO_BEATS = {
  authority: 212,
  controlPlane: 623,
  failureLab: 683,
  arbitrumProof: 737,
  close: 271,
} as const

export const HERO_TOTAL_FRAMES = Math.round(84.18 * FPS)

export function heroTotalFrames(): number {
  return Object.values(HERO_BEATS).reduce((total, frames) => total + frames, 0)
}

