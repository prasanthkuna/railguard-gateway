import type { CSSProperties, ReactNode } from "react"
import { AbsoluteFill } from "remotion"
import { motionTokens } from "../motion-tokens"

export const SceneShell: React.FC<{
  children: ReactNode
  style?: CSSProperties
  vignette?: boolean
}> = ({ children, style, vignette = true }) => (
  <AbsoluteFill
    style={{
      backgroundColor: motionTokens.colors.bg,
      color: motionTokens.colors.text,
      fontFamily: motionTokens.typography.fontFamily,
      ...style,
    }}
  >
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 90% 60% at 50% -20%, rgba(92, 242, 178, 0.1), transparent 55%)`,
      }}
    />
    {children}
    {vignette ? (
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(8,10,12,0.5) 0%, transparent 35%, rgba(8,10,12,0.65) 100%)",
        }}
      />
    ) : null}
  </AbsoluteFill>
)
