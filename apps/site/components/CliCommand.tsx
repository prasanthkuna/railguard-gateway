type Props = {
  command: string
  className?: string
}

export function CliCommand({ command, className = "" }: Props) {
  const parts = command.split(" && ")
  return (
    <div className={`cli-command ${className}`}>
      {parts.map((part) => (
        <p key={part} className="cli-command-line mono">
          <span className="cli-prompt" aria-hidden>
            $
          </span>
          <span className="cli-text">{part}</span>
        </p>
      ))}
    </div>
  )
}
