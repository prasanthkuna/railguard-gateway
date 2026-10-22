import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

const STACK = ["AI Agent", "Intent", "RAILGUARD", "Arbitrum"] as const

export const AgentControlPlaneScene: React.FC = () => {
  const frame = useCurrentFrame()
  const progress = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" })

  return (
    <SceneShell>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          {STACK.map((label, i) => {
            const threshold = i / STACK.length
            const visible = progress > threshold
            const isRail = label === "RAILGUARD"
            const isArb = label === "Arbitrum"
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    opacity: visible ? 1 : 0.15,
                    transform: `translateY(${visible ? 0 : 12}px)`,
                    padding: isRail ? "18px 48px" : "12px 32px",
                    borderRadius: 12,
                    border: `1px solid ${isRail ? motionTokens.colors.mint : "rgba(255,255,255,0.15)"}`,
                    background: isRail
                      ? "rgba(92,242,178,0.12)"
                      : isArb
                        ? motionTokens.colors.arbitrumBlue
                        : "rgba(255,255,255,0.04)",
                    fontFamily: motionTokens.typography.monoFamily,
                    fontSize: isRail ? 22 : 18,
                    fontWeight: isRail ? 700 : 500,
                    color: isArb ? "#fff" : motionTokens.colors.text,
                    minWidth: 280,
                    textAlign: "center",
                  }}
                >
                  {label}
                  {isRail ? (
                    <p style={{ marginTop: 8, fontSize: 12, fontWeight: 400, color: motionTokens.colors.muted }}>
                      Authorize · Reserve · Execute · Observe · Reconcile · Evidence
                    </p>
                  ) : null}
                </div>
                {i < STACK.length - 1 ? (
                  <div
                    style={{
                      width: 2,
                      height: 28,
                      background: visible ? motionTokens.colors.mint : "rgba(255,255,255,0.1)",
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
        <p style={{ marginTop: 48, fontSize: 18, color: motionTokens.colors.muted, maxWidth: 640, textAlign: "center" }}>
          Arbitrum moves programmable money. Railguard controls autonomous money movement.
        </p>
      </AbsoluteFill>
    </SceneShell>
  )
}
