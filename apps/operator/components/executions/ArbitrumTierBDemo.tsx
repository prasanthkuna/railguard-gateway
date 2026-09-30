"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SectionCard } from "../design-system"
import { Button } from "../ui/Button"
import { api } from "../../lib/api"
import { getErrorMessage } from "../../lib/errors"

const DEMO_RECIPIENT = "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233"
const DEMO_AMOUNT = "10000" // 0.01 USDC (6 decimals)

export function ArbitrumTierBDemo() {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const network = "arbitrum-sepolia" as const

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const idem = `idem_arb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const expires = new Date(Date.now() + 86_400_000).toISOString()
      const asset = "USDC"
      const created = await api.createFinancialIntent({
        principal: { organizationId: "demo", actorId: "agent-demo", actorType: "agent" },
        action: { type: "transfer", purpose: "Arbitrum Tier B demo" },
        counterparty: { address: DEMO_RECIPIENT },
        value: { amount: DEMO_AMOUNT, asset },
        constraints: { expiresAt: expires, network },
        idempotencyKey: idem,
        context: { task: "hackquest-tier-b" },
      })
      let rawIntent: unknown = created.intent
      if (typeof rawIntent === "string") {
        rawIntent = JSON.parse(rawIntent)
        if (typeof rawIntent === "string") rawIntent = JSON.parse(rawIntent)
      }
      const intent = rawIntent as { id?: string }
      const intentId = intent.id
      if (!intentId) throw new Error("missing intent id")
      await api.authorizeFinancialIntent(intentId)
      const ext = await api.executeExternalFinancialIntent(intentId)
      router.push(`/executions/${ext.executionId}`)
    } catch (err) {
      setError(getErrorMessage(err, "Demo flow failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title="Arbitrum Tier B demo">
      <p className="rg-body text-[var(--rg-text-secondary)] mb-3">
        Creates intent → authorize → awaiting MetaMask broadcast (0.01 USDC to grant wallet).
      </p>
      <p className="text-xs text-[var(--rg-text-muted)] mb-3">
        Network: Arbitrum Sepolia (421614) · Circle USDC · recipient {DEMO_RECIPIENT.slice(0, 6)}…
      </p>
      <Button type="button" disabled={busy} onClick={run}>
        {busy ? "Creating…" : "Start Tier B flow"}
      </Button>
      {error ? <p className="mt-2 text-sm text-[var(--rg-danger)]">{error}</p> : null}
    </SectionCard>
  )
}
