"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { GITHUB_GATEWAY } from "../lib/constants"
import { Logo } from "./Logo"
import { SystemStatus } from "./SystemStatus"

const ARCHITECTURE = `${GITHUB_GATEWAY}/blob/main/docs/ARCHITECTURE.md`

const links = [
  { href: "/attack", label: "Failure Lab" },
  { href: "/proof/arbitrum-sepolia", label: "Testnet proof" },
  { href: ARCHITECTURE, label: "Architecture", external: true },
  { href: GITHUB_GATEWAY, label: "GitHub", external: true },
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen, closeMenu])

  return (
    <header className="site-header-wrap">
      <div className="site-header">
        <Link href="/" className="brand" onClick={closeMenu}>
          <Logo size={36} />
          <span>Railguard</span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {links.map((l) =>
            l.external ? (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ),
          )}
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="menu-toggle-icon" aria-hidden />
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
          <Link href="/attack" className="btn btn-mint btn-sm header-cta-short">
            Attack
          </Link>
          <Link href="/attack" className="btn btn-mint btn-sm header-cta-full">
            railguard attack
          </Link>
        </div>
      </div>
      <SystemStatus />
      {menuOpen ? (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <nav id="mobile-nav" className="mobile-nav-panel" aria-label="Mobile">
            <div className="mobile-nav-head">
              <span>Menu</span>
              <button
                type="button"
                className="mobile-nav-close"
                onClick={closeMenu}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {links.map((l) =>
              l.external ? (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                >
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} onClick={closeMenu}>
                  {l.label}
                </Link>
              ),
            )}
            <Link href="/attack" className="btn btn-mint" onClick={closeMenu}>
              railguard attack
            </Link>
            <Link href="/ecosystems" className="btn btn-ghost" onClick={closeMenu}>
              Ecosystems
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  )
}
