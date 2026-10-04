"use client"

import { useCallback, useState } from "react"

type Props = {
  label: string
  code: string
  language?: string
}

export function ConfigSnippet({ label, code, language = "json" }: Props) {
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [code])

  return (
    <figure className="cli-command-wrap config-snippet">
      <figcaption className="cli-command-label">
        <span>
          {label}
          <span className="cli-command-sublabel"> — paste into editor, not a shell command</span>
        </span>
        <button type="button" className="cli-copy-btn" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre className="cli-command config-pre mono" data-language={language}>
        <code>{code}</code>
      </pre>
    </figure>
  )
}
