import { FOUNDER_SOCIAL, GITHUB_GATEWAY } from "./constants"
import { siteOrigin } from "./site-seo"

/** Structured data: Railguard is an open-source project built by Prasanth Kuna (no employer/founder role). */
export function founderJsonLd() {
  const person = {
    "@type": "Person",
    "@id": `${siteOrigin()}/about#person`,
    name: FOUNDER_SOCIAL.name,
    url: `${siteOrigin()}/about`,
    jobTitle: "Payments and backend engineer",
    sameAs: [FOUNDER_SOCIAL.github, FOUNDER_SOCIAL.linkedin, FOUNDER_SOCIAL.x],
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareSourceCode",
        name: "Railguard",
        description:
          "Open-source safety layer for AI agent payments: policy before signing, settlement verification, and tamper-evident receipts.",
        url: siteOrigin(),
        codeRepository: GITHUB_GATEWAY,
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        programmingLanguage: "TypeScript",
        author: { "@id": person["@id"] },
      },
      person,
    ],
  }
}
