"use client"

import { Activity } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { PageHeader, SectionCard } from "../../components/design-system"
import { Button } from "../../components/ui/Button"
import { Skeleton } from "../../components/ui/Skeleton"
import { api } from "../../lib/api"
import { getErrorMessage } from "../../lib/errors"
import { ArbitrumWalletVerificationDemo } from "../../components/executions/ArbitrumWalletVerificationDemo"
import { formatExecutionStatus, formatRailLabel } from "../../lib/executionStatusLabels"
import type { V5ExecutionListItem } from "../../lib/types"

export default function ExecutionsIndexPage() {
  const [items, setItems] = React.useState<V5ExecutionListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.listExecutions({ limit: 100 })
        if (!cancelled) setItems(res.items)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load executions"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        eyebrow="Lifecycle"
        title="Executions"
        description="Search decisions, rails, and evidence across financial intents — primary control surface for Railguard."
        actions={
          <Link href="#wallet-verification-demo">
            <Button variant="secondary" className="gap-2">
              <Activity className="h-4 w-4" />
              Arbitrum wallet test
            </Button>
          </Link>
        }
      />

      <ArbitrumWalletVerificationDemo />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-[var(--rg-radius-xl)]" />
      ) : error ? (
        <p className="text-[var(--rg-text-muted)]">{error}</p>
      ) : items.length === 0 ? (
        <SectionCard title="No executions yet">
          <p className="rg-body text-[var(--rg-text-secondary)]">
            Create and authorize an intent, then start an execution to see it here.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title={`${items.length} execution${items.length === 1 ? "" : "s"}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--rg-border)] text-[var(--rg-text-muted)]">
                  <th className="py-3 pr-4 font-medium">Execution</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                  <th className="py-3 pr-4 font-medium">Rail</th>
                  <th className="py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.executionId}
                    className="border-b border-[var(--rg-border)]/60 hover:bg-[var(--rg-bg-hover)]"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">
                      <Link
                        href={`/executions/${row.executionId}`}
                        className="text-[var(--rg-brand)] hover:underline"
                      >
                        {row.executionId}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-xs">{formatExecutionStatus(row.status)}</td>
                    <td className="py-3 pr-4">
                      {row.amount} {row.asset}
                    </td>
                    <td className="py-3 pr-4">{formatRailLabel(row.rail)}</td>
                    <td className="py-3 text-[var(--rg-text-muted)]">
                      {new Date(row.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
