"use client"

import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { OperatorAuthShell } from "../../components/auth/OperatorAuthShell"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { api } from "../../lib/api"
import {
  getConfiguredOrganizationID,
  hasAuthSession,
  isDevAuthEnabled,
  setAuthSession,
  setWorkOSAuthFlow,
} from "../../lib/auth"
import { getErrorMessage } from "../../lib/errors"

type AuthMode = "signin" | "signup"

function persistSession(session: {
  accessToken: string
  refreshToken?: string
  sealedSession?: string
  organizationID?: string
  userID: string
  email: string
}) {
  setAuthSession({
    accessToken: session.accessToken,
    userID: session.userID,
    email: session.email,
    ...(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
    ...(session.sealedSession ? { sealedSession: session.sealedSession } : {}),
    organizationID: session.organizationID || getConfiguredOrganizationID(),
  })
}

export default function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = React.useState<AuthMode>("signin")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState<"password" | "google" | null>(null)
  const [error, setError] = React.useState("")
  const devAuthEnabled = isDevAuthEnabled()

  React.useEffect(() => {
    const oauthError =
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      searchParams.get("auth_error")
    if (oauthError) {
      setError(oauthError.replace(/\+/g, " "))
    }
  }, [searchParams])

  React.useEffect(() => {
    if (devAuthEnabled || hasAuthSession()) {
      router.replace("/")
    }
  }, [devAuthEnabled, router])

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading("password")
    setError("")

    try {
      const organizationID = getConfiguredOrganizationID()
      const session =
        mode === "signup"
          ? await api.workosSignup(email.trim(), password, organizationID)
          : await api.workosPassword(email.trim(), password, organizationID)
      persistSession(session)
      router.replace("/")
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          mode === "signup" ? "Unable to create account" : "Invalid email or password",
        ),
      )
      setLoading(null)
    }
  }

  async function handleGoogleSignIn() {
    setLoading("google")
    setError("")

    try {
      const redirectURI =
        process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || `${window.location.origin}/auth/callback`
      const { url, state, codeVerifier } = await api.workosAuthorize(redirectURI, undefined, {
        provider: "GoogleOAuth",
        loginHint: email.trim() || undefined,
      })
      setWorkOSAuthFlow(state, codeVerifier)
      window.location.assign(url)
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start Google sign-in"))
      setLoading(null)
    }
  }

  return (
    <OperatorAuthShell
      title={mode === "signup" ? "Create account" : "Sign in"}
      subtitle="Financial execution firewall — policy, reservation, and evidence for every payment."
    >
      <div className="rg-auth-tabs">
        <button
          type="button"
          className={`rg-auth-tab ${mode === "signin" ? "active" : ""}`}
          onClick={() => {
            setMode("signin")
            setError("")
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`rg-auth-tab ${mode === "signup" ? "active" : ""}`}
          onClick={() => {
            setMode("signup")
            setError("")
          }}
        >
          Sign up
        </button>
      </div>

      <form className="space-y-4" onSubmit={handlePasswordSubmit}>
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          hint={mode === "signup" ? "At least 8 characters" : undefined}
          required
          minLength={mode === "signup" ? 8 : undefined}
        />
        <Button
          type="submit"
          variant="primary"
          className="w-full !text-[#080a0c]"
          isLoading={loading === "password"}
          disabled={loading !== null}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--rg-border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--rg-text-muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--rg-border)]" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        isLoading={loading === "google"}
        disabled={loading !== null}
        onClick={handleGoogleSignIn}
      >
        Continue with Google
      </Button>

      {error ? <p className="mt-4 text-sm text-[var(--rg-state-regret)]">{error}</p> : null}

      <p className="mt-4 text-center text-xs leading-5 text-[var(--rg-text-muted)]">
        Google works for new and existing accounts. After auth you land in the operator workspace
        with the same lifecycle as the public site demos.
      </p>
    </OperatorAuthShell>
  )
}
