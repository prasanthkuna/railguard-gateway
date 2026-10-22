import { AbsoluteFill, Audio, Series, staticFile } from "remotion"
import { FPS } from "../hero/fps"
import { AgentControlPlaneScene } from "../hero/scenes/AgentControlPlaneScene"
import { BudgetRaceScene } from "../hero/scenes/BudgetRaceScene"
import { FailureLabTableScene } from "../hero/scenes/FailureLabTableScene"
import { LifecycleSuccessScene } from "../hero/scenes/LifecycleSuccessScene"
import { LockupScene } from "../hero/scenes/LockupScene"
import { PipelineScene } from "../hero/scenes/PipelineScene"
import { ProofReceiptScene } from "../hero/scenes/ProofReceiptScene"
import { ReplayBlockScene } from "../hero/scenes/ReplayBlockScene"
import { ThesisScene } from "../hero/scenes/ThesisScene"

const S = {
  thesis: 5 * FPS,
  controlPlane: 4 * FPS,
  pipeline: 6 * FPS,
  budgetRace: 10 * FPS,
  lifecycle: 10 * FPS,
  replay: 10 * FPS,
  failureLab: 9 * FPS,
  proof: 8 * FPS,
  unknown: 6 * FPS,
  lockup: 5 * FPS,
} as const

export const ArbitrumTechnical: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence durationInFrames={S.thesis}>
        <ThesisScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.controlPlane}>
        <AgentControlPlaneScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.pipeline}>
        <PipelineScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.budgetRace}>
        <BudgetRaceScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.lifecycle}>
        <LifecycleSuccessScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.replay}>
        <ReplayBlockScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.failureLab}>
        <FailureLabTableScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.proof}>
        <ProofReceiptScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.unknown}>
        <BudgetRaceScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S.lockup}>
        <LockupScene />
      </Series.Sequence>
    </Series>
    <Audio src={staticFile("vo-hero.wav")} volume={0.88} />
  </AbsoluteFill>
)
