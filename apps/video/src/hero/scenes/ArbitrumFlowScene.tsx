import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { ImpactText } from "../../railguard/components/ImpactText"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

const NODES = ["Agent", "Payment rail", "Arbitrum"] as const

export const ArbitrumFlowScene: React.FC = () => {
  const frame = useCurrentFrame()
  const progress = interpolate(frame, [0, 75], [0, 1], { extrapolateRight: "clamp" })
  const freeze = frame > 78

  return (
    <SceneShell>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            opacity: freeze ? 0.4 : 1,
            filter: freeze ? "blur(1px)" : "none",
          }}
        >
          {NODES.map((label, i) => {
            const threshold = i / (NODES.length - 1)
            const active = progress >= threshold - 0.08
            const isArb = label === "Arbitrum"
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 32 }}>
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 16,
                    border: `2px solid ${active ? motionTokens.colors.mint : "rgba(255,255,255,0.15)"}`,
                    background: isArb && active ? motionTokens.colors.arbitrumBlue : "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: "center",
                    padding: 8,
                    color: isArb && active ? "#fff" : motionTokens.colors.text,
                  }}
                >
                  {label}
                </div>
                {i < NODES.length - 1 ? (
                  <div
                    style={{
                      width: 40,
                      height: 2,
                      background: progress > (i + 0.45) / (NODES.length - 1) ? motionTokens.colors.mint : "rgba(255,255,255,0.12)",
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 96, textAlign: "center", maxWidth: 900 }}>
          <ImpactText size={46} delay={freeze ? 5 : 22}>
            But what controls the money?
          </ImpactText>
        </div>
      </AbsoluteFill>
    </SceneShell>
  )
}
