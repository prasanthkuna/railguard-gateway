import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

export const ThesisScene: React.FC = () => {
  const frame = useCurrentFrame()
  const line1 = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  const line2 = interpolate(frame, [45, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

  return (
    <SceneShell vignette={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 120 }}>
        <p
          style={{
            fontSize: 40,
            fontWeight: 500,
            opacity: line1,
            transform: `translateY(${interpolate(line1, [0, 1], [20, 0])}px)`,
          }}
        >
          Agents don&apos;t just need wallets.
        </p>
        <p
          style={{
            fontSize: 44,
            fontWeight: 700,
            marginTop: 28,
            color: motionTokens.colors.mint,
            opacity: line2,
            transform: `translateY(${interpolate(line2, [0, 1], [20, 0])}px)`,
          }}
        >
          They need financial controls.
        </p>
      </AbsoluteFill>
    </SceneShell>
  )
}
