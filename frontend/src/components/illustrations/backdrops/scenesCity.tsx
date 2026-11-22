// Towns and trips: city skyline, Montréal rooftops, café street, snowy village, travel postcard,
// hot-air balloons.
import { Bands, Birds, Blossom, Cloud, Dots, Hatch, Pine, RoundTree } from './kit'
import { D, fx, hills, scatter, type SceneDef } from './util'

const DUSK_LILAC = '#d9c6dc'
const CITY_FAR = '#9fc3c0'
const CITY_NEAR = '#2c5a63'
const CITY_NEAR_2 = '#3b6c74'
const BRICK = '#c4613f'
const BRICK_DEEP = '#9e4a30'
const GREYSTONE = '#d8c7a8'
const GREYSTONE_DEEP = '#bba784'
const IRON = '#2b2b30'
const MOUNT = '#7fae86'
const MOUNT_DEEP = '#5e9468'
const SKY_MTL = '#cfe6ea'
const COBBLE = '#d9cdb5'
const COBBLE_LINE = '#bfae90'
const FACADE_L = '#f1dfc0'
const FACADE_R = '#e8c9b5'
const WINTER_SKY = '#b9cde0'
const WINTER_SKY_2 = '#cddbe8'
const SNOW = '#f4f7f8'
const SNOW_SHADE = '#d7e2ea'
const ROOF = '#9e4a30'
const PINE_GREEN = '#2f5d4f'
const AIRMAIL_BLUE = '#3d6fa8'
const FIELD_GREEN = '#9cc48c'
const FIELD_GREEN_2 = '#7fb07a'

export const CITY_SCENES: Record<string, SceneDef> = {
  'backdrop-skyline': {
    draw: (u) => {
      const lit = scatter(17, 40, { x0: 0, x1: 100, y0: 44, y1: 98, hole: [50, 70, 26, 40] })
      return (
        <g>
          <defs>
            <Dots id={u('dots')} s={2} r={0.4} fill={D.sienna} o={0.4} />
            <clipPath id={u('near')}>
              <path d="M0 100 V44 H6 V36 H9 V30 H11 V36 H14 V44 H20 V56 H28 V62 H36 V70 H64 V60 H72 V52 H78 V40 L84 32 L90 40 V48 H96 V42 H100 V100Z" />
            </clipPath>
          </defs>
          <Bands
            bands={[
              [DUSK_LILAC, 20],
              [D.siennaSoft, 40],
              [D.sandySoft, 58],
              [D.saffronSoft, 74],
            ]}
          />
          <rect width="100" height="10" fill={`url(#${u('dots')})`} />
          <circle cx="50" cy="70" r="24" fill={D.saffron} fillOpacity="0.55" />
          {/* far skyline */}
          <path d="M0 100 V56 H8 V50 H16 V58 H22 V46 H26 V42 H30 V48 H36 V60 H42 V54 H48 V62 H54 V52 H58 V44 L60 38 L62 44 V52 H68 V58 H74 V48 H82 V54 H90 V44 H96 V52 H100 V100Z" fill={CITY_FAR} />
          {/* near skyline */}
          <path d="M0 100 V44 H6 V36 H9 V30 H11 V36 H14 V44 H20 V56 H28 V62 H36 V70 H64 V60 H72 V52 H78 V40 L84 32 L90 40 V48 H96 V42 H100 V100Z" fill={CITY_NEAR} />
          <path d="M20 100 V56 H28 V100Z M64 100 V60 H72 V100Z" fill={CITY_NEAR_2} />
          <path d="M10 30 V24" stroke={CITY_NEAR} strokeWidth="0.6" />
          <circle cx="10" cy="23.4" r="0.7" fill={D.sienna} />
          {/* water tower */}
          <g fill={CITY_NEAR}>
            <path d="M30 62 V58 M34 62 V58" stroke={CITY_NEAR} strokeWidth="0.5" />
            <rect x="29" y="53" width="6" height="5" />
            <path d="M28.6 53 L32 50.6 L35.4 53Z" />
          </g>
          <g clipPath={`url(#${u('near')})`} fill={D.saffron}>
            {lit.map((p, i) => (
              <rect key={i} x={fx(Math.round(p.x / 3) * 3 + 0.6)} y={fx(Math.round(p.y / 4) * 4)} width="1.6" height="2" fillOpacity={p.t > 0.4 ? 0.95 : 0.5} />
            ))}
          </g>
          <path d="M80 40 H88 M80 44 H88" stroke={D.saffron} strokeWidth="0.5" strokeOpacity="0.8" />
          <Birds pts={[[18, 16, 1.1], [24, 20, 0.8], [76, 14, 1]]} stroke={BRICK_DEEP} />
        </g>
      )
    },
  },

  'backdrop-montreal': {
    draw: (u) => {
      const stair = (x: number, y0: number, flip = false) => {
        const s = flip ? -1 : 1
        return (
          <g fill="none" stroke={IRON} strokeWidth="0.55" strokeLinecap="round">
            <path d={`M${x} ${y0} q${4 * s} 1 ${4 * s} 4 q0 3 ${-4 * s} 4 q${-4 * s} 1 ${-4 * s} 4 q0 3 ${4 * s} 4 q${4 * s} 1 ${4 * s} 4`} />
            <path d={`M${x + 0.8 * s} ${y0 + 1.6} q${3 * s} 1 ${3 * s} 2.6 M${x - 2.4 * s} ${y0 + 8.4} q${-1.4 * s} 1 ${-1.4 * s} 2.4 M${x + 0.8 * s} ${y0 + 13.6} q${3 * s} 1 ${3 * s} 2.6`} strokeWidth="0.35" />
          </g>
        )
      }
      return (
        <g>
          <defs>
            <Hatch id={u('brick')} s={1.6} w={0.25} fill={BRICK_DEEP} o={0.6} angle={0} />
          </defs>
          <Bands
            bands={[
              ['#bcdde3', 24],
              [SKY_MTL, 56],
            ]}
          />
          <Cloud x={34} y={16} w={18} fill={D.sheet} />
          <Cloud x={70} y={26} w={14} fill={D.sheet} o={0.8} />
          {/* Mount Royal with its cross */}
          <path d={hills([[0, 46], [14, 34], [30, 38], [46, 50], [60, 56], [100, 58]])} fill={MOUNT} />
          <path d="M0 52 Q10 44 22 46 Q34 48 46 56 L46 60 H0Z" fill={MOUNT_DEEP} />
          <path d="M16 20 V34 M13 24.4 H19" stroke={D.sheet} strokeWidth="0.9" strokeLinecap="square" />
          <path d="M16 20 V34 M13 24.4 H19" stroke={D.ink} strokeWidth="0.25" strokeOpacity="0.4" />
          {/* distant roofs */}
          <path d="M0 60 H100 V66 H0Z" fill={GREYSTONE_DEEP} />
          <path d="M30 60 V54 H40 V60 M58 60 V52 L62 48 L66 52 V60" fill={GREYSTONE_DEEP} />
          {/* left: brick triplex */}
          <rect x="-2" y="44" width="30" height="58" fill={BRICK} />
          <rect x="-2" y="44" width="30" height="58" fill={`url(#${u('brick')})`} />
          <rect x="-3" y="42" width="32" height="3" fill={GREYSTONE} />
          <path d="M-3 42 h32 M2 41.4 l3 -1.6 h18 l3 1.6" stroke={GREYSTONE_DEEP} strokeWidth="0.6" fill="none" />
          {[50, 66, 82].map((y) => (
            <g key={y}>
              <rect x="2" y={y} width="6" height="9" fill={SKY_MTL} />
              <rect x="1.4" y={y - 1.4} width="7.2" height="1.4" fill={GREYSTONE} />
              <rect x="13" y={y} width="5" height="11" fill={D.teal} />
              <rect x="12.4" y={y - 1.4} width="6.2" height="1.4" fill={GREYSTONE} />
              <path d={`M0 ${y + 13} H28`} stroke={IRON} strokeWidth="0.6" />
              <path d={`M0 ${y + 10.6} H22`} stroke={IRON} strokeWidth="0.35" />
            </g>
          ))}
          {stair(24, 63)}
          {stair(24, 82)}
          {/* right: greystone duplex */}
          <rect x="72" y="48" width="30" height="54" fill={GREYSTONE} />
          <path d="M72 48 H102" stroke={GREYSTONE_DEEP} strokeWidth="0.6" />
          <path d="M70 46 H102 V49 H70Z" fill={GREYSTONE_DEEP} />
          <path d="M74 46 L78 40 H98 L102 46Z" fill={D.teal} />
          {[54, 72].map((y) => (
            <g key={y}>
              <rect x="80" y={y} width="6" height="10" fill={D.siennaSoft} />
              <rect x="92" y={y} width="6" height="10" fill={D.siennaSoft} />
              <path d={`M80 ${y + 5} H86 M92 ${y + 5} H98`} stroke={GREYSTONE_DEEP} strokeWidth="0.4" />
              <rect x="74" y={y} width="4" height="13" fill={D.sienna} />
              <path d={`M72 ${y + 14} H102`} stroke={IRON} strokeWidth="0.6" />
              <path d={`M72 ${y + 11} H102`} stroke={IRON} strokeWidth="0.3" strokeDasharray="0.3 1.2" />
            </g>
          ))}
          {stair(76, 66, true)}
          {/* street trees */}
          <RoundTree x={34} y={100} r={6} fill="#6aa074" trunk={BRICK_DEEP} />
          <RoundTree x={66} y={100} r={5} fill="#7fb07e" trunk={BRICK_DEEP} />
          <Birds pts={[[50, 24, 0.9], [56, 20, 0.7]]} stroke={CITY_NEAR} />
        </g>
      )
    },
  },

  'backdrop-cafe-street': {
    draw: (u) => {
      const awning = (x: number, y: number, w: number, a: string, b: string, n: number) => {
        const sw = w / n
        return (
          <g>
            {Array.from({ length: n }, (_, i) => (
              <path key={i} d={`M${fx(x + i * sw)} ${y} h${fx(sw)} v6 q${fx(-sw / 2)} 2 ${fx(-sw)} 0Z`} fill={i % 2 ? b : a} />
            ))}
          </g>
        )
      }
      const bulbs = Array.from({ length: 13 }, (_, i) => {
        const x = 2 + i * 8
        const y = 6 + Math.sin((i / 12) * Math.PI) * 6
        return [fx(x), fx(y)] as const
      })
      return (
        <g>
          <defs>
            <pattern id={u('cobble')} width="5" height="3" patternUnits="userSpaceOnUse">
              <rect width="5" height="3" fill={COBBLE} />
              <rect x="0.3" y="0.3" width="4.4" height="2.4" rx="1" fill="none" stroke={COBBLE_LINE} strokeWidth="0.3" />
            </pattern>
          </defs>
          <Bands
            bands={[
              [D.tealSoft, 40],
              ['#e3f1ec', 70],
            ]}
          />
          {/* far street */}
          <path d="M32 70 V40 L38 34 H62 L68 40 V70Z" fill={D.sandySoft} />
          <path d="M38 46 H44 V52 H38Z M56 46 H62 V52 H56Z M47 44 H53 V52 H47Z" fill={D.tealSoft} />
          {/* left facade */}
          <path d="M-2 100 V0 H30 V100Z" fill={FACADE_L} />
          <path d="M-2 0 H30 V4 H-2Z M30 0 V100" stroke={D.sandy} strokeWidth="0.6" fill="none" />
          <rect x="4" y="20" width="8" height="12" fill={D.tealSoft} />
          <rect x="18" y="20" width="8" height="12" fill={D.tealSoft} />
          <path d="M8 20 V32 M22 20 V32" stroke={FACADE_L} strokeWidth="0.6" />
          <rect x="3" y="32" width="10" height="2" fill={D.teal} />
          <rect x="17" y="32" width="10" height="2" fill={D.teal} />
          <g fill={D.sienna}>
            <circle cx="5" cy="31" r="1" />
            <circle cx="8" cy="30.6" r="1" />
            <circle cx="11" cy="31" r="1" />
            <circle cx="19" cy="31" r="1" />
            <circle cx="25" cy="31" r="1" />
          </g>
          <rect x="0" y="50" width="28" height="30" fill={D.ink} fillOpacity="0.85" />
          <rect x="2" y="54" width="24" height="24" fill="#f6d79a" fillOpacity="0.55" />
          {awning(-2, 44, 32, D.sienna, D.sheet, 8)}
          {/* right facade */}
          <path d="M70 100 V0 H102 V100Z" fill={FACADE_R} />
          <rect x="76" y="20" width="8" height="12" fill={D.tealSoft} />
          <rect x="90" y="20" width="8" height="12" fill={D.tealSoft} />
          <rect x="75" y="32" width="10" height="2" fill={D.sienna} />
          <rect x="89" y="32" width="10" height="2" fill={D.sienna} />
          <rect x="72" y="50" width="30" height="30" fill={D.tealDeep} />
          <rect x="74" y="54" width="26" height="24" fill="#f6d79a" fillOpacity="0.55" />
          {awning(70, 44, 32, D.teal, D.sheet, 8)}
          {/* cobbles */}
          <path d="M0 80 H100 V100 H0Z" fill={`url(#${u('cobble')})`} />
          <path d="M30 70 H70 L74 80 H26Z" fill={COBBLE} />
          {/* tables */}
          {[
            [10, 86, D.sienna],
            [88, 86, D.teal],
          ].map(([x, y, c]) => (
            <g key={x as number}>
              <ellipse cx={x as number} cy={y as number} rx="6" ry="1.4" fill={c as string} />
              <path d={`M${x} ${y} V${(y as number) + 10} M${(x as number) - 3} ${(y as number) + 10} H${(x as number) + 3}`} stroke={IRON} strokeWidth="0.8" />
              <rect x={(x as number) - 1.4} y={(y as number) - 3.2} width="2" height="2.6" fill={D.sheet} />
              <path d={`M${(x as number) + 2.2} ${(y as number) - 1.2} q0.8 -2.4 2 -3`} stroke={D.teal} strokeWidth="0.6" fill="none" />
            </g>
          ))}
          <path d="M20 90 V98 M20 90 H24 V84 M24 90 V98" stroke={IRON} strokeWidth="0.8" fill="none" />
          <path d="M78 90 V98 M78 90 H74 V84 M74 90 V98" stroke={IRON} strokeWidth="0.8" fill="none" />
          {/* string lights */}
          <path d={`M-2 6 Q50 18 102 6`} fill="none" stroke={IRON} strokeWidth="0.4" />
          {bulbs.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={fx(y + 0.6)} r="2.2" fill={D.saffron} fillOpacity="0.25" />
              <circle cx={x} cy={fx(y + 0.6)} r="0.9" fill={D.saffron} />
            </g>
          ))}
          <Blossom x={32} y={78} r={1.4} fill={D.siennaSoft} />
          <Blossom x={68} y={78} r={1.4} fill={D.saffronSoft} />
        </g>
      )
    },
  },

  'backdrop-snowy-village': {
    motion: true,
    draw: () => {
      const flakes = scatter(41, 34, { y1: 100 })
      const snowLayer = (dy: number) => (
        <g transform={`translate(0 ${dy})`}>
          {flakes.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r={fx(0.35 + f.t * 0.55)} fill={SNOW} fillOpacity={fx(0.7 + f.t * 0.3)} />
          ))}
        </g>
      )
      const house = (x: number, y: number, w: number, h: number, wall: string, door: string) => (
        <g>
          <rect x={x} y={y - h} width={w} height={h} fill={wall} />
          <path d={`M${fx(x - 1.4)} ${fx(y - h)} L${fx(x + w / 2)} ${fx(y - h - w * 0.55)} L${fx(x + w + 1.4)} ${fx(y - h)}Z`} fill={ROOF} />
          <path d={`M${fx(x - 1.8)} ${fx(y - h + 0.4)} L${fx(x + w / 2)} ${fx(y - h - w * 0.6)} L${fx(x + w + 1.8)} ${fx(y - h + 0.4)} Q${fx(x + w * 0.75)} ${fx(y - h - w * 0.1)} ${fx(x + w / 2)} ${fx(y - h - w * 0.25)} Q${fx(x + w * 0.25)} ${fx(y - h - w * 0.1)} ${fx(x - 1.8)} ${fx(y - h + 0.4)}Z`} fill={SNOW} />
          <rect x={fx(x + w * 0.15)} y={fx(y - h * 0.7)} width={fx(w * 0.26)} height={fx(h * 0.3)} fill={D.saffron} className="mbd-glow" />
          <rect x={fx(x + w * 0.58)} y={fx(y - h * 0.55)} width={fx(w * 0.26)} height={fx(h * 0.55)} fill={door} />
        </g>
      )
      return (
        <g>
          <Bands
            bands={[
              ['#a7bfd6', 20],
              [WINTER_SKY, 44],
              [WINTER_SKY_2, 66],
            ]}
          />
          <circle cx="78" cy="18" r="6" fill="#f2eedf" />
          <path d={hills([[0, 60], [20, 52], [40, 58], [60, 62], [80, 54], [100, 58]])} fill={SNOW_SHADE} />
          {/* church far away */}
          <path d="M44 62 V54 L46 50 L48 54 V62Z M48 62 V56 H54 V62Z" fill="#8fa6bd" />
          <path d="M46 50 V46 M45 47.4 H47" stroke="#8fa6bd" strokeWidth="0.5" />
          <path d={hills([[0, 74], [26, 66], [50, 70], [76, 66], [100, 72]])} fill={SNOW} />
          <Pine x={30} y={70} h={12} fill={PINE_GREEN} snow={SNOW} />
          <Pine x={68} y={70} h={10} fill={PINE_GREEN} snow={SNOW} />
          {house(-2, 90, 16, 14, D.sienna, D.ink)}
          {house(14, 92, 12, 10, D.saffronSoft, D.teal)}
          {house(76, 92, 12, 11, D.tealSoft, D.sienna)}
          {house(88, 90, 14, 15, D.sandy, D.ink)}
          <path d="M6 70 V72" stroke={ROOF} strokeWidth="1.6" />
          <Pine x={30} y={96} h={16} fill={PINE_GREEN} snow={SNOW} />
          <Pine x={72} y={98} h={14} fill={PINE_GREEN} snow={SNOW} />
          <path d={hills([[0, 92], [30, 89], [60, 92], [100, 89]])} fill={SNOW} />
          <path d="M40 96 Q50 92 60 96" fill="none" stroke={SNOW_SHADE} strokeWidth="1" />
          {/* snowfall: two stacked copies loop seamlessly downward */}
          <g className="mbd-fall">
            {snowLayer(0)}
            {snowLayer(-100)}
          </g>
        </g>
      )
    },
  },

  'backdrop-postcard': {
    draw: (u) => {
      // Airmail border, a perforated stamp, and a postmark.
      const perf = Array.from({ length: 13 }, (_, i) => 12 + i * 6.33)
      return (
        <g>
          <defs>
            <pattern id={u('airmail')} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="12" fill={D.sheet} />
              <rect width="4" height="12" fill={D.sienna} />
              <rect x="6" width="4" height="12" fill={AIRMAIL_BLUE} />
            </pattern>
            <clipPath id={u('pic')}>
              <rect x="13" y="13" width="74" height="74" />
            </clipPath>
            <Dots id={u('dots')} s={1.8} r={0.4} fill={D.teal} o={0.45} />
          </defs>
          <rect width="100" height="100" fill={`url(#${u('airmail')})`} />
          <rect x="6" y="6" width="88" height="88" fill={D.sheet} />
          {/* stamp with perforations */}
          <rect x="10" y="10" width="80" height="80" fill={D.paper} />
          {perf.map((p) => (
            <g key={p} fill={D.sheet}>
              <circle cx={p} cy="10" r="1.6" />
              <circle cx={p} cy="90" r="1.6" />
              <circle cx="10" cy={p} r="1.6" />
              <circle cx="90" cy={p} r="1.6" />
            </g>
          ))}
          <g clipPath={`url(#${u('pic')})`}>
            <rect x="13" y="13" width="74" height="74" fill={D.tealSoft} />
            <rect x="13" y="13" width="74" height="10" fill={`url(#${u('dots')})`} />
            <circle cx="50" cy="56" r="20" fill={D.saffronSoft} />
            <path d={hills([[13, 70], [30, 62], [50, 68], [70, 60], [87, 66]])} fill={D.teal} />
            <path d={hills([[13, 80], [34, 74], [60, 80], [87, 74]])} fill={D.tealDeep} />
            <Cloud x={16} y={30} w={14} fill={D.sheet} />
          </g>
          <rect x="13" y="13" width="74" height="74" fill="none" stroke={D.ink} strokeWidth="0.5" />
          {/* postmark */}
          <g fill="none" stroke={D.ink} strokeOpacity="0.55" strokeWidth="0.7">
            <circle cx="82" cy="20" r="10" />
            <circle cx="82" cy="20" r="7.4" strokeWidth="0.4" />
            <path d="M74 20 H90" strokeWidth="0.4" />
            <path d="M62 14 q3 -2 6 0 t6 0 M60 19 q3 -2 6 0 t6 0 M62 24 q3 -2 6 0 t6 0" strokeWidth="0.8" />
          </g>
          <g fill={D.ink} fillOpacity="0.55">
            <rect x="78" y="16.4" width="8" height="1.2" />
            <rect x="79" y="22.4" width="6" height="1.2" />
          </g>
          {/* value corner */}
          <rect x="14" y="76" width="12" height="9" fill={D.sienna} />
          <path d="M17 78.6 H23 M17 81.6 H21" stroke={D.sheet} strokeWidth="1.1" strokeLinecap="round" />
        </g>
      )
    },
  },

  'backdrop-balloons': {
    motion: true,
    draw: (u) => {
      const balloon = (key: string, x: number, y: number, r: number, a: string, b: string, cls?: string, delay?: string) => {
        const env = `M${fx(x - r)} ${y} A${r} ${r} 0 1 1 ${fx(x + r)} ${y} Q${fx(x + r * 0.95)} ${fx(y + r * 0.75)} ${fx(x + r * 0.32)} ${fx(y + r * 1.25)} L${fx(x - r * 0.32)} ${fx(y + r * 1.25)} Q${fx(x - r * 0.95)} ${fx(y + r * 0.75)} ${fx(x - r)} ${y}Z`
        return (
          <g className={cls} style={delay ? { animationDelay: delay } : undefined}>
            <defs>
              <clipPath id={u(key)}>
                <path d={env} />
              </clipPath>
            </defs>
            <path d={env} fill={a} />
            <g clipPath={`url(#${u(key)})`}>
              <ellipse cx={x} cy={y} rx={fx(r * 0.62)} ry={fx(r * 1.6)} fill={b} />
              <ellipse cx={x} cy={y} rx={fx(r * 0.22)} ry={fx(r * 1.6)} fill={a} />
              <rect x={fx(x - r)} y={fx(y + r * 0.62)} width={fx(r * 2)} height={fx(r * 0.16)} fill={D.ink} fillOpacity="0.25" />
            </g>
            <path d={`M${fx(x - r * 0.32)} ${fx(y + r * 1.25)} L${fx(x - r * 0.22)} ${fx(y + r * 1.62)} M${fx(x + r * 0.32)} ${fx(y + r * 1.25)} L${fx(x + r * 0.22)} ${fx(y + r * 1.62)}`} stroke={D.ink} strokeWidth={fx(r * 0.05)} />
            <rect x={fx(x - r * 0.25)} y={fx(y + r * 1.6)} width={fx(r * 0.5)} height={fx(r * 0.36)} rx={fx(r * 0.06)} fill={BRICK_DEEP} />
          </g>
        )
      }
      return (
        <g>
          <Bands
            bands={[
              ['#bfe0e4', 26],
              [D.tealSoft, 54],
              ['#e6f2ec', 70],
            ]}
          />
          <g className="mbd-drift">
            <Cloud x={2} y={50} w={22} fill={D.sheet} />
            <Cloud x={66} y={14} w={20} fill={D.sheet} o={0.9} />
          </g>
          <Cloud x={70} y={60} w={16} fill={D.sheet} o={0.8} />
          {balloon('b1', 14, 18, 9, D.sienna, D.saffron, 'mbd-bob')}
          {balloon('b2', 86, 40, 7.5, D.teal, D.sheet, 'mbd-bob', '-2.5s')}
          {balloon('b3', 62, 10, 4, D.saffron, D.sienna, 'mbd-bob', '-4s')}
          {balloon('b4', 28, 46, 3.2, D.sandy, D.tealSoft, 'mbd-bob', '-1.2s')}
          {balloon('b5', 92, 6, 2.6, D.siennaSoft, D.sienna)}
          {/* patchwork fields */}
          <path d={hills([[0, 74], [20, 68], [44, 74], [70, 70], [100, 72]])} fill={FIELD_GREEN} />
          <path d="M0 78 L30 72 L50 78 L20 86Z" fill={D.saffronSoft} />
          <path d="M60 76 L100 72 V82 L74 86Z" fill={D.sandySoft} />
          <path d={hills([[0, 88], [30, 82], [60, 88], [100, 84]])} fill={FIELD_GREEN_2} />
          <path d="M0 92 L40 88 L60 100 H0Z" fill={FIELD_GREEN} />
          <path d="M70 100 L84 90 L100 92 V100Z" fill={D.saffron} fillOpacity="0.6" />
          <g stroke={D.tealDeep} strokeOpacity="0.4" strokeWidth="0.4">
            <path d="M4 96 L36 90 M8 99 L44 92 M74 98 L98 94" />
          </g>
          <RoundTree x={8} y={86} r={3.4} fill={D.tealDeep} trunk={BRICK_DEEP} />
          <RoundTree x={90} y={88} r={3} fill={D.tealDeep} trunk={BRICK_DEEP} />
          <Pine x={96} y={86} h={10} fill={PINE_GREEN} />
        </g>
      )
    },
  },
}
