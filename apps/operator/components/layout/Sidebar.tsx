"use client"

import { Activity, FileText, History, LayoutDashboard, Settings, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "../../lib/cn"
import { MARKETING_SITE_URL } from "../../lib/site-url"
import { Logo } from "../brand/Logo"

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/executions", label: "Executions", icon: Activity },
]

const invoiceApNav = [
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/vendors", label: "Vendors", icon: Users },
]

const utilityNav = [
  { href: "/audit", label: "Audit Trail", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  pathname: string | null
}) {
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href))
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-[var(--rg-radius-md)] px-3 py-2.5 rg-label-2 transition",
        isActive
          ? "bg-[var(--rg-bg-primary-wash)] text-[var(--rg-brand)]"
          : "text-[var(--rg-text-secondary)] hover:bg-[var(--rg-bg-hover)] hover:text-[var(--rg-text-primary)]",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive
            ? "text-[var(--rg-brand)]"
            : "text-[var(--rg-text-muted)] group-hover:text-[var(--rg-text-secondary)]",
        )}
      />
      {label}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-[var(--rg-border)] bg-[var(--rg-bg-base)] lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-[var(--rg-border)] px-5">
        <Logo size={36} />
        <div>
          <p className="rg-headline text-[var(--rg-text-primary)]">Railguard Operator</p>
          <p className="rg-caption text-[var(--rg-text-muted)]">
            Operator console · testnet reference
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 px-3 py-4">
        <div className="space-y-1">
          {primaryNav.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </div>
        <div>
          <p className="px-3 pb-2 rg-caption text-[var(--rg-text-muted)]">Invoice AP (demo)</p>
          <div className="space-y-1">
            {invoiceApNav.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          {utilityNav.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </div>
      </nav>

      <div className="border-t border-[var(--rg-border)] p-4 space-y-3">
        <div className="rounded-[var(--rg-radius-lg)] bg-[var(--rg-bg-primary-wash)] p-4">
          <p className="rg-caption text-[var(--rg-brand)]">Lifecycle</p>
          <p className="rg-legal mt-2 text-[var(--rg-text-muted)]">
            Intent → Authorize → Reserve → Execute → Observe → Reconcile → Evidence
          </p>
        </div>
        <a
          href={MARKETING_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rg-caption block text-center text-[var(--rg-text-muted)] hover:text-[var(--rg-brand)]"
        >
          ← Marketing site
        </a>
      </div>
    </aside>
  )
}
