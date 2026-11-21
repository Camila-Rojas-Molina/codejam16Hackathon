// Accessory art for Migo (see features/rewards/shop.ts for the catalogue). Drawn in Mascot's
// 120×152 coordinate space so each piece sits in the right place. Original art, same wobbly style.
const s = { stroke: 'var(--color-navy)', strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Flower({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={x + 5 * Math.cos((a * Math.PI) / 180)} cy={y + 5 * Math.sin((a * Math.PI) / 180)} r="3.6" fill={fill} {...s} strokeWidth={2} />
      ))}
      <circle cx={x} cy={y} r="2.6" fill="var(--color-sun)" {...s} strokeWidth={1.5} />
    </g>
  )
}

export function AccessoryArt({ id }: { id: string }) {
  switch (id) {
    case 'explorer-hat':
      return (
        <g>
          <path d="M37 24 C36 4 84 3 83 24 Z" fill="var(--color-sun)" {...s} />
          <path d="M38 19 C52 22 68 22 82 19 L83 24 C67 27 53 27 37 24 Z" fill="var(--color-red)" {...s} strokeWidth={2.5} />
          <path d="M16 27 C30 18 90 18 104 27 C92 33 28 33 16 27 Z" fill="var(--color-sun)" {...s} />
        </g>
      )
    case 'beret':
      return (
        <g>
          <path d="M27 27 C24 12 54 3 82 9 C97 12 99 23 90 27 C71 32 45 33 27 27 Z" fill="var(--color-red)" {...s} />
          <path d="M60 6 L62 1" {...s} />
        </g>
      )
    case 'flower-crown':
      return (
        <g>
          <path d="M26 34 C34 18 86 18 94 34" fill="none" stroke="var(--color-navy)" strokeWidth="3" strokeLinecap="round" />
          <Flower x={28} y={31} fill="var(--color-paper)" />
          <Flower x={42} y={21} fill="var(--color-red)" />
          <Flower x={60} y={17} fill="var(--color-paper)" />
          <Flower x={78} y={21} fill="var(--color-red)" />
          <Flower x={92} y={31} fill="var(--color-paper)" />
        </g>
      )
    case 'shades':
      return (
        <g>
          <path d="M24 55 L36 54 M84 54 L96 55" {...s} fill="none" />
          <rect x="35" y="50" width="24" height="16" rx="7" fill="var(--color-navy)" {...s} />
          <rect x="61" y="50" width="24" height="16" rx="7" fill="var(--color-navy)" {...s} />
          <path d="M58 55 Q60 53 62 55" {...s} fill="none" />
          <path d="M40 55 L46 53 M66 55 L72 53" stroke="var(--color-white)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'scarf':
      return (
        <g>
          <path d="M66 104 L76 130 L65 128 L59 106 Z" fill="var(--color-red)" {...s} />
          <path d="M27 93 C43 104 77 104 93 93 L95 102 C78 115 42 115 25 102 Z" fill="var(--color-red)" {...s} />
          <path d="M40 101 L40 108 M52 104 L52 111 M68 104 L68 111 M80 101 L80 108" stroke="var(--color-paper)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'camera':
      return (
        <g>
          <path d="M26 82 C38 99 82 99 94 82" fill="none" {...s} strokeWidth={2.5} />
          <rect x="45" y="94" width="30" height="20" rx="4" fill="var(--color-navy)" {...s} />
          <rect x="49" y="90" width="9" height="5" rx="1.5" fill="var(--color-navy)" {...s} strokeWidth={2} />
          <circle cx="60" cy="104" r="6.5" fill="var(--color-bubble-light)" stroke="var(--color-paper)" strokeWidth="2.5" />
          <circle cx="70" cy="98" r="1.8" fill="var(--color-sun)" />
        </g>
      )
    default:
      return null
  }
}
