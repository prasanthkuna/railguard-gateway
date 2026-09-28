import Link from "next/link"
import { GITHUB_GATEWAY } from "../lib/constants"
import { Logo } from "./Logo"
import { SystemStatus } from "./SystemStatus"

const links = [
  { href: "/attack", label: "Attack" },
  { href: "/r/demo", label: "Evidence" },
  { href: GITHUB_GATEWAY, label: "GitHub", external: true },
]

export function SiteHeader() {
  return (
    <header className="site-header-wrap">
      <div className="site-header">
        <Link href="/" className="brand">
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
        <Link href="/attack" className="btn btn-mint btn-sm">
          railguard attack
        </Link>
      </div>
      <SystemStatus />
    </header>
  )
}
