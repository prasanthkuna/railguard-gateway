import type { MetadataRoute } from "next"
import { ARC_MAINNET_PROOF } from "../lib/arc-public-proof"
import { siteOrigin } from "../lib/site-seo"

const SITEMAP_PATHS = [
  "",
  "/demo",
  "/proof",
  "/how-it-works",
  "/about",
  "/proof/arbitrum-sepolia",
  "/proof/stellar-testnet",
  "/proof/monad-testnet",
  "/proof/metal-testnet",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin()
  const now = new Date()
  const paths = [
    ...SITEMAP_PATHS,
    // Listed only once the Arc mainnet proof is CONFIRMED (not while pending).
    ...(ARC_MAINNET_PROOF.status === "CONFIRMED" && ARC_MAINNET_PROOF.txHash.length > 0
      ? ["/proof/arc-mainnet"]
      : []),
  ]
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path.startsWith("/proof") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/proof") ? 0.9 : 0.7,
  }))
}
