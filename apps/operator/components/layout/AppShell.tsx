"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { hasAuthSession, isDevAuthEnabled, subscribeAuthChange } from "../../lib/auth"
import { useIsClient } from "../../lib/hooks"
import { Logo } from "../brand/Logo"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isClient = useIsClient()
  const devAuthEnabled = isDevAuthEnabled()
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname === "/zebpay" ||
    pathname?.startsWith("/auth/callback")
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    () => devAuthEnabled || (typeof window !== "undefined" && hasAuthSession()),
  )

  React.useEffect(() => {
    if (devAuthEnabled) {
      setIsAuthenticated(true)
      return
    }
    const sync = () => setIsAuthenticated(hasAuthSession())
    sync()
    return subscribeAuthChange(sync)
  }, [devAuthEnabled])

  React.useEffect(() => {
    if (isClient && !isPublicRoute && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isClient, isPublicRoute, router])

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (!isClient || !isAuthenticated) {
    return (
      <div className="rg-auth-screen flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Logo size={48} />
          <h2 className="rg-auth-title mt-4">Checking access</h2>
          <p className="rg-auth-subtitle">Preparing your Railguard operator workspace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rg-operator-chrome flex h-screen overflow-hidden bg-[var(--rg-bg-alternate)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="rg-page-enter mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
