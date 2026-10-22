"use client"

import Link from "next/link"
import { PageHeader } from "../../components/design-system"
import { JudgeQuickLinks } from "../../components/executions/JudgeGuideBanner"
import { publicProofUrl } from "../../lib/judge-path"
import { SITE_URL } from "../../lib/site-url"

export default function WelcomePage() {
  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        eyebrow="Start here"
        title="What do you want to verify?"
        description="Judges usually need no account — use public proof on the marketing site. This console is for replaying the operator lifecycle after sign-in."
      />
      <JudgeQuickLinks />
      <p className="text-sm text-[var(--rg-text-muted)]">
        Public proof (no WorkOS):{" "}
        <a
          href={publicProofUrl(SITE_URL)}
          className="text-[var(--rg-brand)] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {publicProofUrl(SITE_URL)}
        </a>
        . Runbook:{" "}
        <a
          href="https://github.com/prasanthkuna/railguard-gateway/blob/main/docs/runbooks/JUDGE_PATH_AND_VIDEO_PLAN.md"
          className="text-[var(--rg-brand)] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Judge path & video plan
        </a>
        .
      </p>
      <Link href="/executions" className="text-sm text-[var(--rg-brand)] hover:underline">
        ← Back to executions
      </Link>
    </div>
  )
}
