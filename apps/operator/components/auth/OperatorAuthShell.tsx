import Link from "next/link"
import type { ReactNode } from "react"
import { Logo } from "../brand/Logo"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://railguard-site.vercel.app"

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
        <Link href={SITE_URL} className="rg-auth-back">
          ← Marketing site
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <p className="rg-auth-eyebrow">Operator console</p>
          <h1 className="rg-auth-title">{title}</h1>
          <p className="rg-auth-subtitle">{subtitle}</p>
          <div className="rg-auth-card">{children}</div>
          <p className="rg-auth-tagline">
            Give agents authority. <strong>Not unlimited money.</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
