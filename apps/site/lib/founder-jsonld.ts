import { FOUNDER_SOCIAL, GITHUB_GATEWAY } from "./constants"
import { siteOrigin } from "./site-seo"

export function founderJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Railguard",
        url: siteOrigin(),
        sameAs: [GITHUB_GATEWAY],
      },
      {
        "@type": "Person",
        name: FOUNDER_SOCIAL.name,
        url: FOUNDER_SOCIAL.github,
        sameAs: [FOUNDER_SOCIAL.github, FOUNDER_SOCIAL.linkedin, FOUNDER_SOCIAL.x],
        worksFor: { "@type": "Organization", name: "Railguard", url: siteOrigin() },
      },
    ],
  }
}
