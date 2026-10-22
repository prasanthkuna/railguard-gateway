/** Railguard motion grammar — reuse across compositions (see director/SHOTLIST.json). */
export const motionTokens = {
  colors: {
    bg: "#080a0c",
    text: "#f4f6f8",
    muted: "#8b949e",
    mint: "#5cf2b2",
    onMint: "#080a0c",
    arbitrumBlue: "#016BE5",
    arbitrumNavy: "#05163D",
  },
  camera: {
    pushDurationFrames: 24,
    crashZoomStrength: 0.42,
    crashZoomBlur: 18,
  },
  typography: {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    monoFamily: 'ui-monospace, "Cascadia Code", monospace',
  },
} as const
