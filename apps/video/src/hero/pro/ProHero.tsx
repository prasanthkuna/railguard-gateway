import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono"
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope"
import type { CSSProperties, ReactNode } from "react"
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion"
import { ARBITRUM_SEPOLIA_EVIDENCE } from "../../railguard/evidence"

const { fontFamily: sans } = loadManrope("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
})
const { fontFamily: mono } = loadJetBrainsMono("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
})

const C = {
  bg: "#06090b",
  panel: "#0d1318",
  panel2: "#111920",
  ink: "#f5f7f8",
  muted: "#96a2ad",
  line: "rgba(170, 197, 211, 0.16)",
  mint: "#5cf2b2",
  mintDim: "rgba(92, 242, 178, 0.12)",
  red: "#ff6f74",
  blue: "#2d7ff9",
  blueDim: "rgba(45, 127, 249, 0.16)",
} as const

const ease = Easing.bezier(0.16, 1, 0.3, 1)

const reveal = (frame: number, start = 0, duration = 18) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })

const fadeWindow = (frame: number, start: number, hold: number, fade = 16) =>
  interpolate(frame, [start, start + fade, hold - fade, hold], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })

const Stage: React.FC<{
  children: ReactNode
  chapter: string
  index: string
  blue?: boolean
  style?: CSSProperties
}> = ({ children, chapter, index, blue = false, style }) => (
  <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.bg, color: C.ink, fontFamily: sans, ...style }}>
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(150,180,195,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(150,180,195,.045) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom, black, transparent 82%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: blue
          ? "radial-gradient(ellipse 62% 66% at 78% 42%, rgba(45,127,249,.2), transparent 64%)"
          : "radial-gradient(ellipse 58% 64% at 20% 28%, rgba(92,242,178,.105), transparent 66%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 50,
        left: 104,
        right: 104,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 20,
        fontFamily: mono,
        fontSize: 16,
        letterSpacing: "0.12em",
        color: C.muted,
      }}
    >
      <span>{index} / {chapter.toUpperCase()}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12, color: blue ? "#71a8ff" : C.mint }}>
        <Img src={staticFile("brand/railguard-icon.svg")} style={{ width: 28, height: 28 }} />
        RAILGUARD · ARBITRUM
      </span>
    </div>
    {children}
    <div style={{ position: "absolute", left: 104, right: 104, bottom: 42, height: 1, backgroundColor: C.line, zIndex: 20 }} />
  </AbsoluteFill>
)

const Eyebrow: React.FC<{ children: ReactNode; color?: string }> = ({ children, color = C.mint }) => (
  <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 600, letterSpacing: "0.16em", color }}>{children}</div>
)

const Pill: React.FC<{ children: ReactNode; active?: boolean; color?: string }> = ({ children, active = false, color = C.mint }) => (
  <div
    style={{
      padding: "12px 18px",
      borderRadius: 999,
      border: `1px solid ${active ? color : C.line}`,
      backgroundColor: active ? `${color}1c` : "rgba(255,255,255,.025)",
      color: active ? color : C.muted,
      fontFamily: mono,
      fontSize: 17,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
)

const RailguardMark: React.FC<{ size?: number }> = ({ size = 58 }) => (
  <Img
    src={staticFile("brand/railguard-icon.svg")}
    style={{ width: size, height: size, filter: "drop-shadow(0 0 22px rgba(92,242,178,.22))" }}
  />
)

export const AuthorityChapter: React.FC = () => {
  const frame = useCurrentFrame()
  const line = reveal(frame, 10, 72)
  const boundary = reveal(frame, 92, 22)
  const first = reveal(frame, 4, 15)
  const second = reveal(frame, 38, 18)

  return (
    <Stage chapter="The signing boundary" index="01">
      <AbsoluteFill style={{ padding: "138px 104px 96px", justifyContent: "center" }}>
        <div style={{ maxWidth: 1480, opacity: first, translate: `0 ${36 - first * 36}px` }}>
          <Eyebrow>AUTONOMOUS MONEY · REAL CONSEQUENCES</Eyebrow>
          <h1 style={{ margin: "30px 0 0", fontSize: 94, lineHeight: 1.02, letterSpacing: "-0.055em", fontWeight: 700 }}>
            Giving an agent a wallet is easy.
          </h1>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: 94,
              lineHeight: 1.02,
              letterSpacing: "-0.055em",
              fontWeight: 700,
              color: C.mint,
              opacity: second,
              translate: `0 ${28 - second * 28}px`,
            }}
          >
            Authority safely is not.
          </h1>
        </div>
        <div style={{ position: "absolute", left: 108, right: 108, bottom: 126, height: 104 }}>
          <div style={{ position: "absolute", left: 36, right: 36, top: 50, height: 2, backgroundColor: C.line }} />
          <div style={{ position: "absolute", left: 36, top: 50, width: `${line * 88}%`, height: 2, background: `linear-gradient(90deg, ${C.mint}, ${C.blue})`, boxShadow: `0 0 18px ${C.mint}` }} />
          <div style={{ position: "absolute", left: 0, top: 20 }}><Pill active>AGENT INTENT · 7,500 USDC</Pill></div>
          <div style={{ position: "absolute", right: 0, top: 20 }}><Pill>SIGN</Pill></div>
          <div
            style={{
              position: "absolute",
              left: "72%",
              top: 4,
              width: 210,
              height: 92,
              border: `2px solid ${C.mint}`,
              borderRadius: 18,
              opacity: boundary,
              scale: 0.84 + boundary * 0.16,
              boxShadow: "0 0 70px rgba(92,242,178,.16)",
              display: "grid",
              placeItems: "center",
              backgroundColor: "rgba(6,9,11,.88)",
              fontFamily: mono,
              fontSize: 16,
              color: C.mint,
              letterSpacing: ".1em",
            }}
          >
            PRE-SIGN GATE
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  )
}

const flowNodes = ["AGENT", "INTENT", "RAILGUARD", "WALLET", "ARBITRUM"] as const
const constraints = ["NETWORK", "TOKEN", "RECIPIENT", "AMOUNT", "BUDGET"] as const
const lifecycle = ["RESERVE", "BROADCAST", "OBSERVE", "SETTLE", "EVIDENCE"] as const

export const ControlPlaneChapter: React.FC = () => {
  const frame = useCurrentFrame()
  const phase1 = fadeWindow(frame, 0, 228, 18)
  const phase2 = fadeWindow(frame, 210, 444, 18)
  const phase3 = reveal(frame, 426, 18)

  return (
    <Stage chapter="Control plane" index="02">
      <AbsoluteFill style={{ padding: "150px 104px 96px" }}>
        <div style={{ opacity: phase1 }}>
          <Eyebrow>THE CONTROL BOUNDARY</Eyebrow>
          <h2 style={{ margin: "24px 0 0", fontSize: 70, lineHeight: 1.05, letterSpacing: "-0.045em", maxWidth: 1080 }}>
            Between intent and the wallet.
          </h2>
          <div style={{ marginTop: 118, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            {flowNodes.map((node, i) => {
              const on = reveal(frame, 28 + i * 22, 14)
              const rail = node === "RAILGUARD"
              const arb = node === "ARBITRUM"
              return (
                <div key={node} style={{ display: "flex", alignItems: "center", gap: 14, flex: rail ? 1.25 : 1 }}>
                  <div
                    style={{
                      width: "100%",
                      height: rail ? 138 : 112,
                      borderRadius: 22,
                      border: `1px solid ${rail ? C.mint : arb ? C.blue : C.line}`,
                      backgroundColor: rail ? C.mintDim : arb ? C.blueDim : C.panel,
                      display: "grid",
                      placeItems: "center",
                      opacity: 0.15 + on * 0.85,
                      translate: `0 ${20 - on * 20}px`,
                      fontFamily: mono,
                      fontSize: rail ? 24 : 20,
                      fontWeight: 700,
                      color: rail ? C.mint : arb ? "#86b5ff" : C.ink,
                      boxShadow: rail ? "0 0 74px rgba(92,242,178,.11)" : undefined,
                    }}
                  >
                    {node}
                  </div>
                  {i < flowNodes.length - 1 ? <div style={{ width: 25, height: 2, backgroundColor: i < 3 ? C.mint : C.blue, opacity: on, flexShrink: 0 }} /> : null}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ position: "absolute", inset: "150px 104px 96px", opacity: phase2 }}>
          <Eyebrow>BOUND BEFORE SIGNING</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 88, alignItems: "center", height: 760 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 68, lineHeight: 1.04, letterSpacing: "-0.045em" }}>Authorization becomes a precise envelope.</h2>
              <p style={{ margin: "30px 0 0", fontSize: 26, lineHeight: 1.55, color: C.muted, maxWidth: 690 }}>
                No generic wallet permission. One bounded action with explicit economic limits.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {constraints.map((item, i) => {
                const on = reveal(frame, 235 + i * 28, 14)
                return (
                  <div key={item} style={{ display: "grid", gridTemplateColumns: "190px 1fr auto", alignItems: "center", padding: "22px 26px", borderRadius: 16, border: `1px solid ${on > 0.5 ? "rgba(92,242,178,.4)" : C.line}`, backgroundColor: C.panel, opacity: 0.16 + on * 0.84, translate: `${28 - on * 28}px 0`, fontFamily: mono, fontSize: 19 }}>
                    <span style={{ color: C.muted }}>{item}</span>
                    <span>{["421614", "USDC", "0x8c7e…4233", "0.01", "POLICY LIMIT"][i]}</span>
                    <span style={{ color: C.mint }}>BOUND ✓</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", inset: "150px 104px 96px", opacity: phase3 }}>
          <Eyebrow>STATE SURVIVES THE TRANSACTION</Eyebrow>
          <h2 style={{ margin: "24px 0 0", fontSize: 66, lineHeight: 1.04, letterSpacing: "-0.045em" }}>Reserve. Observe. Reconcile. Prove.</h2>
          <div style={{ marginTop: 122, position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "absolute", left: 70, right: 70, top: 61, height: 3, backgroundColor: C.line }} />
            {lifecycle.map((item, i) => {
              const on = reveal(frame, 452 + i * 28, 16)
              return (
                <div key={item} style={{ width: 286, position: "relative", zIndex: 2, textAlign: "center", opacity: 0.2 + on * 0.8 }}>
                  <div style={{ width: 122, height: 122, margin: "0 auto", borderRadius: 999, border: `2px solid ${on > 0.5 ? C.mint : C.line}`, backgroundColor: C.panel, display: "grid", placeItems: "center", color: C.mint, fontFamily: mono, fontSize: 29, boxShadow: on > 0.5 ? "0 0 45px rgba(92,242,178,.12)" : undefined }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ marginTop: 28, fontFamily: mono, fontSize: 19, color: on > 0.5 ? C.ink : C.muted }}>{item}</div>
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  )
}

const failures = [
  ["APF-001", "REPLAY"],
  ["APF-002", "BUDGET RACE"],
  ["APF-003", "CRASH AFTER BROADCAST"],
  ["APF-004", "SETTLEMENT MISMATCH"],
  ["APF-005", "STALE AUTH"],
  ["APF-006", "POLICY BYPASS"],
] as const

export const FailureLabChapter: React.FC = () => {
  const frame = useCurrentFrame()
  const lab = fadeWindow(frame, 0, 324, 18)
  const block = fadeWindow(frame, 306, 492, 18)
  const reconcile = reveal(frame, 474, 18)

  return (
    <Stage chapter="Failure Lab" index="03">
      <AbsoluteFill style={{ padding: "136px 104px 92px" }}>
        <div style={{ opacity: lab }}>
          <div style={{ position: "absolute", inset: "126px 70px 76px", borderRadius: 28, overflow: "hidden", border: `1px solid ${C.line}`, backgroundColor: C.panel, boxShadow: "0 40px 120px rgba(0,0,0,.45)" }}>
            <Img src={staticFile("product/failure-lab.png")} style={{ width: "100%", height: "100%", objectFit: "cover", scale: 1.17, translate: "0 20px", opacity: 0.48 }} />
            <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(6,9,11,.98) 0%, rgba(6,9,11,.84) 38%, rgba(6,9,11,.18) 72%)" }} />
          </div>
          <div style={{ position: "relative", zIndex: 3, width: 760 }}>
            <Eyebrow>WORKING PRODUCT · CLIENT-SIDE SIMULATION</Eyebrow>
            <h2 style={{ margin: "22px 0 0", fontSize: 68, lineHeight: 1.04, letterSpacing: "-0.045em" }}>Six ways agent payments fail.</h2>
            <div style={{ marginTop: 42, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {failures.map(([id, name], i) => {
                const on = reveal(frame, 56 + i * 27, 13)
                return (
                  <div key={id} style={{ padding: "17px 18px", borderRadius: 13, border: `1px solid ${on > 0.5 ? "rgba(255,111,116,.5)" : C.line}`, backgroundColor: on > 0.5 ? "rgba(255,111,116,.09)" : "rgba(13,19,24,.8)", opacity: 0.18 + on * 0.82, translate: `${18 - on * 18}px 0` }}>
                    <div style={{ fontFamily: mono, fontSize: 14, color: C.red }}>{id}</div>
                    <div style={{ marginTop: 6, fontFamily: mono, fontSize: 16, fontWeight: 700 }}>{name}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", inset: "136px 104px 92px", opacity: block, display: "grid", gridTemplateColumns: "1fr 0.82fr", alignItems: "center", gap: 80 }}>
          <div>
            <Eyebrow color={C.red}>DETERMINISTIC FAILURE · PRE-BROADCAST</Eyebrow>
            <h2 style={{ margin: "24px 0 0", fontSize: 78, lineHeight: 0.98, letterSpacing: "-0.05em" }}>Unsafe intent.</h2>
            <h2 style={{ margin: "8px 0 0", fontSize: 78, lineHeight: 0.98, letterSpacing: "-0.05em", color: C.red }}>Blocked.</h2>
          </div>
          <div style={{ border: "1px solid rgba(255,111,116,.42)", backgroundColor: "rgba(255,111,116,.07)", borderRadius: 26, padding: 48, textAlign: "center", boxShadow: "0 0 90px rgba(255,111,116,.09)" }}>
            <div style={{ fontFamily: mono, fontSize: 18, color: C.muted }}>REPLAY · INTENT_ALREADY_CONSUMED</div>
            <div style={{ marginTop: 34, fontSize: 112, fontWeight: 800, letterSpacing: "-0.07em" }}>0</div>
            <div style={{ fontFamily: mono, fontSize: 24, color: C.mint }}>USDC MOVED</div>
          </div>
        </div>

        <div style={{ position: "absolute", inset: "136px 104px 92px", opacity: reconcile }}>
          <Eyebrow>FAIL CLOSED · RECOVER OPEN STATE</Eyebrow>
          <h2 style={{ margin: "22px 0 0", fontSize: 64, lineHeight: 1.05, letterSpacing: "-0.045em" }}>Block what is unsafe. Reconcile what is uncertain.</h2>
          <div style={{ marginTop: 86, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            <StateLane label="BEFORE BROADCAST" steps={["POLICY FAIL", "BLOCKED", "0 MOVED"]} color={C.red} progress={reveal(frame, 502, 55)} />
            <StateLane label="AFTER BROADCAST" steps={["UNKNOWN", "OBSERVE", "RECONCILED"]} color={C.mint} progress={reveal(frame, 544, 78)} />
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  )
}

const StateLane: React.FC<{ label: string; steps: string[]; color: string; progress: number }> = ({ label, steps, color, progress }) => (
  <div style={{ border: `1px solid ${C.line}`, backgroundColor: C.panel, borderRadius: 24, padding: 34 }}>
    <div style={{ fontFamily: mono, fontSize: 15, letterSpacing: ".13em", color }}>{label}</div>
    <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 14 }}>
      {steps.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center", gap: 14, flex: i === steps.length - 1 ? 0 : 1 }}>
          <div style={{ padding: "18px 20px", borderRadius: 12, border: `1px solid ${progress > i / 3 ? color : C.line}`, color: progress > i / 3 ? color : C.muted, fontFamily: mono, fontSize: 16, whiteSpace: "nowrap" }}>{step}</div>
          {i < steps.length - 1 ? <div style={{ height: 2, flex: 1, minWidth: 24, backgroundColor: progress > (i + 0.5) / 3 ? color : C.line }} /> : null}
        </div>
      ))}
    </div>
  </div>
)

export const ArbitrumProofChapter: React.FC = () => {
  const frame = useCurrentFrame()
  const hook = fadeWindow(frame, 0, 224, 18)
  const separate = fadeWindow(frame, 206, 454, 18)
  const receipt = reveal(frame, 436, 18)
  const e = ARBITRUM_SEPOLIA_EVIDENCE

  return (
    <Stage chapter="Arbitrum proof" index="04" blue>
      <AbsoluteFill style={{ padding: "136px 104px 92px" }}>
        <div style={{ opacity: hook, display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: 72, height: "100%", alignItems: "center" }}>
          <div>
            <Eyebrow color="#79adff">DEPLOYED · ARBITRUM SEPOLIA</Eyebrow>
            <h2 style={{ margin: "24px 0 0", fontSize: 72, lineHeight: 1.03, letterSpacing: "-0.05em" }}>Execution-hook contracts.</h2>
            <p style={{ margin: "28px 0 0", fontSize: 25, lineHeight: 1.5, color: C.muted }}>A qualifying deployment on chain 421614, with public repository evidence.</p>
          </div>
          <div style={{ borderRadius: 26, padding: 42, backgroundColor: C.panel, border: "1px solid rgba(45,127,249,.42)", boxShadow: "0 30px 110px rgba(45,127,249,.13)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Pill active color="#71a8ff">ARBITRUM SEPOLIA</Pill>
              <span style={{ fontFamily: mono, color: C.mint, fontSize: 17 }}>DEPLOYED ✓</span>
            </div>
            <div style={{ marginTop: 44, fontFamily: mono, fontSize: 15, color: C.muted }}>EXECUTION HOOK</div>
            <div style={{ marginTop: 12, fontFamily: mono, fontSize: 24, lineHeight: 1.4, overflowWrap: "anywhere" }}>{e.hookAddress}</div>
            <div style={{ marginTop: 42, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Metric label="CHAIN ID" value="421614" />
              <Metric label="NETWORK" value="TESTNET" />
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", inset: "136px 104px 92px", opacity: separate }}>
          <Eyebrow color="#79adff">TWO INDEPENDENT PROOFS · EXPLICITLY SEPARATED</Eyebrow>
          <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1fr 120px 1fr", alignItems: "stretch", gap: 24 }}>
            <ProofPath number="01" title="HOOK DEPLOYMENT" meta="Contract address · chain 421614" color="#71a8ff" />
            <div style={{ display: "grid", placeItems: "center", fontFamily: mono, color: C.muted, fontSize: 18 }}>≠</div>
            <ProofPath number="02" title="EXTERNAL-WALLET PROOF" meta="0.01 USDC · independently verified" color={C.mint} />
          </div>
          <div style={{ marginTop: 50, textAlign: "center", fontSize: 30, color: C.muted }}>The settlement transaction did not traverse the execution hook.</div>
        </div>

        <div style={{ position: "absolute", inset: "126px 104px 76px", opacity: receipt }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
            <div>
              <Eyebrow color="#79adff">PUBLIC PROOF PAGE · NO SIGN-IN</Eyebrow>
              <h2 style={{ margin: "20px 0 0", fontSize: 62, lineHeight: 1, letterSpacing: "-0.045em" }}>Matched. Confirmed. Settled.</h2>
            </div>
            <div style={{ padding: "18px 24px", border: "1px solid rgba(92,242,178,.5)", backgroundColor: C.mintDim, borderRadius: 14, color: C.mint, fontFamily: mono, fontWeight: 700, fontSize: 22 }}>{e.settlementStatus}</div>
          </div>
          <div style={{ marginTop: 42, display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Metric label="NETWORK" value="ARBITRUM SEPOLIA" />
              <Metric label="AMOUNT" value={e.amountLabel} accent />
              <Metric label="CHAIN" value="421614" />
              <Metric label="STATUS" value="SETTLED" accent />
            </div>
            <div style={{ border: `1px solid ${C.line}`, backgroundColor: C.panel, borderRadius: 22, padding: 30 }}>
              <div style={{ fontFamily: mono, fontSize: 14, color: C.muted }}>EXECUTION ID</div>
              <div style={{ marginTop: 10, fontFamily: mono, fontSize: 19 }}>{e.executionId}</div>
              <div style={{ marginTop: 26, fontFamily: mono, fontSize: 14, color: C.muted }}>TRANSACTION</div>
              <div style={{ marginTop: 10, fontFamily: mono, fontSize: 18, color: C.mint, overflowWrap: "anywhere" }}>{e.txHash}</div>
              <div style={{ marginTop: 28, height: 1, backgroundColor: C.line }} />
              <div style={{ marginTop: 24, fontFamily: mono, fontSize: 17, color: C.muted }}>chain → token → recipient → amount → evidence</div>
            </div>
          </div>
          <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, fontFamily: mono, fontSize: 18 }}>
            <span style={{ color: C.mint }}>railguard-site.vercel.app/proof/arbitrum-sepolia</span>
            <span style={{ color: "#a9b8c5", fontSize: 18 }}>PREBROADCAST OPERATOR REPLAY · SIGN-IN REQUIRED</span>
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  )
}

const Metric: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent = false }) => (
  <div style={{ border: `1px solid ${accent ? "rgba(92,242,178,.36)" : C.line}`, backgroundColor: accent ? C.mintDim : C.panel2, borderRadius: 16, padding: "20px 22px" }}>
    <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: ".12em", color: C.muted }}>{label}</div>
    <div style={{ marginTop: 10, fontFamily: mono, fontSize: 20, fontWeight: 700, color: accent ? C.mint : C.ink }}>{value}</div>
  </div>
)

const ProofPath: React.FC<{ number: string; title: string; meta: string; color: string }> = ({ number, title, meta, color }) => (
  <div style={{ minHeight: 400, padding: 44, borderRadius: 26, border: `1px solid ${color}66`, backgroundColor: C.panel, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: `0 30px 100px ${color}12` }}>
    <div style={{ fontFamily: mono, fontSize: 64, fontWeight: 700, color, opacity: 0.55 }}>{number}</div>
    <div>
      <div style={{ fontFamily: mono, fontSize: 25, fontWeight: 700, color }}>{title}</div>
      <div style={{ marginTop: 18, fontSize: 24, color: C.muted }}>{meta}</div>
    </div>
  </div>
)

export const ClosingChapter: React.FC = () => {
  const frame = useCurrentFrame()
  const enter = reveal(frame, 4, 22)
  const line = reveal(frame, 58, 20)
  const arb = reveal(frame, 142, 22)

  return (
    <Stage chapter="Open source" index="05" blue>
      <AbsoluteFill style={{ padding: "132px 104px 92px", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ opacity: enter, scale: 0.9 + enter * 0.1, marginBottom: 26 }}><RailguardMark size={76} /></div>
        <Eyebrow>OPEN SOURCE · TESTNET-FIRST</Eyebrow>
        <h1 style={{ margin: "34px 0 0", maxWidth: 1380, fontSize: 88, lineHeight: 1.01, letterSpacing: "-0.055em", fontWeight: 700, opacity: line, translate: `0 ${28 - line * 28}px` }}>Failure-safe money movement for agents.</h1>
        <div style={{ marginTop: 42, display: "flex", gap: 18, opacity: arb }}>
          <Pill active>PUBLIC PROOF · NO SIGN-IN</Pill>
          <Pill active color="#71a8ff">OPERATOR REPLAY · SIGN-IN</Pill>
        </div>
        <div style={{ marginTop: 34, display: "grid", gap: 12, fontFamily: mono, opacity: arb }}>
          <div style={{ fontSize: 20, color: C.mint }}>railguard-site.vercel.app/proof/arbitrum-sepolia</div>
          <div style={{ fontSize: 17, color: "#a9b8c5" }}>github.com/prasanthkuna/railguard-gateway</div>
        </div>
      </AbsoluteFill>
    </Stage>
  )
}

