import { SITE_URL } from "./site-url"

/** Known SETTLED execution — HackQuest / public proof mirror. */
export const SETTLED_EXECUTION_ID = "exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa"

export const PUBLIC_PROOF_PATH = "/proof/arbitrum-sepolia"

export function publicProofUrl(siteUrl = SITE_URL): string {
  return `${siteUrl.replace(/\/$/, "")}${PUBLIC_PROOF_PATH}`
}

export function settledExecutionPath(guide = false): string {
  const base = `/executions/${SETTLED_EXECUTION_ID}`
  return guide ? `${base}?guide=judge` : base
}

export const POST_AUTH_INTENT_KEY = "railguard_post_auth_intent"

export type PostAuthIntent = "judge" | "default"

export function setPostAuthIntent(intent: PostAuthIntent) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(POST_AUTH_INTENT_KEY, intent)
}

export function peekPostAuthIntent(): PostAuthIntent | null {
  if (typeof window === "undefined") return null
  const v = sessionStorage.getItem(POST_AUTH_INTENT_KEY)
  return v === "judge" || v === "default" ? v : null
}

export function consumePostAuthRedirect(): string {
  const intent = peekPostAuthIntent()
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(POST_AUTH_INTENT_KEY)
  }
  if (intent === "judge") {
    return settledExecutionPath(true)
  }
  return "/welcome"
}
