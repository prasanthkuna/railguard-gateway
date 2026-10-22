"use client"

import Link from "next/link"
import { publicProofUrl, settledExecutionPath } from "../../lib/judge-path"
import { SITE_URL } from "../../lib/site-url"

export function JudgeGuideBanner() {
  return (
    <div
      className="rounded-[var(--rg-radius-lg)] border border-[var(--rg-accent)]/35 bg-[var(--rg-accent-dim)] px-4 py-3 md:px-5 md:py-4"
      role="note"
    >
      <p className="rg-label-2 text-[var(--rg-accent)]">Judge / reviewer path</p>
      <p className="mt-1 text-sm text-[var(--rg-text-secondary)]">
        Read-only replay of a verified <strong>SETTLED</strong> execution.{" "}
        <strong>No wallet action required</strong> on this page — compare with the public proof page
        (no sign-in).
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--rg-text-secondary)]">
        <li>Scroll evidence and lifecycle below (already settled on Sepolia).</li>
        <li>
          Open{" "}
          <a
            href={publicProofUrl(SITE_URL)}
            className="text-[var(--rg-brand)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            public proof
          </a>{" "}
          for tx hash and hook address without an account.
        </li>
        <li>
          Optional:{" "}
          <Link href="/welcome" className="text-[var(--rg-brand)] hover:underline">
            guided tour
          </Link>{" "}
          or create a new test intent (advanced builders).
        </li>
      </ol>
    </div>
  )
}

export function JudgeQuickLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link
        href={settledExecutionPath(true)}
        className="rounded-[var(--rg-radius-lg)] border border-[var(--rg-border)] bg-[var(--rg-bg-base)] p-4 transition hover:border-[var(--rg-brand)]/40"
      >
        <p className="rg-label-2 text-[var(--rg-brand)]">1 · View SETTLED replay</p>
        <p className="mt-1 text-sm text-[var(--rg-text-muted)]">
          Known verified execution — read-only, no wallet.
        </p>
      </Link>
      <a
        href={`${SITE_URL}/attack`}
        className="rounded-[var(--rg-radius-lg)] border border-[var(--rg-border)] bg-[var(--rg-bg-base)] p-4 transition hover:border-[var(--rg-brand)]/40"
        target="_blank"
        rel="noopener noreferrer"
      >
        <p className="rg-label-2 text-[var(--rg-brand)]">2 · Failure Lab (site)</p>
        <p className="mt-1 text-sm text-[var(--rg-text-muted)]">
          Simulate attack classes — no login, client-side only.
        </p>
      </a>
      <Link
        href="/executions#wallet-verification-demo"
        className="rounded-[var(--rg-radius-lg)] border border-[var(--rg-border)] bg-[var(--rg-bg-base)] p-4 transition hover:border-[var(--rg-brand)]/40"
      >
        <p className="rg-label-2 text-[var(--rg-brand)]">3 · Create test intent</p>
        <p className="mt-1 text-sm text-[var(--rg-text-muted)]">
          Advanced — live API, send USDC from your wallet.
        </p>
      </Link>
    </div>
  )
}
