import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "@coinbase/cds-web/defaultFontStyles"
import "./globals.css"
import { AppShell } from "../components/layout/AppShell"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Railguard Operator",
  description: "Reference operator console for the Railguard financial execution firewall.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
