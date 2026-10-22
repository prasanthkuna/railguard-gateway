import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { TerminalPanel } from "../../railguard/components/TerminalPanel"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

const STEPS = [
  { at: 0, lines: ["INTENT CREATED", "Pay 25 USDC → service X", "max budget 100 USDC"] },
  { at: 55, lines: ["✓ destination", "✓ budget", "✓ policy", "✓ nonce", "AUTHORIZED"] },
  { at: 110, lines: ["25 USDC RESERVED", "available budget: 75 USDC"] },
  { at: 165, lines: ["EXECUTE → ARBITRUM → CONFIRMED"] },
  { at: 220, lines: ["Intent ✓", "Policy ✓", "Reservation ✓", "Execution ✓", "Reconciliation ✓", "Evidence hash · tx hash"] },
] as const

type Step = (typeof STEPS)[number]

export const LifecycleSuccessScene: React.FC = () => {
  const frame = useCurrentFrame()
  let step: Step = STEPS[0]
  for (const s of STEPS) {
    if (frame >= s.at) step = s
  }
  const local = frame - step.at
  const opacity = interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" })

  return (
    <SceneShell>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
        <p style={{ position: "absolute", top: 72, left: 96, fontSize: 13, letterSpacing: "0.16em", color: motionTokens.colors.muted }}>
          HAPPY PATH · TESTNET LIFECYCLE
        </p>
        <TerminalPanel title="railguard · financial execution control plane" accent={motionTokens.colors.mint}>
          <div style={{ opacity }}>
            {step.lines.map((line) => (
              <p
                key={line}
                style={{
                  margin: "6px 0",
                  color: line.startsWith("✓") || line.includes("CONFIRMED")
                    ? motionTokens.colors.mint
                    : line.includes("RESERVED")
                      ? motionTokens.colors.arbitrumBlue
                      : motionTokens.colors.text,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </TerminalPanel>
      </AbsoluteFill>
    </SceneShell>
  )
}
