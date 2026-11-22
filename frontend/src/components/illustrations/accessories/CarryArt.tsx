// Things carried: on the back (slot 'back', drawn BEHIND the character so they peek out round its
// edges) and in a hand (slot 'hand').
//
// 'back' local space: (0, 0) is the centre of the piece, about 100 units across.
// 'hand' local space: (0, 0) is the grip point, the middle of the character's closed fist. The
// piece is drawn as held in a right-hand fist (it leans right); fits flip it for the other hand.
import { C, LINE, line, shine, heartPath } from './palette'
import { Band } from './HatArt'

export function BackArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'backpack':
      return (
        <g>
          <path d="M-11 -42 C-11 -58 11 -58 11 -42" fill="none" stroke={LINE} strokeWidth={sw * 4.4} strokeLinecap="round" />
          <path d="M-11 -42 C-11 -58 11 -58 11 -42" fill="none" stroke={C.ink} strokeWidth={sw * 2.4} strokeLinecap="round" />
          <path d="M-36 -28 C-36 -50 36 -50 36 -28 L38 40 C38 50 -38 50 -38 40 Z" fill={C.teal} {...s} />
          <path d="M-34 -30 C-30 -46 30 -46 34 -30 L33 -4 C20 3 -20 3 -33 -4 Z" fill={C.sandy} {...s} />
          <path d="M-26 -30 C-22 -38 -14 -41 -6 -42" {...shine(sw)} />
          <rect x="-26" y="12" width="52" height="28" rx="8" fill={C.sandy} {...s} />
          <path d="M-20 18 L20 18" fill="none" {...line(sw * 0.6)} />
          {[-16, 16].map((x) => (
            <g key={x}>
              <path d={`M${x} -4 L${x} 8`} fill="none" stroke={C.ink} strokeWidth={sw * 2.2} />
              <rect x={x - 5} y="2" width="10" height="7" rx="1.5" fill={C.saffron} {...line(sw * 0.8)} />
            </g>
          ))}
        </g>
      )
    case 'hiking-pack':
      return (
        <g>
          <path d="M-30 -36 C-30 -50 30 -50 30 -36 L34 44 C34 54 -34 54 -34 44 Z" fill={C.sienna} {...s} />
          <rect x="31" y="8" width="13" height="34" rx="5" fill={C.teal} {...s} />
          <rect x="32" y="3" width="11" height="7" rx="2" fill={C.ink} {...line(sw * 0.8)} />
          <path d="M-32 -42 C-32 -58 32 -58 32 -42 L30 -26 C10 -21 -10 -21 -30 -26 Z" fill={C.sandy} {...s} />
          <path d="M-24 -46 C-20 -52 -12 -54 -4 -54" {...shine(sw)} />
          <path d="M-33 0 L33 0 M-34 22 L34 22" fill="none" stroke={C.ink} strokeWidth={sw * 2.4} />
          <rect x="-20" y="4" width="40" height="30" rx="6" fill={C.siennaDeep} {...s} />
          <rect x="-50" y="-76" width="100" height="20" rx="10" fill={C.saffron} {...s} />
          <path d="M-30 -76 L-30 -56 M30 -76 L30 -56" fill="none" stroke={C.teal} strokeWidth={sw * 3} />
          <path d="M-14 -74 C-14 -64 -14 -64 -14 -58 M14 -74 L14 -58" fill="none" stroke={C.ink} strokeWidth={sw * 1.6} />
          <ellipse cx="47" cy="-66" rx="4" ry="9" fill={C.saffronSoft} {...line(sw * 0.8)} />
          <path d="M-40 -71 L-24 -71" {...shine(sw)} />
        </g>
      )
    case 'butterfly-wings':
      return (
        <g>
          {[-1, 1].map((k) => (
            <g key={k} transform={`scale(${k} 1)`}>
              <path d="M-4 -2 C-16 -40 -46 -56 -52 -32 C-56 -14 -34 0 -4 -2 Z" fill={C.teal} {...s} />
              <path d="M-4 2 C-26 4 -46 18 -40 36 C-34 50 -12 34 -4 6 Z" fill={C.saffron} {...s} />
              <path d="M-8 -6 C-20 -18 -32 -26 -44 -30 M-8 4 C-18 12 -26 22 -32 32" fill="none" {...line(sw * 0.6)} />
              <circle cx="-38" cy="-30" r="6" fill={C.sienna} {...line(sw * 0.8)} />
              <circle cx="-38" cy="-30" r="2.2" fill={C.sheet} />
              <circle cx="-26" cy="-14" r="3" fill={C.saffronSoft} {...line(sw * 0.6)} />
              <circle cx="-30" cy="26" r="4.4" fill={C.sienna} {...line(sw * 0.7)} />
              <circle cx="-20" cy="16" r="2.4" fill={C.sheet} />
              <path d="M-44 -40 C-40 -44 -34 -46 -30 -45" {...shine(sw)} />
            </g>
          ))}
        </g>
      )
    default:
      return null
  }
}

export function HandArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'map-scroll':
      return (
        <g>
          <path d="M0 -21 C20 -25 42 -17 62 -23 L62 19 C42 25 20 17 0 21 Z" fill={C.sheet} {...s} />
          <path d="M6 -8 C16 -4 18 8 30 6 C40 4 42 -12 56 -10" fill="none" stroke={C.teal} strokeWidth={sw * 1.8} strokeLinecap="round" />
          <path d="M10 14 C18 10 26 16 34 12 C40 9 44 2 48 0" fill="none" stroke={C.sienna} strokeWidth={sw * 1} strokeDasharray={`${sw * 1.6} ${sw * 1.4}`} strokeLinecap="round" />
          <path d="M45 -4 L51 2 M51 -4 L45 2" fill="none" stroke={C.sienna} strokeWidth={sw * 1.3} strokeLinecap="round" />
          <circle cx="16" cy="-14" r="3.6" fill={C.tealSoft} {...line(sw * 0.6)} />
          <rect x="-6" y="-26" width="12" height="52" rx="6" fill={C.saffronSoft} {...s} />
          <rect x="57" y="-27" width="12" height="51" rx="6" fill={C.saffronSoft} {...s} />
          <path d="M-2.5 -20 L-2.5 -10 M60.5 -21 L60.5 -11" {...shine(sw)} />
        </g>
      )
    case 'ice-cream':
      return (
        <g>
          <path d="M-14 -8 L14 -8 L1 30 Z" fill={C.sandy} {...s} />
          <path d="M-9 -8 L5 18 M1 -8 L10 6 M9 -8 L-4 22 M-1 -8 L-8 6" fill="none" {...line(sw * 0.55)} />
          <circle cx="1" cy="-42" r="12" fill={C.saffronSoft} {...s} />
          <path d="M-15 -10 C-19 -22 -10 -32 1 -31 C12 -32 21 -22 17 -10 C14 -6 12 -4 10 -8 C8 -4 4 -2 2 -8 C-2 -3 -6 -4 -7 -8 C-10 -4 -13 -5 -15 -10 Z" fill={C.siennaSoft} {...s} />
          <path d="M-8 -26 C-6 -29 -3 -30 0 -30 M-6 -48 C-4 -51 -1 -52 2 -52" {...shine(sw)} />
          <path d="M3 -54 C4 -60 8 -64 12 -64" fill="none" {...line(sw * 0.8)} />
          <circle cx="2" cy="-56" r="4.6" fill={C.sienna} {...line(sw * 0.8)} />
        </g>
      )
    case 'balloon':
      return (
        <g>
          <path d="M0 0 C6 -16 -6 -36 2 -56 C5 -64 6 -70 5 -78" fill="none" {...line(sw * 0.8)} />
          <path d="M5 -79 L1 -74 L9 -74 Z" fill={C.sienna} {...line(sw * 0.7)} />
          <path d="M5 -79 C-16 -82 -22 -112 -10 -124 C0 -134 20 -130 26 -114 C31 -98 22 -80 5 -79 Z" fill={C.sienna} {...s} />
          <path d="M-8 -112 C-6 -118 -2 -122 4 -123" {...shine(sw, 1.3)} />
        </g>
      )
    case 'tote-bag':
      return (
        <g>
          <Band d="M-15 26 C-15 6 -7 -3 0 -3 C7 -3 15 6 15 26" fill={C.teal} sw={sw} k={1.6} />
          <path d="M-26 22 L26 22 L29 72 L-29 72 Z" fill={C.saffronSoft} {...s} />
          <path d="M-26.4 29 L26.4 29 L26.8 36 L-26.8 36 Z" fill={C.teal} {...line(sw * 0.8)} />
          <path d={heartPath(0, 52, 18)} fill={C.sienna} {...line(sw * 0.8)} />
          <path d="M-20 40 L-20.5 50" {...shine(sw)} />
        </g>
      )
    default:
      return null
  }
}
