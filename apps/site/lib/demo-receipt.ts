export type ReceiptViewModel = {
  executionId: string
  intent: {
    id: string
    agent: string
    amount: string
    asset: string
    recipient: string
  }
  policy: { version: string; decision: "ALLOW" | "DENY" }
  reservation: { grantId: string; validUntil: string }
  execution: { provider: string; txHash: string; status: string }
  reconciliation: { settlement: string; observedAt: string }
  evidenceHash: string
  chainValid: boolean
}

export const DEMO_RECEIPT: ReceiptViewModel = {
  executionId: "exec_demo_grant_receipt",
  intent: {
    id: "fin_demo_001",
    agent: "payments-agent@acme",
    amount: "125.00",
    asset: "USDC",
    recipient: "vendor_0x7a3f…c91e",
  },
  policy: { version: "policy_v0.1.0-alpha", decision: "ALLOW" },
  reservation: {
    grantId: "grant_8f2c1b9a",
    validUntil: "2026-09-29T12:45:00Z",
  },
  execution: {
    provider: "cdp-base-sepolia",
    txHash: "0x9c4e…a2f1",
    status: "SUBMITTED",
  },
  reconciliation: {
    settlement: "FINALIZED",
    observedAt: "2026-09-29T12:42:18Z",
  },
  evidenceHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  chainValid: true,
}

export function receiptFromId(id: string): ReceiptViewModel | null {
  if (id === "demo" || id.startsWith("exec_demo")) {
    return { ...DEMO_RECEIPT, executionId: id === "demo" ? DEMO_RECEIPT.executionId : id }
  }
  return null
}
