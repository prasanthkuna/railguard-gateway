"use client"

import { useCallback, useState } from "react"

type Props = {
  /** Shell command without prompt (e.g. railguard scan or bun run railguard scan) */
  command: string
  className?: string
  /** Shown above the block — defaults to "Terminal command" */
  label?: string
  /** Muted lines starting with # (install context) */
  comments?: string[]
  /** Prefix each command segment with bun run railguard when command is shorthand like "railguard scan" */
  bunRunRailguard?: boolean
}

function expandCommand(part: string, bunRunRailguard: boolean): string {
  const trimmed = part.trim()
  if (!bunRunRailguard) return trimmed
  if (trimmed.startsWith("bun ") || trimmed.startsWith("git ") || trimmed.startsWith("#")) {
    return trimmed
  }
  if (trimmed.startsWith("railguard ")) {
    return `bun run ${trimmed}`
  }
  return trimmed
}

export function CliCommand({
  command,
  className = "",
  label = "Terminal command",
  comments,
  bunRunRailguard = true,
}: Props) {
  const [copied, setCopied] = useState(false)
  const parts = command.split(" && ").map((p) => expandCommand(p, bunRunRailguard))
  const copyText = [...(comments ?? []), ...parts.map((p) => p.replace(/^#\s*/, ""))].join("\n")

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [copyText])

  return (
    <figure className={`cli-command-wrap ${className}`}>
      <figcaption className="cli-command-label">
        <span>{label}</span>
        <button type="button" className="cli-copy-btn" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <div className="cli-command">
        {(comments ?? []).map((line) => (
          <p key={line} className="cli-command-comment mono">
            {line}
          </p>
        ))}
        {parts.map((part) => (
          <p key={part} className="cli-command-line mono">
            <span className="cli-prompt" aria-hidden>
              $
            </span>
            <span className="cli-text">{part}</span>
          </p>
        ))}
      </div>
    </figure>
  )
}
