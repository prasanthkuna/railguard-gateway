import { MARKETING_SITE_URL } from "./constants"

/** If href is this marketing site, return pathname for <Link>; otherwise undefined. */
export function internalSitePath(href: string): string | undefined {
  if (href.startsWith("/")) return href
  const root = MARKETING_SITE_URL.replace(/\/$/, "")
  if (href.startsWith(`${root}/`)) return href.slice(root.length)
  if (href === root) return "/"
  return undefined
}
