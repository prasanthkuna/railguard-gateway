import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Railguard - evidence pack",
  description:
    "Public Railguard proof links for the financial execution firewall: Failure Lab, Arbitrum, Monad, Stellar, source and product demo.",
}

const LINKS = [
  {
    title: "Product",
    href: "https://railguard-site.vercel.app/",
    detail: "Financial execution firewall for autonomous software.",
  },
  {
    title: "Failure Lab",
    href: "https://railguard-site.vercel.app/attack",
    detail: "Attack -> protect -> evidence demonstrations for payment failure classes.",
  },
  {
    title: "Arbitrum Sepolia proof",
    href: "https://railguard-site.vercel.app/proof/arbitrum-sepolia",
    detail: "Hook deployment plus a separately disclosed external-wallet USDC verification.",
  },
  {
    title: "Monad testnet proof",
    href: "https://railguard-site.vercel.app/proof/monad-testnet",
    detail: "1 USDC external-wallet transfer independently matched from receipt logs.",
  },
  {
    title: "Stellar testnet proof",
    href: "https://railguard-site.vercel.app/proof/stellar-testnet",
    detail: "Horizon-confirmed testnet payment evidence.",
  },
  {
    title: "84-second demo",
    href: "https://youtu.be/L-Gss08bzR0",
    detail: "Product, failure modes and public proof surfaces.",
  },
  {
    title: "Gateway source",
    href: "https://github.com/prasanthkuna/railguard-gateway",
    detail: "Reference runtime, SDK/CLI/MCP surfaces, settlement verification and evidence.",
  },
] as const

export default function ReviewerPackPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--rg-text-muted)]">
        Legacy reviewer URL
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--rg-text-primary)]">
        Railguard evidence pack
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--rg-text-muted)]">
        This route is kept alive for old bookmarks. Current evidence is public and does not require
        an Operator account.
      </p>

      <div className="mt-10 grid gap-4">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[var(--rg-border)] bg-[var(--rg-bg-primary)] p-5 transition hover:border-[var(--rg-brand)]"
          >
            <h2 className="font-medium text-[var(--rg-text-primary)]">{link.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--rg-text-muted)]">{link.detail}</p>
          </a>
        ))}
      </div>

      <p className="mt-10 text-sm leading-6 text-[var(--rg-text-muted)]">
        Railguard is a v0.1 alpha/testnet reference implementation and is not presented as a custody
        product or production-ready mainnet control plane.
      </p>
    </main>
  )
}
