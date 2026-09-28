export type TelemetryMode = "normal" | "attack" | "failure"

export type TelemetryTone = "neutral" | "mint" | "amber" | "blue" | "red"

export type TelemetryLine = {
  time: string
  stage: string
  detail: string
  outcome: string
  tone: TelemetryTone
}

export const TELEMETRY_BY_MODE: Record<TelemetryMode, TelemetryLine[]> = {
  normal: [
    {
      time: "12:41:08.201",
      stage: "INTENT",
      detail: "agent_17",
      outcome: "500 USDC",
      tone: "neutral",
    },
    {
      time: "12:41:08.218",
      stage: "POLICY",
      detail: "recipient_allowed",
      outcome: "ALLOW",
      tone: "mint",
    },
    {
      time: "12:41:08.231",
      stage: "RESERVE",
      detail: "grant_8f2c",
      outcome: "LOCKED",
      tone: "amber",
    },
    {
      time: "12:41:08.902",
      stage: "EXECUTE",
      detail: "0x89ad…f21a",
      outcome: "SUBMITTED",
      tone: "neutral",
    },
    {
      time: "12:41:10.004",
      stage: "OBSERVE",
      detail: "Base Sepolia",
      outcome: "CONFIRMED",
      tone: "blue",
    },
    {
      time: "12:41:10.104",
      stage: "RECONCILE",
      detail: "amount+recipient",
      outcome: "MATCHED",
      tone: "mint",
    },
    { time: "12:41:10.118", stage: "EVIDENCE", detail: "rg_82KF", outcome: "SEALED", tone: "mint" },
  ],
  attack: [
    {
      time: "12:41:12.401",
      stage: "INTENT",
      detail: "agent_17",
      outcome: "7,500 USDC",
      tone: "neutral",
    },
    {
      time: "12:41:12.415",
      stage: "POLICY",
      detail: "unknown_recipient",
      outcome: "DENY",
      tone: "red",
    },
    { time: "12:41:12.416", stage: "RESERVE", detail: "—", outcome: "SKIPPED", tone: "neutral" },
    { time: "12:41:12.417", stage: "EXECUTE", detail: "—", outcome: "BLOCKED", tone: "red" },
  ],
  failure: [
    {
      time: "12:41:20.100",
      stage: "INTENT",
      detail: "agent_02",
      outcome: "500 USDC",
      tone: "neutral",
    },
    {
      time: "12:41:20.118",
      stage: "POLICY",
      detail: "recipient_allowed",
      outcome: "ALLOW",
      tone: "mint",
    },
    {
      time: "12:41:20.131",
      stage: "RESERVE",
      detail: "grant_4a1d",
      outcome: "LOCKED",
      tone: "amber",
    },
    {
      time: "12:41:20.902",
      stage: "EXECUTE",
      detail: "0x71bc…e902",
      outcome: "SUBMITTED",
      tone: "neutral",
    },
    {
      time: "12:41:21.200",
      stage: "OBSERVE",
      detail: "RPC timeout",
      outcome: "UNKNOWN",
      tone: "amber",
    },
    { time: "12:41:23.440", stage: "OBSERVE", detail: "watcher", outcome: "TX SEEN", tone: "blue" },
    {
      time: "12:41:23.512",
      stage: "RECONCILE",
      detail: "chain facts",
      outcome: "FINALIZED",
      tone: "mint",
    },
    { time: "12:41:23.528", stage: "EVIDENCE", detail: "rg_9m2Q", outcome: "SEALED", tone: "mint" },
  ],
}

export const LIFECYCLE_STEPS = [
  {
    key: "intent",
    title: "Intent",
    copy: "Agent requests a bounded payment — amount, asset, recipient, task scope.",
  },
  {
    key: "authorize",
    title: "Authorize",
    copy: "Policy evaluates recipient lists, budgets, and assurance mode before funds move.",
  },
  {
    key: "reserve",
    title: "Reserve",
    copy: "USDC is committed before execution so races and double-spends fail closed.",
  },
  {
    key: "execute",
    title: "Execute",
    copy: "Settlement rail submits through your existing signer and wallet stack.",
  },
  {
    key: "observe",
    title: "Observe",
    copy: "Chain and RPC reality is watched — including UNKNOWN after broadcast.",
  },
  {
    key: "reconcile",
    title: "Reconcile",
    copy: "On-chain transfer is matched to intent; mismatches surface as reconciliation required.",
  },
  {
    key: "evidence",
    title: "Evidence",
    copy: "Hash-chained envelope you can verify with railguard receipts.",
  },
] as const
