import { GeistMono } from "geist/font/mono"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { SiteFooter } from "../components/SiteFooter"
import { SiteHeader } from "../components/SiteHeader"
import "./globals.css"
import "./responsive.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "Railguard — financial execution firewall",
  description:
    "Open-source financial execution firewall for AI agents. Policy before signing, tamper-evident records—v0.1 testnet alpha. Agent money. Guarded.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Railguard",
    description: "Attack → protect → attack. Financial execution firewall for agents.",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${GeistMono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
