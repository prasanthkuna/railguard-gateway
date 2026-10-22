import type { CSSProperties, ReactNode } from "react"
import { motionTokens } from "../motion-tokens"

export const TerminalPanel: React.FC<{
  title?: string
  children: ReactNode
  accent?: string
  style?: CSSProperties
}> = ({ title, children, accent = motionTokens.colors.mint, style }) => (
  <div
    style={{
      borderRadius: 14,
      border: `1px solid ${accent}44`,
      background: "rgba(0,0,0,0.45)",
      boxShadow: `0 0 48px ${accent}18`,
      overflow: "hidden",
      maxWidth: 880,
      width: "100%",
      ...style,
    }}
  >
    {title ? (
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontFamily: motionTokens.typography.monoFamily,
          fontSize: 13,
          color: motionTokens.colors.muted,
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </div>
    ) : null}
    <div style={{ padding: "28px 32px", fontFamily: motionTokens.typography.monoFamily, fontSize: 17, lineHeight: 1.55 }}>
      {children}
    </div>
  </div>
)
