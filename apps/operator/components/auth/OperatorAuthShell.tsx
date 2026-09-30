import Link from "next/link"
import type { ReactNode } from "react"
import { MARKETING_SITE_URL, SITE_URL } from "../../lib/site-url"
import { Logo } from "../brand/Logo"

type Props = {
  title: string
  subtitle: string
  children: ReactNode
}

export function OperatorAuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="rg-auth-screen relative flex min-h-screen flex-col">
      <header className="rg-auth-top">
        <Link href={SITE_URL} className="rg-auth-brand">
          <Logo size={36} />
          <span>Railguard</span>
        </Link>
        <Link href={MARKETING_SITE_URL} className="rg-auth-back">
          ← Marketing site
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <p className="rg-auth-eyebrow">Railguard Operator · testnet console</p>
          <h1 className="rg-auth-title">{title}</h1>
          <p className="rg-auth-subtitle">{subtitle}</p>
          <div className="rg-auth-card">{children}</div>
          <p className="rg-auth-tagline">
            Give agents authority. <strong>Not unlimited money.</strong>
          </p>
          <p className="rg-caption mt-3 text-center text-[var(--rg-text-muted)]">
            Hosted at <span className="font-mono">prebroadcast.vercel.app</span> — legacy testnet
            hostname, not a separate product brand.
          </p>
        </div>
      </div>
    </div>
  )
}
