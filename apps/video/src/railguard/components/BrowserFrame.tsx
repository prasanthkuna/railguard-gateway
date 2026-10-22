import type { ReactNode } from "react"
import { AbsoluteFill } from "remotion"
import { motionTokens } from "../motion-tokens"

export const BrowserFrame: React.FC<{
  url: string
  children: ReactNode
}> = ({ url, children }) => (
  <AbsoluteFill style={{ backgroundColor: motionTokens.colors.bg, padding: 24 }}>
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 44,
          background: "linear-gradient(180deg, #1a1f24 0%, #12161a 100%)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            marginLeft: 12,
            marginRight: 12,
            height: 28,
            borderRadius: 8,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontFamily: motionTokens.typography.monoFamily,
            fontSize: 13,
            color: motionTokens.colors.muted,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", background: "#000" }}>{children}</div>
    </div>
  </AbsoluteFill>
)
