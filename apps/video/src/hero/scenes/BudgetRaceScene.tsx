import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

/** Authorization ≠ reservation — whiteboard beat from videoplan. */
export const BudgetRaceScene: React.FC = () => {
  const frame = useCurrentFrame()
  const phase = frame < 70 ? 0 : frame < 130 ? 1 : 2
  const fade = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" })

  return (
    <SceneShell>
      <AbsoluteFill style={{ padding: "80px 96px", opacity: fade }}>
        <p style={{ fontSize: 13, letterSpacing: "0.16em", color: motionTokens.colors.muted }}>AUTHORIZATION ≠ RESERVATION</p>
        <h2 style={{ fontSize: 34, marginTop: 8, maxWidth: 900 }}>Two agents cannot spend the same budget twice.</h2>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 1100 }}>
          <div style={{ padding: 28, borderRadius: 12, border: "1px solid rgba(255,120,120,0.35)", background: "rgba(255,80,80,0.06)" }}>
            <p style={{ fontFamily: motionTokens.typography.monoFamily, color: motionTokens.colors.muted }}>policy-only</p>
            <p style={{ marginTop: 16, fontSize: 22 }}>Budget $500</p>
            <p style={{ marginTop: 12, color: motionTokens.colors.text }}>A: $400 → PASS</p>
            <p style={{ color: motionTokens.colors.text }}>B: $300 → PASS</p>
            <p style={{ marginTop: 16, color: "#ff8a8a", fontWeight: 700 }}>Total $700 💀</p>
          </div>
          <div
            style={{
              padding: 28,
              borderRadius: 12,
              border: `1px solid ${motionTokens.colors.mint}55`,
              background: "rgba(92,242,178,0.06)",
              opacity: phase >= 1 ? 1 : 0.35,
            }}
          >
            <p style={{ fontFamily: motionTokens.typography.monoFamily, color: motionTokens.colors.mint }}>railguard</p>
            <p style={{ marginTop: 16, fontSize: 22 }}>Available $500</p>
            <p style={{ marginTop: 12, color: motionTokens.colors.text }}>A: authorize → RESERVE $400</p>
            <p style={{ color: motionTokens.colors.text }}>Available $100</p>
            <p style={{ marginTop: 12, color: motionTokens.colors.text }}>B: $300 → DENY</p>
          </div>
        </div>
        {phase >= 2 ? (
          <p style={{ marginTop: 40, fontSize: 20, color: motionTokens.colors.muted, maxWidth: 820 }}>
            In financial systems, failure to receive a response is not proof that execution failed.
          </p>
        ) : null}
      </AbsoluteFill>
    </SceneShell>
  )
}
