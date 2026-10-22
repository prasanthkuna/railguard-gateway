import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion"

export const KenBurnsImage: React.FC<{
  src: string
  zoomFrom?: number
  zoomTo?: number
  panX?: number
}> = ({ src, zoomFrom = 1.05, zoomTo = 1.14, panX = 1.5 }) => {
  const frame = useCurrentFrame()
  const scale = interpolate(frame, [0, 120], [zoomFrom, zoomTo], { extrapolateRight: "extend" })
  const x = interpolate(frame, [0, 120], [panX, -panX], { extrapolateRight: "extend" })

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "108%",
          height: "108%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${x}%)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  )
}
