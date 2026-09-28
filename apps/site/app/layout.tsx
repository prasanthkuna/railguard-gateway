import { GeistMono } from "geist/font/mono"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { SiteFooter } from "../components/SiteFooter"
import { SiteHeader } from "../components/SiteHeader"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Railguard — financial execution firewall",
  description:
    "Can your AI agent spend money safely? Open-source firewall between autonomous software and your wallet. Agent money. Guarded.",
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
