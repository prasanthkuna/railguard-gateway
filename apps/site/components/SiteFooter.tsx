import { GITHUB_GATEWAY, GITHUB_LAB, GITHUB_PROTOCOL, GITHUB_X402 } from "../lib/constants"

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="footer-tag">Agent money. Guarded.</p>
      <div className="footer-links">
        <a href={GITHUB_GATEWAY}>Gateway</a>
        <a href={GITHUB_LAB}>Failure Lab</a>
        <a href={GITHUB_PROTOCOL}>Core</a>
        <a href={GITHUB_X402}>x402 adapter</a>
      </div>
      <p className="footer-meta">v0.1.0-alpha · Apache-2.0 / MIT · Open source</p>
    </footer>
  )
}
