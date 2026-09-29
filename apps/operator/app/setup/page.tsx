"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import { OperatorAuthShell } from "../../components/auth/OperatorAuthShell"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { api } from "../../lib/api"
import { getErrorMessage } from "../../lib/errors"

export default function SetupPage() {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError("")

    try {
      await api.bootstrapWorkspace(name, email)
      router.push("/")
    } catch (err) {
      setError(getErrorMessage(err, "Failed to bootstrap workspace"))
      setLoading(false)
    }
  }

  return (
    <OperatorAuthShell
      title="Create workspace"
      subtitle="Name your operator workspace — where intents become policy decisions and evidence."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Workspace name"
          placeholder="Treasury ops"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Owner email (optional)"
          type="email"
          placeholder="finance-ops@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <p className="text-sm text-[var(--rg-state-regret)]">{error}</p> : null}
        <Button
          type="submit"
          variant="primary"
          className="w-full !text-[#080a0c]"
          isLoading={loading}
        >
          Continue
        </Button>
      </form>
    </OperatorAuthShell>
  )
}
