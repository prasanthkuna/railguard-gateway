import { EXTERNAL_LINK, FOUNDER_SOCIAL } from "../lib/constants"

export function FounderSocialLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`founder-social mono ${className}`.trim()}>
      <span className="founder-social-label">Built by {FOUNDER_SOCIAL.name}</span>
      {" — "}
      <a href={FOUNDER_SOCIAL.github} {...EXTERNAL_LINK}>
        GitHub
      </a>
      {" · "}
      <a href={FOUNDER_SOCIAL.linkedin} {...EXTERNAL_LINK}>
        LinkedIn
      </a>
      {" · "}
      <a href={FOUNDER_SOCIAL.x} {...EXTERNAL_LINK}>
        X
      </a>
    </p>
  )
}
