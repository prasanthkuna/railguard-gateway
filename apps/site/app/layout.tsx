import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { SiteFooter } from "../components/SiteFooter"
import { SiteHeader } from "../components/SiteHeader"
import { founderJsonLd } from "../lib/founder-jsonld"
import { siteOrigin } from "../lib/site-seo"
import "./globals.css"
import "./responsive.css"
import "./site.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const VALUE_PROP =
  "Open-source safety layer for AI agent payments. Checks every payment before it is signed and proves what really happened after."

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080a0c",
}

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Railguard: safe payments for AI agents",
    template: "%s · Railguard",
  },
  description: VALUE_PROP,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    siteName: "Railguard",
    title: "Railguard: safe payments for AI agents",
    description: VALUE_PROP,
    url: siteOrigin(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Railguard: safe payments for AI agents",
    description: VALUE_PROP,
    creator: "@prasanth_kuna",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = JSON.stringify(founderJsonLd()).replace(/</g, "\\u003c")

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script type="application/ld+json">{jsonLd}</script>
      </head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
