"use client"

import * as React from "react"
import { SectionCard } from "../design-system"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { api } from "../../lib/api"
import { getErrorMessage } from "../../lib/errors"
import type { V5ExecutionResponse } from "../../lib/types"

export function ExternalBroadcastPanel({
  execution,
  onUpdated,
}: {
  execution: V5ExecutionResponse
  onUpdated: (next: V5ExecutionResponse) => void
}) {
  const [txHash, setTxHash] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const sheet = execution.broadcastSheet

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setError(`${label} copied`)
    window.setTimeout(() => setError(null), 1500)
  }

  const observe = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.observeExecution(execution.executionId, txHash.trim())
      onUpdated({
        ...execution,
        status: res.status as V5ExecutionResponse["status"],
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
      })
    } catch (err) {
      setError(getErrorMessage(err, "Observe failed"))
    } finally {
      setBusy(false)
    }
  }

  if (execution.status === "SETTLED" && execution.txHash) {
    return (
      <SectionCard title="On-chain settlement">
        <p className="font-mono text-sm break-all">{execution.txHash}</p>
        {execution.explorerUrl ? (
          <a
            href={execution.explorerUrl}
            className="text-sm text-[var(--rg-accent)] underline"
            target="_blank"
            rel="noreferrer"
          >
            View on explorer
          </a>
        ) : null}
      </SectionCard>
    )
  }

  if (execution.status !== "AWAITING_BROADCAST" || !sheet) {
    return null
  }

  const token = String(sheet.tokenAddress ?? "")
  const recipient = String(sheet.recipient ?? "")
  const amount = String(sheet.amount ?? "")
  const chainId = String(sheet.chainId ?? "")

  return (
    <SectionCard title="External broadcast (MetaMask)">
      <p className="rg-body text-[var(--rg-text-secondary)] mb-4">
        Send exactly this ERC-20 transfer on chain {chainId}, then paste the transaction hash below.
      </p>
      <dl className="grid gap-2 text-sm font-mono mb-4">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--rg-text-muted)]">Token</dt>
          <dd className="truncate">{token}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--rg-text-muted)]">To</dt>
          <dd className="truncate">{recipient}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--rg-text-muted)]">Amount (base units)</dt>
          <dd>{amount}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => copy("Token", token)}>
          Copy token
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => copy("Recipient", recipient)}>
          Copy recipient
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => copy("Amount", amount)}>
          Copy amount
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Transaction hash"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="0x..."
          className="flex-1"
        />
        <Button type="button" disabled={busy || !txHash.trim()} onClick={observe}>
          {busy ? "Verifying…" : "Observe & settle"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-[var(--rg-text-muted)]">{error}</p> : null}
    </SectionCard>
  )
}
