// Necklaces, scarves and things hung round the neck (slot 'neck').
//
// Local space: (0, 0) is the centre of the neck line (where a collar would sit). Strings and straps
// start near x = ±50 slightly above it (y ≈ −8) and hang down; pendants hang below y = 0.
import { C, LINE, line, shine, heartPath, starPath, alongCubic } from './palette'
import { Flower } from './HatArt'

const CHAIN: [[number, number], [number, number], [number, number], [number, number]] = [
  [-46, -9],
  [-30, 19],
  [30, 19],
  [46, -9],
]
const chainPath = `M${CHAIN[0].join(' ')} C${CHAIN[1].join(' ')} ${CHAIN[2].join(' ')} ${CHAIN[3].join(' ')}`

export function NeckArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'scarf':
      return (
        <g>
          <path d="M10 10 L22 48 L5 47 L-3 12 Z" fill={C.sienna} {...s} />
          <path d="M-50 -10 C-20 4 20 4 50 -10 L50 6 C20 22 -20 22 -50 6 Z" fill={C.sienna} {...s} />
          <path d="M-32 1 L-32 11 M-11 5 L-11 15 M11 5 L11 15 M32 1 L32 11 M10 30 L19 29" stroke={C.sheet} strokeWidth={sw * 1.1} strokeLinecap="round" />
        </g>
      )
    case 'bow-tie':
      return (
        <g>
          <path d="M-4 0 L-30 -15 Q-35 0 -30 15 Z" fill={C.sienna} {...s} />
          <path d="M4 0 L30 -15 Q35 0 30 15 Z" fill={C.sienna} {...s} />
          <circle cx="-22" cy="-4" r="2.6" fill={C.sheet} />
          <circle cx="-21" cy="6" r="2.6" fill={C.sheet} />
          <circle cx="22" cy="-4" r="2.6" fill={C.sheet} />
          <circle cx="21" cy="6" r="2.6" fill={C.sheet} />
          <rect x="-7" y="-8" width="14" height="16" rx="4" fill={C.sienna} {...s} />
        </g>
      )
    case 'camera':
      return (
        <g>
          <path d="M-48 -16 C-34 20 34 20 48 -16" fill="none" {...s} />
          <rect x="-16" y="0" width="12" height="8" rx="2" fill={C.ink} {...s} />
          <rect x="-24" y="6" width="48" height="31" rx="4" fill={C.ink} {...s} />
          <circle cx="0" cy="21.5" r="10" fill={C.tealSoft} stroke={C.sheet} strokeWidth={sw} />
          <circle cx="15" cy="13" r="2.6" fill={C.saffron} />
        </g>
      )
    case 'pearls':
      return (
        <g>
          {alongCubic(...CHAIN, 15).map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4.3" fill={C.sheet} {...line(sw * 0.8)} />
              <circle cx={x - 1.3} cy={y - 1.4} r="1.1" fill={C.paper} />
            </g>
          ))}
          <path d="M0 17 L0 20" fill="none" {...line(sw * 0.8)} />
          <path d="M0 19 C5 24 7 30 0 34 C-7 30 -5 24 0 19 Z" fill={C.sheet} {...line(sw * 0.8)} />
          <path d="M-3 18.5 C-1 16.8 1 16.8 3 18.5 L2 21 L-2 21 Z" fill={C.saffron} {...line(sw * 0.6)} />
          <path d="M-2 26 L-2.5 29" {...shine(sw, 0.8)} />
        </g>
      )
    case 'locket':
      return (
        <g>
          <path d={chainPath} fill="none" stroke={LINE} strokeWidth={sw * 2} strokeLinecap="round" />
          <path d={chainPath} fill="none" stroke={C.saffron} strokeWidth={sw * 1} strokeDasharray={`${sw * 1.6} ${sw * 1}`} />
          <circle cx="0" cy="13.5" r="2.6" fill="none" {...line(sw * 0.9)} />
          <path d={heartPath(0, 26, 24)} fill={C.saffron} {...s} />
          <path d={heartPath(0, 26, 15)} fill="none" {...line(sw * 0.6)} />
          <path d="M-7 20 C-6 18 -4 17 -2 17.5" {...shine(sw, 0.9)} />
        </g>
      )
    case 'lei': {
      const fills = [C.sienna, C.saffron, C.sheet, C.sandy, C.siennaSoft]
      const pts = alongCubic([-52, -8], [-34, 28], [34, 28], [52, -8], 9)
      return (
        <g>
          {alongCubic([-52, -8], [-34, 28], [34, 28], [52, -8], 8).map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y + 5} rx="4" ry="7" transform={`rotate(${i * 22 - 70} ${x} ${y + 5})`} fill={C.teal} {...line(sw * 0.6)} />
          ))}
          {pts.map(([x, y], i) => (
            <Flower key={i} x={x} y={y} r={4.6} fill={fills[i % fills.length]} sw={sw} />
          ))}
        </g>
      )
    }
    case 'medal':
      return (
        <g>
          <path d="M-30 -9 L-18 -9 L6 21 L-5 24 Z" fill={C.teal} {...s} />
          <path d="M30 -9 L18 -9 L-6 21 L5 24 Z" fill={C.sienna} {...s} />
          <path d="M-24 -6 L-2 21 M24 -6 L2 21" fill="none" stroke={C.sheet} strokeWidth={sw * 0.8} strokeLinecap="round" />
          <circle cx="0" cy="33" r="13" fill={C.saffron} {...s} />
          <circle cx="0" cy="33" r="9" fill="none" {...line(sw * 0.6)} />
          <path d={starPath(0, 33.5, 6.5)} fill={C.saffronSoft} {...line(sw * 0.6)} />
          <path d="M-8 26 C-6 23 -3 22 0 22" {...shine(sw)} />
        </g>
      )
    case 'bandana':
      return (
        <g>
          <path d="M-47 -9 C-20 -1 20 -1 47 -9 C31 6 14 26 0 40 C-14 26 -31 6 -47 -9 Z" fill={C.sienna} {...s} />
          <path d="M-38 -3 C-20 3 20 3 38 -3 C26 8 12 23 0 33 C-12 23 -26 8 -38 -3 Z" fill="none" stroke={C.sheet} strokeWidth={sw * 0.8} strokeDasharray={`${sw * 1.6} ${sw * 1.6}`} strokeLinecap="round" />
          {[
            [-22, 6],
            [0, 9],
            [22, 6],
            [-10, 18],
            [10, 18],
            [0, 27],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={C.sheet} />
          ))}
          <circle cx="42" cy="-8" r="5" fill={C.sienna} {...s} />
          <path d="M44 -4 L49 6 L43 4 Z" fill={C.sienna} {...line(sw * 0.8)} />
        </g>
      )
    case 'passport-lanyard':
      return (
        <g>
          <path d="M-38 -9 L-30 -11 L3 21 L-4 25 Z" fill={C.teal} {...s} />
          <path d="M38 -9 L30 -11 L-3 21 L4 25 Z" fill={C.teal} {...s} />
          <path d="M-33 -7 L-1 22" fill="none" stroke={C.sheet} strokeWidth={sw * 0.7} strokeDasharray={`${sw * 1.4} ${sw * 1.6}`} />
          <path d="M33 -7 L1 22" fill="none" stroke={C.sheet} strokeWidth={sw * 0.7} strokeDasharray={`${sw * 1.4} ${sw * 1.6}`} />
          <rect x="-4.5" y="21" width="9" height="9" rx="2" fill={C.saffron} {...line(sw * 0.8)} />
          <rect x="-15" y="28" width="30" height="38" rx="3" fill={C.tealDeep} {...s} />
          <circle cx="0" cy="44" r="7.5" fill="none" stroke={C.saffron} strokeWidth={sw * 0.9} />
          <path d="M-7.5 44 L7.5 44 M0 36.5 C-4 40 -4 48 0 51.5 C4 48 4 40 0 36.5" fill="none" stroke={C.saffron} strokeWidth={sw * 0.7} />
          <path d="M-8 57 L8 57 M-5 61 L5 61" fill="none" stroke={C.saffron} strokeWidth={sw * 0.9} strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}
