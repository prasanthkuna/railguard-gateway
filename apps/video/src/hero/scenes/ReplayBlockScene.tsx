import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { ImpactText } from "../../railguard/components/ImpactText"
import { TerminalPanel } from "../../railguard/components/TerminalPanel"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

export const ReplayBlockScene: React.FC = () => {
  const frame = useCurrentFrame()
  const showIntent = frame >= 25
  const showBlock = frame >= 75
  const pulse = interpolate(frame, [75, 90, 105], [1, 1.04, 1], { extrapolateRight: "clamp" })

  return (
    <SceneShell>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 96 }}>
        <p style={{ position: "absolute", top: 72, fontSize: 13, letterSpacing: "0.2em", color: motionTokens.colors.muted }}>
          KILLER MOVE · SAME INTENT AGAIN
        </p>
        {showIntent && !showBlock ? (
          <TerminalPanel title="agent retry" accent={motionTokens.colors.muted} style={{ maxWidth: 720 }}>
            <p style={{ color: motionTokens.colors.text }}>Resubmit intent: Pay 25 USDC → service X</p>
            <p style={{ marginTop: 12, color: motionTokens.colors.muted }}>idempotency key: INV-9381</p>
          </TerminalPanel>
        ) : null}
        {showBlock ? (
          <div style={{ transform: `scale(${pulse})`, textAlign: "center" }}>
            <ImpactText size={52} color="#ff6b6b" delay={0}>
              REPLAY DETECTED
            </ImpactText>
            <ImpactText size={64} color={motionTokens.colors.text} delay={12}>
              BLOCKED
            </ImpactText>
            <p
              style={{
                marginTop: 32,
                fontFamily: motionTokens.typography.monoFamily,
                fontSize: 26,
                color: motionTokens.colors.mint,
              }}
            >
              0 USDC moved
            </p>
            <p style={{ marginTop: 16, fontSize: 18, color: motionTokens.colors.muted }}>INTENT_ALREADY_CONSUMED</p>
          </div>
        ) : null}
      </AbsoluteFill>
    </SceneShell>
  )
}
