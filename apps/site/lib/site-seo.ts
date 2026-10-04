import { MARKETING_SITE_URL } from "./constants"

export function siteOrigin(): string {
  return MARKETING_SITE_URL.replace(/\/$/, "")
}
