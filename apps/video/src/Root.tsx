import { Composition } from "remotion"
import {
  ARBITRUM_HERO_DURATION_FRAMES,
  ARBITRUM_TECHNICAL_DURATION_FRAMES,
  FPS,
  HEIGHT,
  WIDTH,
} from "./constants"
import { ArbitrumHero } from "./compositions/ArbitrumHero"
import { ArbitrumTechnical } from "./compositions/ArbitrumTechnical"

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ArbitrumHero"
        component={ArbitrumHero}
        durationInFrames={ARBITRUM_HERO_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ArbitrumTechnical"
        component={ArbitrumTechnical}
        durationInFrames={ARBITRUM_TECHNICAL_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
