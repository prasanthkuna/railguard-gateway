import type { MetadataRoute } from "next"
import { ARC_MAINNET_PROOF } from "../lib/arc-public-proof"
import { ECOSYSTEM_MANIFEST } from "../lib/ecosystems.manifest"
import { siteOrigin } from "../lib/site-seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin()
  const now = new Date()

  const paths = [
    "",
    "/attack",
    "/ecosystems",
    "/proof/arbitrum-sepolia",
    "/proof/stellar-testnet",
    "/proof/monad-testnet",
    // Listed only once the Arc mainnet proof is CONFIRMED (not while PENDING).
    ...(ARC_MAINNET_PROOF.status === "CONFIRMED" && ARC_MAINNET_PROOF.txHash.length > 0
      ? ["/proof/arc-mainnet"]
      : []),
    "/r/demo",
    ...ECOSYSTEM_MANIFEST.map((e) => `/ecosystems/${e.id}`),
  ]

  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path.startsWith("/proof") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/proof") ? 0.9 : 0.7,
  }))
}
