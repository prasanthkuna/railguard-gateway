export type Recipe = {
  id: string
  title: string
  persona: string
  wedge?: boolean
  protects: string[]
  command: string
}

export const RECIPES: Recipe[] = [
  {
    id: "developer",
    title: "Developer",
    persona: "Ship agent payments without learning treasury ops",
    wedge: true,
    protects: ["Idempotent authorize", "Receipt verification", "Local Failure Lab"],
    command: "railguard scan && railguard attack",
  },
  {
    id: "agent",
    title: "AI agent",
    persona: "Tool-using agents with spend authority",
    wedge: true,
    protects: [
      "Budget caps on supported rails",
      "Recipient allowlists",
      "Idempotent execute (APF-001)",
    ],
    command: "railguard check(intent)",
  },
  {
    id: "treasury",
    title: "Treasury ops",
    persona: "Finance controls before USDC leaves custody",
    wedge: true,
    protects: ["Daily limits", "Approval paths", "Reconciliation alerts"],
    command: "railguard protect",
  },
  {
    id: "startup",
    title: "Startup ops",
    persona: "Invoice → pay flows with audit trail",
    protects: ["Vendor registry", "Intent binding", "Evidence export"],
    command: "railguard receipts <id>",
  },
  {
    id: "dao",
    title: "DAO",
    persona: "Multisig-adjacent policy before broadcast",
    protects: ["Scope limits", "Hook enforcement", "On-chain evidence hash"],
    command: "railguard status",
  },
  {
    id: "stablecoin",
    title: "Stablecoin business",
    persona: "USDC payouts at scale with guardrails",
    protects: ["Settlement verify", "Wrong-transfer detect", "CDP reconcile"],
    command: "railguard attack --profiles APF-004",
  },
  {
    id: "trading-bot",
    title: "Trading bot",
    persona: "Automated spends with race-safe budgets",
    protects: ["Budget race (APF-002)", "Replay resistance (APF-001)", "Reservation freeze fix"],
    command: "railguard attack --profiles APF-002",
  },
  {
    id: "creator",
    title: "Creator / team",
    persona: "Shared wallet, individual agent limits",
    protects: ["Per-agent budgets", "Task scopes", "Shareable receipts"],
    command: "railguard scan",
  },
  {
    id: "personal",
    title: "Personal",
    persona: "Self-hosted firewall in front of your signer",
    wedge: false,
    protects: ["ASSURANCE modes", "Public posture scan", "FOSS CLI"],
    command: "railguard protect",
  },
]
