"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"
import { Logo } from "./Logo"

export const NAV = [
  { href: "/demo", label: "Try it" },
  { href: "/proof", label: "Proof" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) setOpen(false)
  }, [pathname])

  return (
    <header className="ui-header">
      <div className="ui-header-inner">
        <Link href="/" className="ui-brand" aria-label="Railguard home">
          <Logo size={28} />
          <span>Railguard</span>
        </Link>
        <nav className="ui-nav" aria-label="Primary">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname?.startsWith(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ui-header-actions">
          <a href={GITHUB_GATEWAY} className="ui-gh" {...EXTERNAL_LINK}>
            GitHub
          </a>
          <Link href="/demo" className="ui-btn ui-btn-primary ui-btn-sm">
            Try the demo
          </Link>
          <button
            type="button"
            className="ui-menu-btn"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              {open ? (
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" />
              ) : (
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" className="ui-mobile-nav" aria-label="Mobile">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <a href={GITHUB_GATEWAY} {...EXTERNAL_LINK}>
            GitHub
          </a>
        </nav>
      ) : null}
    </header>
  )
}
