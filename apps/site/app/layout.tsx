import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Railguard — financial execution firewall",
  description: "Open-source firewall for autonomous software payments. Agent money. Guarded.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
