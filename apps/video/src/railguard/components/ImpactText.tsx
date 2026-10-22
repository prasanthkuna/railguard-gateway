import type { CSSProperties } from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { motionTokens } from "../motion-tokens"

export const ImpactText: React.FC<{
  children: React.ReactNode
  size?: number
  color?: string
  delay?: number
  style?: CSSProperties
}> = ({
  children,
  size = 56,
  color = motionTokens.colors.text,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } })
  const y = interpolate(s, [0, 1], [48, 0])
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.08,
        letterSpacing: "-0.02em",
        color,
        transform: `translateY(${y}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
