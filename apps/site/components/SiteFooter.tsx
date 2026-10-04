import Link from "next/link"
import {
  EXTERNAL_LINK,
  GITHUB_GATEWAY,
  GITHUB_LAB,
  GITHUB_PROFILE,
  GITHUB_PROTOCOL,
  GITHUB_X402,
} from "../lib/constants"
import { FounderSocialLinks } from "./FounderSocialLinks"

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="footer-tag">Agent money. Guarded.</p>
      <FounderSocialLinks />
      <div className="footer-links">
        <Link href="/ecosystems">Ecosystems</Link>
        <Link href="/attack">Failure Lab</Link>
        <Link href="/proof/stellar-testnet">Stellar proof</Link>
        <Link href="/proof/arbitrum-sepolia">Arbitrum proof</Link>
        <a href={GITHUB_PROFILE} {...EXTERNAL_LINK}>
          GitHub profile
        </a>
        <a href={GITHUB_GATEWAY} {...EXTERNAL_LINK}>
          Gateway repo
        </a>
        <a href={GITHUB_LAB} {...EXTERNAL_LINK}>
          Failure Lab
        </a>
        <a href={GITHUB_PROTOCOL} {...EXTERNAL_LINK}>
          Core
        </a>
        <a href={GITHUB_X402} {...EXTERNAL_LINK}>
          x402 adapter
        </a>
      </div>
      <p className="footer-meta">v0.1.0-alpha · Apache-2.0 / MIT · Open source</p>
    </footer>
  )
}
