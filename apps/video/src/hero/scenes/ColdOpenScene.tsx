import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { ImpactText } from "../../railguard/components/ImpactText"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

export const ColdOpenScene: React.FC = () => {
  const frame = useCurrentFrame()
  const line2 = interpolate(frame, [50, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

  return (
    <SceneShell vignette={false}>
      <AbsoluteFill style={{ padding: 96, justifyContent: "center" }}>
        <ImpactText size={52} delay={8}>
          Giving an agent a wallet is easy.
        </ImpactText>
        <div style={{ marginTop: 28, opacity: line2 }}>
          <ImpactText size={52} color={motionTokens.colors.mint} delay={0}>
            Giving it financial authority safely is not.
          </ImpactText>
        </div>
        <p
          style={{
            marginTop: 48,
            fontSize: 18,
            color: motionTokens.colors.muted,
            maxWidth: 720,
            opacity: line2,
          }}
        >
          Arbitrum is building programmable settlement and agent-payment rails. Railguard is the execution control plane
          around that money.
        </p>
      </AbsoluteFill>
    </SceneShell>
  )
}
