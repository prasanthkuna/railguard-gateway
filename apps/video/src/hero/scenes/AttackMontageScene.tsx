import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

const ATTACKS = [
  { title: "REPLAY", sub: "Duplicate intent · BLOCKED", frames: 48 },
  { title: "BUDGET RACE", sub: "Available: $100 · DENIED", frames: 52 },
  { title: "DESTINATION DRIFT", sub: "Recipient mismatch · REJECTED", frames: 48 },
  { title: "CRASH RECOVERY", sub: "Observer down · RECONCILED", frames: 52 },
  { title: "PARTIAL EXECUTION", sub: "Evidence envelope · CAPTURED", frames: 40 },
]

export const AttackMontageScene: React.FC = () => {
  const frame = useCurrentFrame()
  let acc = 0
  let current = ATTACKS[0]
  for (const a of ATTACKS) {
    if (frame < acc + a.frames) {
      current = a
      break
    }
    acc += a.frames
  }
  const local = frame - acc
  const shake = Math.sin(local * 1.2) * (local < 8 ? 4 : 0)
  const flash = interpolate(local, [0, 4, 10], [0.3, 1, 0.85], { extrapolateRight: "clamp" })

  return (
    <SceneShell>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `translateX(${shake}px)`,
        }}
      >
        <p
          style={{
            fontSize: 14,
            letterSpacing: "0.2em",
            color: motionTokens.colors.muted,
            marginBottom: 24,
          }}
        >
          FAILURE LAB · SIMULATION
        </p>
        <h2
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: motionTokens.colors.mint,
            opacity: flash,
            textShadow: "0 0 40px rgba(92,242,178,0.35)",
          }}
        >
          {current.title}
        </h2>
        <p style={{ marginTop: 20, fontSize: 28, color: motionTokens.colors.text, fontFamily: motionTokens.typography.monoFamily }}>
          {current.sub}
        </p>
      </AbsoluteFill>
    </SceneShell>
  )
}
