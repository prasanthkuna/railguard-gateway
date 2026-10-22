import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

const ROWS = [
  { name: "REPLAY", outcome: "BLOCKED", blocked: true },
  { name: "BUDGET RACE", outcome: "BLOCKED", blocked: true },
  { name: "DESTINATION DRIFT", outcome: "BLOCKED", blocked: true },
  { name: "STALE INTENT", outcome: "BLOCKED", blocked: true },
  { name: "EXECUTION CRASH", outcome: "RECOVERED", blocked: false },
  { name: "PARTIAL EXECUTION", outcome: "RECONCILED", blocked: false },
  { name: "UNKNOWN RESULT", outcome: "RESOLVED", blocked: false },
  { name: "OBSERVER TIMEOUT", outcome: "RECONCILED", blocked: false },
] as const

const ROW_FRAMES = 32

export const FailureLabTableScene: React.FC = () => {
  const frame = useCurrentFrame()
  const visibleCount = Math.min(ROWS.length, Math.floor(frame / ROW_FRAMES) + 1)

  return (
    <SceneShell>
      <AbsoluteFill style={{ padding: "72px 96px" }}>
        <p style={{ fontSize: 13, letterSpacing: "0.18em", color: motionTokens.colors.muted }}>FAILURE LAB · SIMULATION</p>
        <h2 style={{ fontSize: 36, marginTop: 8, marginBottom: 36 }}>Some failures block. Some must reconcile.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 960 }}>
          {ROWS.slice(0, visibleCount).map((row, i) => {
            const local = frame - i * ROW_FRAMES
            const opacity = interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" })
            const x = interpolate(local, [0, 12], [-24, 0], { extrapolateRight: "clamp" })
            const color = row.blocked ? "#ff8a8a" : motionTokens.colors.mint
            return (
              <div
                key={row.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  padding: "14px 22px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  opacity,
                  transform: `translateX(${x}px)`,
                  fontFamily: motionTokens.typography.monoFamily,
                }}
              >
                <span style={{ fontSize: 20, color: motionTokens.colors.text }}>{row.name}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color }}>{row.outcome}</span>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </SceneShell>
  )
}
