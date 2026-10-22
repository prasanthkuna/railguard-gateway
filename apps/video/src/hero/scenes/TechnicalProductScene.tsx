import { Series } from "remotion"
import { clipFrames, TECHNICAL_TOUR_CLIP_IDS } from "../../railguard/clips"
import { ProductClip } from "../../railguard/components/ProductClip"
import { FPS } from "../fps"

const FALLBACK = 5 * FPS

export const TechnicalProductScene: React.FC = () => (
  <Series>
    {TECHNICAL_TOUR_CLIP_IDS.map((id) => (
      <Series.Sequence key={id} durationInFrames={clipFrames(id, FALLBACK)}>
        <ProductClip clipId={id} />
      </Series.Sequence>
    ))}
  </Series>
)
