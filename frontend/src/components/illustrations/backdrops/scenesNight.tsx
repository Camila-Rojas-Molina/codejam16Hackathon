// After dark: starry night, outer space, northern lights, neon street.
import { Bands, Dots, Pine, Stars } from './kit'
import { D, fx, hills, ridge, sparkle, type SceneDef } from './util'

const NIGHT = '#1f3550'
const NIGHT_DEEP = '#172a40'
const NIGHT_HORIZON = '#2f4d6a'
const HILL_NIGHT = '#13212f'
const HILL_NIGHT_2 = '#1b2e40'
const SPACE = '#1c1d3c'
const SPACE_2 = '#25275080'
const NEBULA_PLUM = '#6b3f74'
const NEBULA_TEAL = '#2a9d8f'
const CRATER = '#c4573c'
const MOON_GREY = '#c9c7d6'
const AURORA_GREEN = '#5fe0b0'
const AURORA_TEAL = '#4cc7c0'
const AURORA_LILAC = '#a58be0'
const AURORA_SKY = '#132a3d'
const SNOW = '#e6eef2'
const SNOW_SHADE = '#c3d3de'
const PINE_NIGHT = '#0f2230'
const STREET_SKY = '#211d36'
const BRICK_NIGHT = '#2e2945'
const BRICK_NIGHT_2 = '#3a3354'
const NEON_PINK = '#ff7aa8'
const NEON_TEAL = '#5ff0dc'
const NEON_YELLOW = '#ffd76a'
const WET = '#2b2742'

export const NIGHT_SCENES: Record<string, SceneDef> = {
  'backdrop-starry-night': {
    dark: true,
    motion: true,
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('dots')} s={2.2} r={0.45} fill={NIGHT_HORIZON} o={1} />
        </defs>
        <Bands
          bands={[
            [NIGHT_DEEP, 30],
            [NIGHT, 58],
            [NIGHT_HORIZON, 80],
          ]}
        />
        <rect y="40" width="100" height="18" fill={`url(#${u('dots')})`} />
        <Stars seed={11} n={46} y1={72} sparkles={7} twinkle fill={D.saffronSoft} />
        {/* crescent moon */}
        <circle cx="80" cy="18" r="9" fill={D.saffron} />
        <circle cx="84.5" cy="14.5" r="7.8" fill={NIGHT_DEEP} />
        <circle cx="80" cy="18" r="13" fill="none" stroke={D.saffron} strokeOpacity="0.18" strokeWidth="2.4" />
        {/* shooting star */}
        <path d="M8 16 L24 8" stroke={D.saffronSoft} strokeWidth="0.6" strokeLinecap="round" strokeOpacity="0.8" />
        <path d={sparkle(24, 8, 1.6)} fill={D.saffronSoft} />
        {/* hills + little town */}
        <path d={hills([[0, 76], [18, 70], [36, 76], [56, 79], [76, 72], [100, 76]])} fill={HILL_NIGHT_2} />
        <path d={hills([[0, 86], [22, 80], [50, 86], [78, 82], [100, 86]])} fill={HILL_NIGHT} />
        <g fill={HILL_NIGHT}>
          <path d="M2 86 V76 L6 72 L10 76 V86Z" />
          <path d="M10 86 V78 H18 V86Z" />
          <path d="M18 86 V70 L21 64 L24 70 V86Z" />
          <path d="M80 86 V77 L84 73 L88 77 V86Z" />
          <path d="M88 86 V79 H97 V86Z" />
        </g>
        <g fill={D.saffron}>
          {[
            [5, 79],
            [7, 79],
            [13, 81],
            [15.4, 81],
            [20.4, 74],
            [83, 80],
            [91, 82],
            [93.6, 82],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1.4" height="1.8" className="mbd-glow" style={{ animationDelay: `${fx(-x / 20)}s` }} />
          ))}
        </g>
        <rect y="86" width="100" height="14" fill={HILL_NIGHT} />
      </g>
    ),
  },

  'backdrop-outer-space': {
    dark: true,
    motion: true,
    draw: (u) => (
      <g>
        <defs>
          <radialGradient id={u('neb1')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={NEBULA_PLUM} stopOpacity="0.7" />
            <stop offset="1" stopColor={NEBULA_PLUM} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={u('neb2')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={NEBULA_TEAL} stopOpacity="0.45" />
            <stop offset="1" stopColor={NEBULA_TEAL} stopOpacity="0" />
          </radialGradient>
          <clipPath id={u('ringed')}>
            <circle cx="78" cy="24" r="12" />
          </clipPath>
          <clipPath id={u('red')}>
            <circle cx="14" cy="84" r="13" />
          </clipPath>
          <Dots id={u('ht')} s={1.6} r={0.4} fill={SPACE} o={0.6} />
        </defs>
        <rect width="100" height="100" fill={SPACE} />
        <ellipse cx="20" cy="30" rx="40" ry="26" fill={`url(#${u('neb1')})`} />
        <ellipse cx="82" cy="78" rx="38" ry="28" fill={`url(#${u('neb2')})`} />
        <rect width="100" height="100" fill={SPACE_2} />
        <Stars seed={5} n={60} y1={100} sparkles={8} twinkle fill="#f6efd8" />
        {/* ringed planet */}
        <path d="M60 30 Q78 16 98 18" fill="none" stroke={D.sheet} strokeWidth="1.6" strokeOpacity="0.6" transform="rotate(-12 78 24)" />
        <ellipse cx="78" cy="24" rx="22" ry="5" fill="none" stroke={D.saffronSoft} strokeWidth="2.2" transform="rotate(-16 78 24)" />
        <circle cx="78" cy="24" r="12" fill={D.sandy} />
        <g clipPath={`url(#${u('ringed')})`}>
          <rect x="60" y="16" width="40" height="3" fill={D.sienna} fillOpacity="0.55" transform="rotate(-16 78 24)" />
          <rect x="60" y="25" width="40" height="2" fill={D.saffronSoft} fillOpacity="0.6" transform="rotate(-16 78 24)" />
          <circle cx="84" cy="30" r="12" fill={`url(#${u('ht')})`} />
        </g>
        <path d="M56 26 A22 5 0 0 0 100 22" fill="none" stroke={D.saffronSoft} strokeWidth="2.2" transform="rotate(-16 78 24)" />
        {/* red planet with craters */}
        <circle cx="14" cy="84" r="13" fill={D.sienna} />
        <g clipPath={`url(#${u('red')})`}>
          <circle cx="20" cy="90" r="13" fill={CRATER} fillOpacity="0.7" />
          <circle cx="9" cy="79" r="2.4" fill={CRATER} />
          <circle cx="16" cy="86" r="1.6" fill={CRATER} />
          <circle cx="7" cy="89" r="1.2" fill={CRATER} />
        </g>
        {/* little moon */}
        <circle cx="16" cy="16" r="4.6" fill={MOON_GREY} />
        <circle cx="17.6" cy="17.4" r="1" fill="#a8a6bd" />
        <circle cx="14.6" cy="14.6" r="0.7" fill="#a8a6bd" />
        {/* comet */}
        <path d="M66 92 L96 74" stroke={D.tealSoft} strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M70 92 L96 77" stroke={D.tealSoft} strokeOpacity="0.3" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="66" cy="92" r="1.6" fill={D.sheet} />
        {/* rocket */}
        <g transform="translate(90 56) rotate(30)" className="mbd-bob">
          <path d="M0 -6 Q2.4 -3 2 3 H-2 Q-2.4 -3 0 -6Z" fill={D.sheet} />
          <circle cx="0" cy="-1.6" r="0.9" fill={D.teal} />
          <path d="M-2 1 L-3.4 4 H-2Z M2 1 L3.4 4 H2Z" fill={D.sienna} />
          <path d="M-1.2 3.4 Q0 7 1.2 3.4Z" fill={D.saffron} />
        </g>
      </g>
    ),
  },

  'backdrop-aurora': {
    dark: true,
    motion: true,
    draw: (u) => (
      <g>
        <defs>
          <linearGradient id={u('a1')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={AURORA_GREEN} stopOpacity="0" />
            <stop offset="0.7" stopColor={AURORA_GREEN} stopOpacity="0.75" />
            <stop offset="1" stopColor={AURORA_TEAL} stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id={u('a2')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={AURORA_LILAC} stopOpacity="0" />
            <stop offset="0.6" stopColor={AURORA_LILAC} stopOpacity="0.6" />
            <stop offset="1" stopColor={AURORA_TEAL} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <Bands
          bands={[
            ['#0f2133', 40],
            [AURORA_SKY, 70],
            ['#1c3a50', 100],
          ]}
        />
        <Stars seed={21} n={40} y1={60} sparkles={5} twinkle fill="#eaf6f2" />
        {/* aurora curtains */}
        <path className="mbd-glow" d="M-4 44 C10 30 22 46 34 30 C44 18 52 24 60 14 C70 4 84 18 104 6 L104 -4 C84 6 70 -6 58 4 C50 12 42 6 32 18 C20 32 10 18 -4 32Z" fill={`url(#${u('a2')})`} />
        <path className="mbd-glow" style={{ animationDelay: '-3.5s' }} d="M-4 52 C8 40 18 54 30 40 C42 26 52 36 62 24 C72 12 86 26 104 16 L104 2 C88 12 74 0 62 12 C52 24 44 16 32 28 C20 42 8 28 -4 40Z" fill={`url(#${u('a1')})`} />
        <path d="M-4 52 C8 40 18 54 30 40 C42 26 52 36 62 24 C72 12 86 26 104 16" fill="none" stroke={AURORA_GREEN} strokeOpacity="0.5" strokeWidth="0.6" />
        {/* snowy mountains */}
        <path d={ridge([[0, 62], [12, 50], [24, 62], [36, 56], [50, 68], [64, 58], [76, 48], [90, 60], [100, 54]], 80)} fill="#2a4a62" />
        <g fill={SNOW_SHADE}>
          <path d="M12 50 L16.4 54.4 L14 54 L12 56 L10 54 L8 54.6Z" />
          <path d="M76 48 L80.6 52.8 L78.4 52.2 L76 54.4 L73.8 52.2 L71.4 53Z" />
        </g>
        <path d={hills([[0, 78], [26, 72], [50, 76], [74, 72], [100, 76]])} fill={SNOW_SHADE} />
        <path d={hills([[0, 86], [30, 80], [60, 84], [100, 80]])} fill={SNOW} />
        {[
          [4, 86, 22],
          [12, 84, 16],
          [-1, 90, 18],
          [88, 84, 20],
          [96, 86, 24],
          [80, 84, 13],
        ].map(([x, y, h]) => (
          <Pine key={`${x}-${y}`} x={x} y={y} h={h} fill={PINE_NIGHT} snow={SNOW} />
        ))}
        {/* cabin */}
        <path d="M22 88 V82 L27 78 L32 82 V88Z" fill="#3a2e33" />
        <path d="M20.6 82.6 L27 77 L33.4 82.6 L32.6 83.4 L27 78.6 L21.4 83.4Z" fill={SNOW} />
        <rect x="25.6" y="83" width="2.6" height="2.4" fill={D.saffron} className="mbd-glow" />
        <path d="M30 79.6 V77 H31.4 V80.8" fill="#3a2e33" />
        <path d="M0 92 Q50 88 100 92 V100 H0Z" fill={SNOW} />
      </g>
    ),
  },

  'backdrop-neon-street': {
    dark: true,
    motion: true,
    draw: (u) => {
      const windows = (x0: number, x1: number, y0: number, y1: number, seed: number) => {
        const out = []
        let k = seed
        for (let y = y0; y < y1; y += 7) {
          for (let x = x0; x < x1; x += 5.5) {
            k = (k * 9301 + 49297) % 233280
            const lit = k / 233280 > 0.55
            out.push(<rect key={`${x}-${y}`} x={x} y={y} width="3" height="4" fill={lit ? NEON_YELLOW : '#3d3760'} fillOpacity={lit ? 0.75 : 1} />)
          }
        }
        return out
      }
      const glow = (d: string, color: string, w = 1, extra?: { className?: string; delay?: string }) => (
        <g className={extra?.className} style={extra?.delay ? { animationDelay: extra.delay } : undefined}>
          <path d={d} fill="none" stroke={color} strokeOpacity="0.22" strokeWidth={w * 3.4} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth={w * 0.35} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
      return (
        <g>
          <defs>
            <linearGradient id={u('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a1730" />
              <stop offset="1" stopColor="#3a2a55" />
            </linearGradient>
            <Dots id={u('ht')} s={1.8} r={0.35} fill="#000" o={0.25} />
          </defs>
          <rect width="100" height="100" fill={`url(#${u('sky')})`} />
          {/* distant towers */}
          <path d="M30 70 V40 H38 V34 H44 V70Z M56 70 V30 H62 V24 H66 V30 H72 V70Z" fill={STREET_SKY} />
          <g fill="#5a4f86" fillOpacity="0.8">
            <rect x="33" y="44" width="1.6" height="2" />
            <rect x="40" y="38" width="1.6" height="2" />
            <rect x="59" y="34" width="1.6" height="2" />
            <rect x="66" y="40" width="1.6" height="2" />
          </g>
          {/* side buildings */}
          <path d="M-2 100 V8 H22 V14 H26 V100Z" fill={BRICK_NIGHT} />
          <path d="M74 100 V18 H80 V12 H102 V100Z" fill={BRICK_NIGHT_2} />
          <rect x="-2" y="8" width="28" height="100" fill={`url(#${u('ht')})`} />
          {windows(2, 22, 18, 54, 3)}
          {windows(80, 100, 22, 52, 8)}
          {/* street */}
          <path d="M0 74 H100 V100 H0Z" fill={WET} />
          <path d="M26 74 L44 74 L36 100 L0 100 L0 86Z M74 74 L56 74 L64 100 L100 100 L100 86Z" fill="#221f38" />
          <path d="M50 76 V80 M50 84 V90 M50 94 V100" stroke={NEON_YELLOW} strokeOpacity="0.5" strokeWidth="0.8" />
          {/* reflections */}
          <g strokeLinecap="round">
            <path d="M12 80 V96" stroke={NEON_PINK} strokeOpacity="0.35" strokeWidth="3" strokeDasharray="2 1.6" />
            <path d="M88 80 V96" stroke={NEON_TEAL} strokeOpacity="0.35" strokeWidth="3" strokeDasharray="2 1.6" />
            <path d="M20 84 V94" stroke={NEON_YELLOW} strokeOpacity="0.25" strokeWidth="1.6" strokeDasharray="1.4 1.4" />
          </g>
          {/* neon signs */}
          {glow('M4 58 Q4 64 10 64 H14 Q20 64 20 58 Q20 52 14 52 H10 Q4 52 4 58Z', NEON_PINK, 1, { className: 'mbd-flicker' })}
          {glow('M8 55 V61 M8 55 H10.6 Q12 55 12 56.6 Q12 58 10.6 58 H8 M15 55 V61 L17 55', NEON_PINK, 0.7, { className: 'mbd-flicker' })}
          {glow('M84 58 L90 66 L96 58Z M90 66 V72 M87 72 H93', NEON_TEAL, 0.9, { className: 'mbd-glow' })}
          <circle cx="91.6" cy="60" r="1" fill={NEON_YELLOW} />
          {glow('M6 30 L12 26 L18 30 M6 30 V40 H18 V30', NEON_YELLOW, 0.7)}
          {glow('M82 34 H98', NEON_PINK, 0.8)}
          {glow('M82 40 H96', NEON_TEAL, 0.8, { className: 'mbd-glow', delay: '-2s' })}
          {/* awning + lamp */}
          <path d="M-2 66 H24 L22 70 H-2Z" fill={NEON_PINK} fillOpacity="0.5" />
          <path d="M72 70 H102 V66 H74Z" fill={NEON_TEAL} fillOpacity="0.4" />
          <path d="M30 96 V64 Q30 60 34 60" fill="none" stroke="#0f0d1c" strokeWidth="1.2" />
          <circle cx="35" cy="61" r="1.4" fill={NEON_YELLOW} />
          <circle cx="35" cy="61" r="4" fill={NEON_YELLOW} fillOpacity="0.15" />
          <path d="M70 96 V64 Q70 60 66 60" fill="none" stroke="#0f0d1c" strokeWidth="1.2" />
          <circle cx="65" cy="61" r="1.4" fill={NEON_YELLOW} />
          <circle cx="65" cy="61" r="4" fill={NEON_YELLOW} fillOpacity="0.15" />
          {[
            [44, 6, 1.2],
            [52, 14, 0.9],
            [62, 8, 1.1],
            [36, 16, 0.8],
          ].map(([x, y, r]) => (
            <path key={x} d={sparkle(x, y, r)} fill="#f6efd8" className="mbd-tw" style={{ animationDelay: `${-x / 10}s` }} />
          ))}
        </g>
      )
    },
  },
}
