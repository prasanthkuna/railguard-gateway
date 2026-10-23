import Link from "next/link"
import {
  CONTACT_EMAIL,
  EXTERNAL_LINK,
  FOUNDER_SOCIAL,
  GITHUB_GATEWAY,
  LICENSE_URL,
} from "../lib/constants"

export function SiteFooter() {
  return (
    <footer className="ui-footer">
      <span>
        Railguard v0.1 alpha · testnet only ·{" "}
        <a href={LICENSE_URL} {...EXTERNAL_LINK}>
          Apache-2.0
        </a>{" "}
        · built by{" "}
        <Link href="/about" style={{ color: "var(--text)" }}>
          {FOUNDER_SOCIAL.name}
        </Link>
      </span>
      <nav aria-label="Footer">
        <Link href="/demo">Try it</Link>
        <Link href="/proof">Proof</Link>
        <Link href="/how-it-works">How it works</Link>
        <a href={GITHUB_GATEWAY} {...EXTERNAL_LINK}>
          GitHub
        </a>
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
      </nav>
    </footer>
  )
}
