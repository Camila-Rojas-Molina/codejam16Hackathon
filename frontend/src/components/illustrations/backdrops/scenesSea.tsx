// By the water: tropical beach, lighthouse coast, coral reef.
import { Bands, Birds, Cloud, Dots, Palm } from './kit'
import { D, fx, hills, scatter, star5, wave, type SceneDef } from './util'

const SEA = '#3f9fae'
const SEA_DEEP = '#2b7d8c'
const SAND = '#f3dcae'
const SAND_DEEP = '#e2be86'
const PALM_TRUNK = '#9a6a45'
const PALM_LEAF = '#3f8f6a'
const PALM_LEAF_DEEP = '#2d6f52'
const COAST_SKY = '#d3e8ec'
const ROCK = '#7d6b5d'
const ROCK_DEEP = '#5e4f45'
const GRASS = '#7fae7a'
const REEF_TOP = '#7fcbc0'
const REEF_MID = '#3f9f97'
const REEF_DEEP = '#22717a'
const REEF_FLOOR = '#e7cf9c'
const KELP = '#2f7a5a'
const CORAL_PINK = '#f19a8c'
const LILAC = '#b7a7d6'

export const SEA_SCENES: Record<string, SceneDef> = {
  'backdrop-beach': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('sand')} s={2.2} r={0.3} fill={SAND_DEEP} o={0.8} angle={15} />
        </defs>
        <Bands
          bands={[
            ['#bfe3e6', 24],
            [D.tealSoft, 56],
          ]}
        />
        <circle cx="80" cy="16" r="8" fill={D.saffron} />
        <circle cx="80" cy="16" r="11.5" fill="none" stroke={D.saffron} strokeOpacity="0.4" strokeWidth="1.6" />
        <Cloud x={36} y={18} w={18} fill={D.sheet} />
        <Cloud x={58} y={32} w={12} fill={D.sheet} o={0.8} />
        {/* sea */}
        <rect y="56" width="100" height="18" fill={SEA} />
        <rect y="56" width="100" height="2.4" fill={SEA_DEEP} />
        <g fill="none" stroke={D.tealSoft} strokeWidth="0.6" strokeLinecap="round" strokeOpacity="0.8">
          <path d="M30 61 h8 M56 63 h10 M40 67 h6 M70 68 h8 M20 66 h5" />
        </g>
        {/* sailboat */}
        <path d="M60 55 L60 47 L65 55Z" fill={D.sheet} />
        <path d="M58 55.4 H66 L65 57 H59Z" fill={D.sienna} />
        {/* sand + foam */}
        <path d={hills([[0, 72], [20, 70], [44, 74], [70, 71], [100, 73]])} fill={D.sheet} />
        <path d={hills([[0, 74], [20, 72.4], [44, 76], [70, 73.4], [100, 75]])} fill={SAND} />
        <rect y="78" width="100" height="22" fill={`url(#${u('sand')})`} />
        <Palm x={7} y={100} tx={14} ty={30} trunk={PALM_TRUNK} leaf={PALM_LEAF} leafDark={PALM_LEAF_DEEP} s={1.15} />
        <Palm x={-2} y={96} tx={2} ty={48} trunk={PALM_TRUNK} leaf={PALM_LEAF_DEEP} leafDark={PALM_LEAF} s={0.85} />
        <Palm x={95} y={100} tx={88} ty={44} trunk={PALM_TRUNK} leaf={PALM_LEAF} leafDark={PALM_LEAF_DEEP} s={1} />
        {/* umbrella, towel, starfish */}
        <path d="M78 96 L84 78" stroke={PALM_TRUNK} strokeWidth="0.8" />
        <path d="M74 80 Q84 70 94 80 Q91 78.4 89 80 Q86.4 78 84 80 Q81.4 78 79 80 Q76.6 78.4 74 80Z" fill={D.sienna} transform="rotate(20 84 78)" />
        <path d="M80.4 76 Q84 72 87.6 76" fill="none" stroke={D.sheet} strokeWidth="1.4" transform="rotate(20 84 78)" />
        <rect x="64" y="90" width="14" height="6" fill={D.teal} transform="rotate(-8 71 93)" />
        <path d="M66 89.6 V96 M69 89 V95.6 M72 88.6 V95.2" stroke={D.sheet} strokeWidth="0.8" transform="rotate(-8 71 93)" />
        <path d={star5(24, 92, 3.2, 0.42)} fill={D.sandy} transform="rotate(12 24 92)" />
        <ellipse cx="34" cy="96" rx="1.8" ry="1.2" fill={D.siennaSoft} />
        <Birds pts={[[30, 26, 1], [36, 22, 0.8]]} stroke={SEA_DEEP} />
      </g>
    ),
  },

  'backdrop-lighthouse': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('dots')} s={2.2} r={0.4} fill={SEA_DEEP} o={0.4} />
          <linearGradient id={u('beam')} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="var(--day-saffron)" stopOpacity="0.7" />
            <stop offset="1" stopColor="var(--day-saffron)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Bands
          bands={[
            ['#bcd9e2', 24],
            [COAST_SKY, 50],
            ['#e8f2ef', 64],
          ]}
        />
        <rect width="100" height="9" fill={`url(#${u('dots')})`} />
        <Cloud x={6} y={24} w={24} fill={D.sheet} />
        <Cloud x={38} y={14} w={14} fill={D.sheet} o={0.75} />
        {/* beam */}
        <path d="M80 23 L18 10 L20 34Z" fill={`url(#${u('beam')})`} />
        {/* distant island */}
        <path d="M-2 64 Q6 56 14 60 Q20 57 26 64Z" fill="#9cbfc4" />
        {/* sea */}
        <rect y="64" width="100" height="36" fill={SEA} />
        <rect y="64" width="100" height="2" fill={SEA_DEEP} fillOpacity="0.6" />
        <g fill="none" stroke={D.tealSoft} strokeWidth="0.7" strokeLinecap="round" strokeOpacity="0.85">
          <path d={wave(74, 1, 6, 0, 30)} />
          <path d={wave(84, 1.2, 7, 4, 40)} />
          <path d={wave(93, 1.3, 8, -2, 44)} />
          <path d={wave(80, 1, 6, 40, 66)} />
          <path d={wave(90, 1, 7, 46, 72)} />
        </g>
        {/* sailboat */}
        <path d="M30 63 L30 54 L36 63Z" fill={D.sheet} />
        <path d="M29.4 63 L29.4 56 L25.6 63Z" fill={D.sienna} />
        <path d="M24.6 63.4 H37 L35.6 65.4 H26Z" fill={D.ink} />
        {/* cliff */}
        <path d="M66 100 L68 80 L72 70 L78 64 L90 60 L102 60 L102 100Z" fill={ROCK} />
        <path d="M70 100 L72 84 L76 76 L82 72 L84 100Z" fill={ROCK_DEEP} fillOpacity="0.6" />
        <path d="M76 66 Q80 62 90 60 L102 60 V64 Q92 62 84 66 Q80 68 76 66Z" fill={GRASS} />
        <path d={wave(98, 1, 5, 60, 104)} fill="none" stroke={D.sheet} strokeWidth="1" />
        {/* lighthouse */}
        <path d="M76 62 L78 30 L86 30 L88 62Z" fill={D.sheet} />
        <path d="M77.3 44 L86.7 44 L87 50 L77 50Z M76.5 56 L87.5 56 L87.8 62 L76.2 62Z M78 30 L86 30 L86.3 38 L77.7 38Z" fill={D.sienna} />
        <rect x="76" y="28" width="12" height="2" fill={D.ink} />
        <rect x="78.4" y="21" width="7.2" height="7" fill={D.saffron} />
        <path d="M78.4 21 V28 M82 21 V28 M85.6 21 V28" stroke={D.ink} strokeWidth="0.6" />
        <path d="M77 21 L82 15 L87 21Z" fill={D.sienna} />
        <rect x="81" y="50.5" width="2" height="4" rx="1" fill={D.ink} />
        <Birds pts={[[50, 30, 1.2], [56, 34, 0.9], [46, 38, 0.8]]} stroke={SEA_DEEP} />
      </g>
    ),
  },

  'backdrop-reef': {
    motion: true,
    draw: (u) => {
      const bubbles = scatter(31, 14, { y1: 100, hole: [50, 54, 34, 40] })
      const bubbleLayer = (dy: number) => (
        <g transform={`translate(0 ${dy})`}>
          {bubbles.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={fx(0.6 + b.t * 1.1)} fill="none" stroke={D.sheet} strokeOpacity="0.75" strokeWidth="0.4" />
          ))}
        </g>
      )
      const fish = (x: number, y: number, s: number, body: string, stripe: string, flip = false) => (
        <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
          <path d="M-5 0 Q-1 -3.6 4 0 Q-1 3.6 -5 0Z" fill={body} />
          <path d="M3.4 0 L6.4 -2.4 L6 0 L6.4 2.4Z" fill={body} />
          <path d="M-0.6 -2.5 Q0.4 0 -0.6 2.5" stroke={stripe} strokeWidth="0.8" fill="none" />
          <circle cx="-3.2" cy="-0.5" r="0.45" fill={D.ink} />
        </g>
      )
      return (
        <g>
          <defs>
            <Dots id={u('sand')} s={2} r={0.3} fill="#c9a66b" o={0.8} />
          </defs>
          <Bands
            bands={[
              [REEF_TOP, 18],
              ['#5fb8ae', 40],
              [REEF_MID, 66],
              [REEF_DEEP, 100],
            ]}
          />
          {/* light rays */}
          <g fill={D.sheet} fillOpacity="0.12">
            <path d="M18 0 L28 0 L8 70 L-4 70Z" />
            <path d="M44 0 L50 0 L46 60 L36 60Z" />
            <path d="M72 0 L80 0 L100 66 L90 66Z" />
          </g>
          <path d={wave(3, 1, 8)} fill="none" stroke={D.sheet} strokeOpacity="0.5" strokeWidth="0.7" />
          {/* kelp */}
          <g fill="none" stroke={KELP} strokeWidth="2.2" strokeLinecap="round">
            <path className="mbd-sway" d="M4 100 Q0 86 6 74 Q11 62 5 50 Q1 42 6 34" />
            <path className="mbd-sway" style={{ animationDelay: '-2s' }} d="M10 100 Q14 88 9 78 Q5 68 11 58" />
            <path className="mbd-sway" style={{ animationDelay: '-4s' }} d="M96 100 Q100 84 94 72 Q89 60 95 48 Q99 40 94 30" />
          </g>
          {/* sea floor */}
          <path d={hills([[0, 88], [24, 84], [50, 87], [76, 83], [100, 87]])} fill={REEF_FLOOR} />
          <path d={hills([[0, 88], [24, 84], [50, 87], [76, 83], [100, 87]])} fill={`url(#${u('sand')})`} />
          {/* corals */}
          <g fill="none" stroke={CORAL_PINK} strokeWidth="2" strokeLinecap="round">
            <path d="M20 90 V78 M20 84 L15 78 L15 72 M20 80 L25 74 L25 68 M15 76 L12 73 M25 71 L28 68" />
          </g>
          <path d="M70 90 Q66 76 74 70 Q80 66 86 72 Q92 80 84 90Z" fill={D.sandy} />
          <path d="M71 88 Q72 76 78 72 M76 88 Q78 78 84 74 M80 88 Q84 82 88 80" stroke={D.siennaDeep} strokeWidth="0.5" fill="none" strokeOpacity="0.6" />
          <ellipse cx="36" cy="88" rx="7" ry="4.6" fill={D.saffron} />
          <path d={wave(87, 0.8, 3, 30, 42)} fill="none" stroke={D.sandy} strokeWidth="0.6" />
          <path d={wave(89.4, 0.8, 3, 31, 41)} fill="none" stroke={D.sandy} strokeWidth="0.6" />
          <g fill={LILAC}>
            <circle cx="58" cy="88" r="2.2" />
            <circle cx="61.6" cy="86.6" r="1.6" />
            <circle cx="55.2" cy="86" r="1.4" />
          </g>
          <path d={star5(92, 94, 3, 0.42)} fill={D.sienna} />
          <path d="M44 96 Q46 92 48 96Z M47 97 Q49 93.4 51 97Z" fill={D.sheet} fillOpacity="0.8" />
          {/* fish */}
          <g className="mbd-drift">
            {fish(16, 20, 1.1, D.saffron, D.sheet)}
            {fish(10, 28, 0.7, D.saffron, D.sheet)}
          </g>
          <g className="mbd-drift2">
            {fish(86, 44, 1, D.sienna, D.sheet, true)}
            {fish(80, 16, 0.8, LILAC, D.sheet, true)}
          </g>
          {/* bubbles: two stacked copies loop seamlessly upward */}
          <g className="mbd-rise">
            {bubbleLayer(0)}
            {bubbleLayer(100)}
          </g>
        </g>
      )
    },
  },
}
