import Link from "next/link"
import { Logo } from "./Logo"

const links = [
  { href: "/attack", label: "Attack demo" },
  { href: "/ecosystems", label: "Ecosystems" },
  { href: "/r/demo", label: "Receipt" },
]

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Logo size={36} />
        <span>Railguard</span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
      <Link href="/attack" className="btn btn-mint btn-sm">
        railguard attack
      </Link>
    </header>
  )
}
