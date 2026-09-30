"use client"

import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { BackLink, PageHeader } from "../../../components/design-system"
import { ExecutionLifecycle } from "../../../components/executions/ExecutionLifecycle"
import { ExternalBroadcastPanel } from "../../../components/executions/ExternalBroadcastPanel"
import { EvidencePanel } from "../../../components/ui/EvidencePanel"
import { Skeleton } from "../../../components/ui/Skeleton"
import { api } from "../../../lib/api"
import { getErrorMessage } from "../../../lib/errors"
import { formatExecutionStatus } from "../../../lib/executionStatusLabels"
import type { V5EvidenceResponse, V5ExecutionResponse } from "../../../lib/types"

export default function ExecutionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const executionId = params?.id as string
  const [execution, setExecution] = React.useState<V5ExecutionResponse | null>(null)
  const [evidence, setEvidence] = React.useState<V5EvidenceResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const exec = await api.getExecution(executionId)
        if (!cancelled) setExecution(exec)
        try {
          const ev = await api.getExecutionEvidence(executionId)
          if (!cancelled) setEvidence(ev)
        } catch {
          if (!cancelled) setEvidence(null)
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load execution"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [executionId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !execution) {
    return (
      <div className="space-y-4">
        <BackLink label="Executions" onClick={() => router.push("/executions")} />
        <p className="text-[var(--rg-text-muted)]">{error ?? "Execution not found"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <BackLink label="Executions" onClick={() => router.push("/executions")} />
      <PageHeader
        eyebrow="Execution"
        title={execution.executionId}
        description={`Intent ${execution.intentId} · ${formatExecutionStatus(execution.status)}`}
      />
      <ExternalBroadcastPanel
        execution={execution}
        onUpdated={(next) => {
          setExecution(next)
          void api.getExecutionEvidence(executionId).then(setEvidence).catch(() => {})
        }}
      />
      {evidence ? <ExecutionLifecycle execution={execution} explain={evidence.explain} /> : null}
      <EvidencePanel evidence={evidence} />
    </div>
  )
}
