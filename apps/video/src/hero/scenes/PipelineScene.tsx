import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

const STAGES = ["INTENT", "AUTHORIZE", "RESERVE", "EXECUTE", "OBSERVE", "RECONCILE", "EVIDENCE"]

export const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame()
  const activeIndex = Math.min(STAGES.length - 1, Math.floor(frame / 28))

  return (
    <SceneShell>
      <AbsoluteFill style={{ padding: "80px 96px" }}>
        <p style={{ color: motionTokens.colors.mint, letterSpacing: "0.12em", fontSize: 13 }}>RAILGUARD</p>
        <h2 style={{ fontSize: 36, marginTop: 8, marginBottom: 48 }}>Runtime control plane</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
          {STAGES.map((stage, i) => {
            const on = i <= activeIndex
            return (
              <div
                key={stage}
                style={{
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: `1px solid ${on ? "rgba(92,242,178,0.5)" : "rgba(255,255,255,0.08)"}`,
                  background: on ? "rgba(92,242,178,0.08)" : "transparent",
                  fontFamily: motionTokens.typography.monoFamily,
                  fontSize: 18,
                  color: on ? motionTokens.colors.text : motionTokens.colors.muted,
                  transform: `translateX(${on ? 0 : -8}px)`,
                }}
              >
                {stage}
              </div>
            )
          })}
        </div>
        <div
          style={{
            position: "absolute",
            right: 96,
            top: "50%",
            width: 4,
            height: interpolate(activeIndex, [0, STAGES.length], [0, 320]),
            background: `linear-gradient(180deg, ${motionTokens.colors.mint}, ${motionTokens.colors.arbitrumBlue})`,
            borderRadius: 2,
          }}
        />
      </AbsoluteFill>
    </SceneShell>
  )
}
