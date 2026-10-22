import { Series } from "remotion"
import { clipFrames, HERO_PRODUCT_CLIP_IDS } from "../../railguard/clips"
import { ProductClip } from "../../railguard/components/ProductClip"
import { FPS } from "../fps"

const FALLBACK = 4 * FPS

export const ProductDemoScene: React.FC = () => (
  <Series>
    {HERO_PRODUCT_CLIP_IDS.map((id) => (
      <Series.Sequence key={id} durationInFrames={clipFrames(id, FALLBACK)}>
        <ProductClip clipId={id} />
      </Series.Sequence>
    ))}
  </Series>
)
