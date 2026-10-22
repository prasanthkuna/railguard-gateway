import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { ImpactText } from "../../railguard/components/ImpactText"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

export const LockupScene: React.FC = () => {
  const frame = useCurrentFrame()
  const fade = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" })

  return (
    <SceneShell vignette={false}>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          opacity: fade,
          padding: 96,
        }}
      >
        <ImpactText size={52} delay={10}>
          Failure-safe money movement for agents.
        </ImpactText>
        <p
          style={{
            marginTop: 36,
            fontSize: 22,
            color: motionTokens.colors.arbitrumBlue,
            fontWeight: 600,
          }}
        >
          Built on Arbitrum
        </p>
        <p
          style={{
            marginTop: 28,
            fontFamily: motionTokens.typography.monoFamily,
            fontSize: 20,
            color: motionTokens.colors.mint,
          }}
        >
          railguard-site.vercel.app/proof/arbitrum-sepolia
        </p>
      </AbsoluteFill>
    </SceneShell>
  )
}
