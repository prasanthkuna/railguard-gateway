export function AnimatedHeroLogo() {
  return (
    <div className="hero-logo-anim" aria-hidden>
      <svg viewBox="0 0 200 80" className="hero-logo-svg" aria-hidden>
        <title>Railguard gate</title>
        <line x1="8" y1="24" x2="72" y2="24" className="rail-line rail-pass" />
        <line x1="8" y1="40" x2="72" y2="40" className="rail-line rail-stop" />
        <line x1="8" y1="56" x2="72" y2="56" className="rail-line rail-pass" />
        <rect x="78" y="18" width="24" height="44" rx="4" className="gate-box" />
        <line x1="90" y1="22" x2="90" y2="58" className="gate-bar" />
        <line x1="108" y1="24" x2="192" y2="24" className="rail-out rail-pass-out" />
        <line x1="108" y1="40" x2="140" y2="40" className="rail-out rail-stop-out" />
        <line x1="108" y1="56" x2="192" y2="56" className="rail-out rail-pass-out" />
      </svg>
    </div>
  )
}
