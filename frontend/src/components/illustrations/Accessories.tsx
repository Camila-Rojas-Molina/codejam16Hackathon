// Accessory art for the MIGO shop (catalogue: features/rewards/shop.ts). Original art drawn in the
// coordinate space of the wardrobe pose (public/assets/mascot/cheer.webp, 498×534) so each piece
// sits on Migo's globe head: hats on top, eyewear over the eyes, neckwear around the base.
// Same outline colour and weight as the mascot illustration, palette fills.
export const WARDROBE_POSE = 'cheer' as const

const LINE = '#42332b'
const s = { stroke: LINE, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Flower({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={x + 15 * Math.cos(((a - 90) * Math.PI) / 180)}
          cy={y + 15 * Math.sin(((a - 90) * Math.PI) / 180)}
          r="11"
          fill={fill}
          {...s}
          strokeWidth={5}
        />
      ))}
      <circle cx={x} cy={y} r="8" fill="#e9c46a" {...s} strokeWidth={4} />
    </g>
  )
}

export function AccessoryArt({ id }: { id: string }) {
  switch (id) {
    case 'explorer-hat':
      // Wide-brimmed sun hat, tipped to match the head's tilt.
      return (
        <g transform="rotate(6 205 70)">
          <path d="M138 78 C136 22 272 14 274 76 Z" fill="#e9c46a" {...s} />
          <path d="M140 62 C182 70 230 70 272 60 L274 76 C230 86 182 86 138 78 Z" fill="#e76f51" {...s} strokeWidth={5} />
          <path d="M72 88 C120 58 290 56 340 86 C300 104 112 106 72 88 Z" fill="#e9c46a" {...s} />
        </g>
      )
    case 'beret':
      return (
        <g transform="rotate(10 210 60)">
          <path d="M110 82 C98 38 180 6 262 18 C312 26 322 58 300 80 C248 96 160 98 110 82 Z" fill="#e76f51" {...s} />
          <path d="M206 14 L210 -2" {...s} />
        </g>
      )
    case 'flower-crown':
      return (
        <g transform="rotate(6 205 75)">
          <path d="M98 108 C126 50 284 46 314 104" fill="none" {...s} strokeWidth={6} />
          <Flower x={104} y={100} fill="#fbf6e8" />
          <Flower x={146} y={64} fill="#e76f51" />
          <Flower x={205} y={50} fill="#fbf6e8" />
          <Flower x={264} y={62} fill="#2a9d8f" />
          <Flower x={308} y={98} fill="#fbf6e8" />
        </g>
      )
    case 'shades':
      // Two retro lenses over the eyes, angled with the face.
      return (
        <g transform="rotate(-14 232 158)">
          <path d="M112 150 L150 148 M314 146 L346 150" fill="none" {...s} />
          <rect x="148" y="118" width="86" height="72" rx="26" fill="#264653" {...s} />
          <rect x="246" y="116" width="78" height="70" rx="26" fill="#264653" {...s} />
          <path d="M234 146 Q240 136 246 146" fill="none" {...s} />
          <path d="M162 140 L186 132 M260 138 L282 130" stroke="#fbf6e8" strokeWidth="7" strokeLinecap="round" />
        </g>
      )
    case 'scarf':
      return (
        <g>
          <path d="M228 330 L256 420 L222 416 L206 336 Z" fill="#e76f51" {...s} />
          <path d="M84 290 C140 336 270 340 330 286 L338 316 C276 372 136 372 76 320 Z" fill="#e76f51" {...s} />
          <path d="M126 322 L126 344 M168 334 L168 356 M240 336 L240 358 M286 324 L286 346" stroke="#fbf6e8" strokeWidth="7" strokeLinecap="round" />
        </g>
      )
    case 'camera':
      return (
        <g>
          <path d="M72 238 C110 330 300 334 338 232" fill="none" {...s} strokeWidth={6} />
          <rect x="150" y="286" width="104" height="70" rx="10" fill="#264653" {...s} />
          <rect x="164" y="272" width="30" height="16" rx="4" fill="#264653" {...s} strokeWidth={5} />
          <circle cx="202" cy="322" r="23" fill="#cfe9e4" stroke="#fbf6e8" strokeWidth="7" />
          <circle cx="236" cy="302" r="6" fill="#e9c46a" />
        </g>
      )
    default:
      return null
  }
}
