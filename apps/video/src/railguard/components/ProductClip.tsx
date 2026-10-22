import { AbsoluteFill, Video, interpolate, staticFile, useCurrentFrame } from "remotion"
import { BrowserFrame } from "./BrowserFrame"
import { LowerThird } from "./LowerThird"

const URLS: Record<string, string> = {
  "site-hook": "railguard-site.vercel.app",
  "site-failure-lab": "railguard-site.vercel.app/attack",
  "site-proof": "railguard-site.vercel.app/proof/arbitrum-sepolia",
  "site-judge-path": "railguard-site.vercel.app/proof/arbitrum-sepolia",
  "site-ecosystems": "railguard-site.vercel.app/ecosystems/arbitrum",
  "op-executions": "prebroadcast.vercel.app/executions",
  "op-create-intent": "prebroadcast.vercel.app/executions",
  "op-settled-proof": "prebroadcast.vercel.app/executions/exec_b73824e9…",
  "arbiscan-tx": "sepolia.arbiscan.io/tx/0x243ec1e8…",
}

const CAPTIONS: Record<string, { eyebrow: string; title: string }> = {
  "site-failure-lab": { eyebrow: "Failure Lab", title: "Simulated attack trace — client-side simulation" },
  "op-executions": {
    eyebrow: "Testnet console",
    title: "Sign-in required · executions list (optional replay)",
  },
  "op-create-intent": {
    eyebrow: "Wallet verification",
    title: "Broadcast sheet · sign-in required (optional replay)",
  },
  "op-settled-proof": {
    eyebrow: "Testnet console",
    title: "SETTLED replay · sign-in required (optional)",
  },
  "site-proof": { eyebrow: "Public proof", title: "No login — SETTLED testnet evidence" },
  "site-judge-path": { eyebrow: "Judge path", title: "Public proof → Failure Lab simulation" },
  "site-ecosystems": { eyebrow: "Arbitrum", title: "Hook deployment + wallet verification" },
  "site-hook": { eyebrow: "Railguard", title: "Agent money. Guarded." },
  "arbiscan-tx": { eyebrow: "On-chain", title: "Sepolia transaction · manifest ok" },
}

export const ProductClip: React.FC<{ clipId: string }> = ({ clipId }) => {
  const frame = useCurrentFrame()
  const zoom = interpolate(frame, [0, 45], [1, 1.04], { extrapolateRight: "clamp" })
  const cap = CAPTIONS[clipId]

  return (
    <BrowserFrame url={URLS[clipId] ?? "railguard-site.vercel.app"}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
        <Video
          src={staticFile(`clips/${clipId}.mp4`)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      {cap ? <LowerThird eyebrow={cap.eyebrow} title={cap.title} /> : null}
    </BrowserFrame>
  )
}
