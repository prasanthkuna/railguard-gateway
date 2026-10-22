import { AbsoluteFill } from "remotion"
import { ImpactText } from "../../railguard/components/ImpactText"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

export const ReplayDenyScene: React.FC = () => (
  <SceneShell>
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily: motionTokens.typography.monoFamily,
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255,80,80,0.5)",
          background: "rgba(255,80,80,0.08)",
          borderRadius: 16,
          padding: "48px 64px",
          maxWidth: 900,
          textAlign: "center",
        }}
      >
        <ImpactText size={42} color="#ff6b6b" delay={8}>
          EXECUTION REJECTED
        </ImpactText>
        <p style={{ marginTop: 28, fontSize: 20, color: motionTokens.colors.muted }}>reason:</p>
        <p style={{ marginTop: 8, fontSize: 26, color: motionTokens.colors.text }}>INTENT_ALREADY_CONSUMED</p>
      </div>
    </AbsoluteFill>
  </SceneShell>
)
