import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { ARBITRUM_SEPOLIA_EVIDENCE } from "../../railguard/evidence"
import { TerminalPanel } from "../../railguard/components/TerminalPanel"
import { SceneShell } from "../../railguard/components/SceneShell"
import { motionTokens } from "../../railguard/motion-tokens"

export const ProofReceiptScene: React.FC = () => {
  const frame = useCurrentFrame()
  const fade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" })
  const e = ARBITRUM_SEPOLIA_EVIDENCE

  return (
    <SceneShell vignette={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80, opacity: fade }}>
        <p style={{ position: "absolute", top: 72, fontSize: 13, letterSpacing: "0.16em", color: motionTokens.colors.muted }}>
          REAL TESTNET PROOF · NO LOGIN
        </p>
        <TerminalPanel title={e.publicProofUrl.replace("https://", "")} accent={motionTokens.colors.arbitrumBlue}>
          <p style={{ color: motionTokens.colors.mint, fontSize: 22, fontWeight: 700 }}>{e.settlementStatus}</p>
          <p style={{ marginTop: 16, color: motionTokens.colors.text }}>
            {e.amountLabel} · {e.network}
          </p>
          <p style={{ marginTop: 12, color: motionTokens.colors.muted }}>{e.executionId}</p>
          <p style={{ marginTop: 20, color: motionTokens.colors.arbitrumBlue }}>{e.txHashShort}</p>
          <p style={{ marginTop: 24, fontSize: 14, color: motionTokens.colors.muted }}>
            intent → policy → reservation → execution → reconciliation → evidence
          </p>
        </TerminalPanel>
      </AbsoluteFill>
    </SceneShell>
  )
}
