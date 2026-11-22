// Pattern and abstract backdrops: sunburst, café tiles, gingham, Memphis, Bauhaus, groovy rings.
import { Dots } from './kit'
import { D, fx, sparkle, wave, wobble, type SceneDef } from './util'

const PINK = '#f1a7a0'
const LILAC = '#b7a7d6'

export const ABSTRACT_SCENES: Record<string, SceneDef> = {
  'backdrop-sunburst': {
    draw: (u) => {
      const cx = 50
      const cy = 60
      const n = 20
      const rays = Array.from({ length: n }, (_, i) => {
        const a0 = (i * 2 * Math.PI) / n
        const a1 = a0 + Math.PI / n
        const p = (a: number) => `${fx(cx + 110 * Math.cos(a))} ${fx(cy + 110 * Math.sin(a))}`
        return <path key={i} d={`M${cx} ${cy} L${p(a0)} L${p(a1)}Z`} fill={D.saffron} />
      })
      return (
        <g>
          <defs>
            <Dots id={u('dots')} s={2.2} r={0.5} fill={D.sandy} />
            <radialGradient id={u('calm')} cx={cx} cy={cy} r="46" gradientUnits="userSpaceOnUse">
              <stop offset="0.45" stopColor="var(--day-saffron-soft)" stopOpacity="0.9" />
              <stop offset="1" stopColor="var(--day-saffron-soft)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill={D.saffronSoft} />
          {rays}
          <circle cx={cx} cy={cy} r="62" fill="none" stroke={`url(#${u('dots')})`} strokeWidth="30" />
          <circle cx={cx} cy={cy} r="46" fill={`url(#${u('calm')})`} />
          <circle cx={cx} cy={cy} r="20" fill={D.saffronSoft} />
        </g>
      )
    },
  },

  'backdrop-tiles': {
    draw: (u) => (
      <g>
        <defs>
          <pattern id={u('check')} width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill={D.tealSoft} />
            <rect width="12.5" height="12.5" fill={D.teal} fillOpacity="0.5" />
            <rect x="12.5" y="12.5" width="12.5" height="12.5" fill={D.teal} fillOpacity="0.5" />
            <path d="M1.6 3.2 L3.2 1.6 M14.1 15.7 L15.7 14.1" stroke={D.sheet} strokeOpacity="0.7" strokeWidth="0.6" strokeLinecap="round" />
            <path d="M0 0.1 H25 M0 12.5 H25 M0.1 0 V25 M12.5 0 V25" stroke={D.ink} strokeOpacity="0.12" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#${u('check')})`} />
        {[0, 25, 50, 75, 100].flatMap((x) => [0, 25, 50, 75, 100].map((y) => <rect key={`${x}-${y}`} x={x - 1.3} y={y - 1.3} width="2.6" height="2.6" transform={`rotate(45 ${x} ${y})`} fill={D.saffron} />))}
      </g>
    ),
  },

  'backdrop-gingham': {
    draw: () => {
      const stripes = Array.from({ length: 8 }, (_, i) => i * 12.5 + 3.125)
      return (
        <g>
          <rect width="100" height="100" fill={D.sheet} />
          <g fill={D.sienna} fillOpacity="0.32">
            {stripes.map((x) => (
              <rect key={`v${x}`} x={x} y="0" width="6.25" height="100" />
            ))}
            {stripes.map((y) => (
              <rect key={`h${y}`} x="0" y={y} width="100" height="6.25" />
            ))}
          </g>
          <g stroke={D.sheet} strokeOpacity="0.45" strokeWidth="0.35">
            {stripes.map((x) => (
              <path key={x} d={`M${x + 3.125} 0 V100`} strokeDasharray="0.8 1.2" />
            ))}
          </g>
        </g>
      )
    },
  },

  'backdrop-memphis': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('dots')} s={2.6} r={0.55} fill={D.ink} angle={0} />
        </defs>
        <rect width="100" height="100" fill={D.sheet} />
        <circle cx="50" cy="54" r="34" fill={D.saffronSoft} />
        {/* top left: teal squiggle + dot patch */}
        <rect x="-4" y="-4" width="26" height="22" fill={`url(#${u('dots')})`} opacity="0.55" />
        <path d={wave(10, 3.2, 9, 4, 34)} fill="none" stroke={D.teal} strokeWidth="2.4" strokeLinecap="round" />
        {/* top right: sienna triangle outline + pink disc */}
        <circle cx="90" cy="9" r="9" fill={PINK} />
        <path d="M72 22 L84 4 L94 26Z" fill="none" stroke={D.ink} strokeWidth="1.6" strokeLinejoin="round" />
        {/* left middle: zigzag */}
        <path d="M3 44 L7 39 L11 44 L15 39 L19 44" fill="none" stroke={D.sienna} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" transform="rotate(-80 11 42)" />
        {/* right middle: lilac half disc */}
        <path d="M100 38 A12 12 0 0 0 100 62Z" fill={LILAC} />
        <path d="M95 45 L99 49 M95 51 L99 55" stroke={D.ink} strokeWidth="1" strokeLinecap="round" />
        {/* bottom left: saffron disc with ink ring + confetti */}
        <circle cx="10" cy="88" r="11" fill={D.saffron} />
        <circle cx="16" cy="84" r="11" fill="none" stroke={D.ink} strokeWidth="1.4" />
        {/* bottom right: teal block, hatch dots */}
        <rect x="76" y="80" width="18" height="18" fill={D.teal} transform="rotate(14 85 89)" />
        <rect x="70" y="86" width="16" height="16" fill={`url(#${u('dots')})`} opacity="0.7" />
        {/* confetti */}
        {(
          [
            [30, 6, 20, D.sienna],
            [62, 5, -30, D.teal],
            [40, 95, 60, D.teal],
            [58, 92, 10, D.sienna],
            [4, 64, -15, D.saffron],
            [95, 70, 40, D.saffron],
            [24, 30, 75, LILAC],
            [80, 34, -50, PINK],
          ] as [number, number, number, string][]
        ).map(([x, y, r, f]) => (
          <rect key={`${x}-${y}`} x={x - 2.2} y={y - 0.8} width="4.4" height="1.6" rx="0.6" fill={f} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <path d="M44 12 l1.6 -1.6 M47 9.6 l1.6 -1.6 M50 7.2 l1.6 -1.6" stroke={D.ink} strokeWidth="0.8" strokeLinecap="round" />
      </g>
    ),
  },

  'backdrop-bauhaus': {
    draw: () => {
      // 4×4 cells of quarter circles; the middle cells are soft tints so the avatar stays clear.
      type Cell = { bg: string; fg: string; kind: 'q0' | 'q1' | 'q2' | 'q3' | 'half' | 'disc' | 'none' }
      const bold = [D.sienna, D.teal, D.saffron, D.ink, D.sandy]
      const soft = [D.siennaSoft, D.tealSoft, D.saffronSoft, D.sandySoft, D.paper]
      const kinds: Cell['kind'][] = ['q0', 'half', 'disc', 'q2', 'q1', 'q3', 'half', 'q0', 'disc', 'q3', 'q2', 'half', 'q1', 'disc', 'q0', 'q2']
      const cells: Cell[] = kinds.map((kind, i) => {
        const x = i % 4
        const y = Math.floor(i / 4)
        const inner = x > 0 && x < 3 && y > 0 && y < 3
        const pal = inner ? soft : bold
        const bg = inner ? D.sheet : pal[(i * 3) % 5]
        let fg = pal[(i * 3 + 2) % 5]
        if (fg === bg) fg = pal[(i * 3 + 3) % 5]
        return { bg, fg, kind }
      })
      const s = 25
      return (
        <g>
          {cells.map((c, i) => {
            const x = (i % 4) * s
            const y = Math.floor(i / 4) * s
            let shape = null
            if (c.kind === 'disc') shape = <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.36} fill={c.fg} />
            else if (c.kind === 'half') shape = <path d={`M${x} ${y + s} A${s / 2} ${s / 2} 0 0 1 ${x + s} ${y + s}Z`} fill={c.fg} />
            else {
              const corner = { q0: [x, y], q1: [x + s, y], q2: [x + s, y + s], q3: [x, y + s] }[c.kind]
              shape = <circle cx={corner[0]} cy={corner[1]} r={s} fill={c.fg} clipPath="none" />
            }
            return (
              <g key={i}>
                <svg x={x} y={y} width={s} height={s} viewBox={`${x} ${y} ${s} ${s}`} overflow="hidden">
                  <rect x={x} y={y} width={s} height={s} fill={c.bg} />
                  {shape}
                </svg>
              </g>
            )
          })}
          <path d="M25 0 V100 M50 0 V100 M75 0 V100 M0 25 H100 M0 50 H100 M0 75 H100" stroke={D.sheet} strokeWidth="0.8" />
        </g>
      )
    },
  },

  'backdrop-groovy': {
    draw: () => {
      const rings: [number, string][] = [
        [96, D.teal],
        [84, D.sheet],
        [80, D.saffron],
        [68, D.sheet],
        [64, D.sandy],
        [52, D.sheet],
        [48, D.sienna],
        [36, D.sheet],
        [32, D.siennaSoft],
      ]
      return (
        <g>
          <rect width="100" height="100" fill={D.tealDeep} />
          {rings.map(([r, fill], i) => (
            <path key={i} d={wobble(50, 56, r, r * 0.045, 9, i * 0.15, 140)} fill={fill} />
          ))}
          <circle cx="50" cy="56" r="22" fill={D.sandySoft} />
          {[
            [10, 12],
            [88, 90],
            [90, 14],
            [9, 90],
          ].map(([x, y]) => (
            <path key={`${x}`} d={sparkle(x, y, 3.2)} fill={D.sheet} />
          ))}
        </g>
      )
    },
  },
}
