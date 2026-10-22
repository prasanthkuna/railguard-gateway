import { FPS } from "../hero/fps"
import { clipFrames, HERO_PRODUCT_CLIP_IDS, TECHNICAL_TOUR_CLIP_IDS } from "./clips"

const HERO_FALLBACK = 4 * FPS
const TECH_FALLBACK = 5 * FPS

export function heroProductClipDurationFrames(): number {
  return HERO_PRODUCT_CLIP_IDS.reduce((sum, id) => sum + clipFrames(id, HERO_FALLBACK), 0)
}

export function technicalProductClipDurationFrames(): number {
  return TECHNICAL_TOUR_CLIP_IDS.reduce((sum, id) => sum + clipFrames(id, TECH_FALLBACK), 0)
}
