import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { motionTokens } from "../motion-tokens"

export const LowerThird: React.FC<{ eyebrow: string; title: string }> = ({ eyebrow, title }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 100 } })

  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        bottom: 72,
        maxWidth: 1100,
        padding: "20px 28px",
        borderRadius: 12,
        border: `1px solid rgba(92, 242, 178, 0.35)`,
        background: "rgba(8, 10, 12, 0.82)",
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        opacity: interpolate(enter, [0, 1], [0, 1]),
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: motionTokens.colors.mint,
          marginBottom: 8,
        }}
      >
        {eyebrow}
      </p>
      <h2 style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.15, margin: 0 }}>{title}</h2>
    </div>
  )
}
