import { heroTotalFrames } from "./hero/timeline"
import { FPS } from "./hero/fps"

export { FPS }

export const WIDTH = 1920
export const HEIGHT = 1080

export const ARBITRUM_HERO_DURATION_FRAMES = heroTotalFrames()

/** Deep cut — Remotion-only; keep in sync with ArbitrumTechnical.tsx */
export const ARBITRUM_TECHNICAL_DURATION_FRAMES = 73 * FPS
