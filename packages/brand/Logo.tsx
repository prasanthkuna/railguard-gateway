export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Railguard"
    >
      <title>Railguard</title>
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="10"
        fill="#080A0C"
        stroke="#5CF2B2"
        strokeWidth="1.5"
      />
      <path d="M10 18h28" stroke="#5CF2B2" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 24h28" stroke="#3d4a52" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 30h28" stroke="#3d4a52" strokeWidth="2" strokeLinecap="round" />
      <rect
        x="20"
        y="14"
        width="8"
        height="20"
        rx="2"
        fill="#5CF2B2"
        fillOpacity="0.15"
        stroke="#5CF2B2"
      />
      <path d="M24 16v16" stroke="#5CF2B2" strokeWidth="2" />
    </svg>
  )
}
