import { AbsoluteFill, Audio, Series, staticFile, useVideoConfig } from "remotion"
import { HERO_BEATS } from "../hero/timeline"
import {
  ArbitrumProofChapter,
  AuthorityChapter,
  ClosingChapter,
  ControlPlaneChapter,
  FailureLabChapter,
} from "../hero/pro/ProHero"

export const ArbitrumHero: React.FC = () => {
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: "#06090b" }}>
      <Series>
        <Series.Sequence name="Authority" durationInFrames={HERO_BEATS.authority} premountFor={fps}>
          <AuthorityChapter />
        </Series.Sequence>
        <Series.Sequence name="Control plane" durationInFrames={HERO_BEATS.controlPlane} premountFor={fps}>
          <ControlPlaneChapter />
        </Series.Sequence>
        <Series.Sequence name="Failure Lab" durationInFrames={HERO_BEATS.failureLab} premountFor={fps}>
          <FailureLabChapter />
        </Series.Sequence>
        <Series.Sequence name="Arbitrum proof" durationInFrames={HERO_BEATS.arbitrumProof} premountFor={fps}>
          <ArbitrumProofChapter />
        </Series.Sequence>
        <Series.Sequence name="Close" durationInFrames={HERO_BEATS.close} premountFor={fps}>
          <ClosingChapter />
        </Series.Sequence>
      </Series>
      <Audio name="Ambient score" src={staticFile("audio/railguard-bed.wav")} volume={0.9} />
      <Audio name="Andrew narration" src={staticFile("vo-hero.wav")} volume={1} />
    </AbsoluteFill>
  )
}

