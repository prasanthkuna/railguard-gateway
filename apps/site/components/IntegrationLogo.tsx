import type { IntegrationLogoId } from "../lib/integration-logos"

export type { IntegrationLogoId }

type Props = {
  id: IntegrationLogoId
  size?: number
  className?: string
}

export function IntegrationLogo({ id, size = 28, className = "" }: Props) {
  const label =
    id === "stellar" ? "Stellar" : id === "base" ? "Base" : id === "cdp" ? "Coinbase CDP" : "x402"

  return (
    <span
      className={`integration-logo ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      {id === "stellar" && (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <title>{label}</title>
          <path d="M16 4c-4 0-7 2.5-8.5 6.2 3.2.8 5.5 3.6 5.5 6.9 0 3.9-3.1 7-7 7-.9 0-1.8-.2-2.6-.5C4.5 27 9.8 30 16 30c6.6 0 12-5.4 12-12S22.6 4 16 4z" />
        </svg>
      )}
      {id === "base" && (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <title>{label}</title>
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      {id === "cdp" && (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <title>{label}</title>
          <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="16" r="4" />
        </svg>
      )}
      {id === "x402" && (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <title>{label}</title>
          <rect
            x="4"
            y="8"
            width="24"
            height="16"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x="16"
            y="19"
            textAnchor="middle"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
          >
            402
          </text>
        </svg>
      )}
    </span>
  )
}
