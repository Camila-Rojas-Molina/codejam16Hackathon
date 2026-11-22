// Landscapes: golden hour, retro sunset, pastel dreamland, mountains, pine forest, desert road, greenhouse.
import { Bands, Birds, Blossom, Cloud, Dots, Hatch, Pine, RoundTree } from './kit'
import { D, fx, hills, ridge, sparkle, wave, type SceneDef } from './util'

const PLUM = '#7d4560'
const DUSK = '#b5536b'
const MINT = '#c4e5d2'
const MINT_DEEP = '#9fd0b8'
const BLUSH = '#f6cdd3'
const LAVENDER = '#ddd3ee'
const LAVENDER_DEEP = '#b9abd9'
const SKY_BLUE = '#cfe6ea'
const SLATE = '#8fa9be'
const SLATE_DEEP = '#5f7f97'
const FOREST = '#2f5d4f'
const FOREST_MID = '#5e8f76'
const FOREST_PALE = '#a9c9b4'
const MIST = '#e3eedf'
const BARK = '#6b4a3a'
const MESA = '#c0583d'
const MESA_DEEP = '#93402c'
const ROAD = '#4a4450'
const CACTUS = '#4f8a6a'
const CACTUS_DEEP = '#3b6d53'
const LEAF = '#5c9a6e'
const LEAF_DEEP = '#3f7a56'
const GLASS = '#dff0e8'

export const NATURE_SCENES: Record<string, SceneDef> = {
  // Legacy "Golden hour": the evening glow over the river, redrawn.
  'backdrop-sunset': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('dots')} s={2.2} r={0.42} fill={D.sienna} o={0.55} />
          <clipPath id={u('sky')}>
            <rect width="100" height="74" />
          </clipPath>
        </defs>
        <Bands
          bands={[
            [D.siennaSoft, 20],
            [D.sandySoft, 44],
            [D.saffronSoft, 74],
          ]}
        />
        <rect width="100" height="12" fill={`url(#${u('dots')})`} />
        <g clipPath={`url(#${u('sky')})`}>
          <circle cx="50" cy="74" r="30" fill={D.saffron} />
          <circle cx="50" cy="74" r="38" fill="none" stroke={D.saffron} strokeOpacity="0.35" strokeWidth="3" />
        </g>
        <path d={hills([[0, 69], [12, 66], [26, 71], [40, 74], [60, 74], [74, 70], [88, 65], [100, 68]], 75)} fill={D.sandy} />
        <rect y="74" width="100" height="26" fill={D.siennaSoft} />
        {[
          [78, 54],
          [82, 42],
          [86.5, 30],
          [91, 20],
          [95.5, 12],
        ].map(([y, w]) => (
          <rect key={y} x={50 - w / 2} y={y} width={w} height="1.8" rx="0.9" fill={D.saffron} />
        ))}
        <g stroke={D.sienna} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6">
          <path d="M3 80 H16 M8 86 H22 M2 92 H12 M84 81 H97 M78 88 H92 M88 95 H98" />
        </g>
        <Birds
          pts={[
            [82, 22, 1.2],
            [89, 27, 0.9],
            [12, 30, 1],
          ]}
          stroke={D.siennaDeep}
        />
      </g>
    ),
  },

  'backdrop-retro-sunset': {
    draw: (u) => (
      <g>
        <defs>
          <mask id={u('stripes')}>
            <rect width="100" height="100" fill="#fff" />
            {[
              [44, 1.2],
              [49, 1.8],
              [54, 2.4],
              [59, 3],
            ].map(([y, h]) => (
              <rect key={y} y={y} width="100" height={h} fill="#000" />
            ))}
          </mask>
          <Dots id={u('dots')} s={2} r={0.45} fill={PLUM} o={0.5} />
        </defs>
        <Bands
          bands={[
            [D.sienna, 10],
            [DUSK, 11],
            ['#ef8a6a', 22],
            [D.sandy, 34],
            ['#f6bf7c', 46],
            [D.saffronSoft, 66],
          ]}
        />
        <rect width="100" height="9" fill={`url(#${u('dots')})`} />
        <circle cx="50" cy="56" r="27" fill={D.saffron} mask={`url(#${u('stripes')})`} />
        <path d={ridge([[0, 44], [9, 36], [17, 46], [24, 42], [33, 58], [40, 66], [62, 66], [70, 56], [78, 44], [86, 49], [93, 34], [100, 42]], 70)} fill={DUSK} />
        <path d={ridge([[0, 56], [8, 51], [16, 58], [24, 62], [32, 66], [68, 66], [76, 61], [86, 54], [94, 58], [100, 52]], 70)} fill={PLUM} />
        <rect y="66" width="100" height="34" fill={D.sienna} />
        <rect y="66" width="100" height="34" fill="#ef8a6a" fillOpacity="0.55" />
        {[
          [69, 50],
          [73, 40],
          [78, 30],
          [84, 20],
          [91, 12],
        ].map(([y, w]) => (
          <rect key={y} x={50 - w / 2} y={y} width={w} height="1.6" rx="0.8" fill={D.saffron} />
        ))}
        <g fill={PLUM}>
          <path d="M0 100 V82 Q6 78 10 84 Q14 76 20 86 L22 100Z" />
          <path d="M100 100 V80 Q94 77 90 83 Q86 78 81 86 L78 100Z" />
        </g>
        <Birds
          pts={[
            [14, 20, 1.2],
            [21, 16, 0.9],
            [84, 18, 1.1],
          ]}
          stroke={PLUM}
          w={0.6}
        />
      </g>
    ),
  },

  'backdrop-pastel-dream': {
    draw: () => (
      <g>
        <Bands
          bands={[
            [LAVENDER, 22],
            ['#e8dcf0', 40],
            [BLUSH, 58],
            ['#fbe3dc', 70],
          ]}
        />
        {/* soft rainbow, top left */}
        <path d="M-18 34 A30 30 0 0 1 42 34" fill="none" stroke="#f3b6c6" strokeWidth="3.4" />
        <path d="M-14.6 34 A26.6 26.6 0 0 1 38.6 34" fill="none" stroke={D.saffronSoft} strokeWidth="3.4" />
        <path d="M-11.2 34 A23.2 23.2 0 0 1 35.2 34" fill="none" stroke={MINT} strokeWidth="3.4" />
        <path d="M-7.8 34 A19.8 19.8 0 0 1 31.8 34" fill="none" stroke={LAVENDER_DEEP} strokeWidth="3.4" />
        <Cloud x={-6} y={36} w={30} fill="#fff7f2" />
        <Cloud x={70} y={22} w={34} fill="#fff7f2" />
        <Cloud x={82} y={44} w={22} fill="#fff7f2" o={0.85} />
        <path d={hills([[0, 66], [14, 60], [30, 66], [46, 70], [64, 67], [82, 58], [100, 62]])} fill={MINT_DEEP} />
        <path d={hills([[0, 78], [18, 70], [38, 76], [56, 80], [74, 74], [90, 70], [100, 72]])} fill={MINT} />
        <path d={hills([[0, 90], [16, 84], [34, 90], [54, 92], [72, 88], [88, 84], [100, 86]])} fill="#f3c4cf" />
        {(
          [
            [8, 82, '#fff7f2'],
            [16, 78, D.saffronSoft],
            [26, 84, '#fff7f2'],
            [76, 80, D.saffronSoft],
            [86, 77, '#fff7f2'],
            [93, 82, LAVENDER],
            [10, 94, D.saffronSoft],
            [88, 94, '#fff7f2'],
          ] as [number, number, string][]
        ).map(([x, y, f]) => (
          <Blossom key={`${x}-${y}`} x={x} y={y} r={1.6} fill={f} centre={D.sandy} />
        ))}
        {[
          [60, 8, 1.8],
          [92, 6, 1.4],
          [6, 50, 1.4],
          [96, 56, 1.6],
          [44, 4, 1.2],
        ].map(([x, y, r]) => (
          <path key={`${x}`} d={sparkle(x, y, r)} fill="#fff7f2" />
        ))}
      </g>
    ),
  },

  'backdrop-mountains': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('dots')} s={2.2} r={0.4} fill={SLATE_DEEP} o={0.45} />
        </defs>
        <Bands
          bands={[
            ['#bfdde3', 22],
            [SKY_BLUE, 46],
            ['#e3f0ee', 62],
          ]}
        />
        <rect width="100" height="10" fill={`url(#${u('dots')})`} />
        <circle cx="82" cy="18" r="8" fill={D.saffronSoft} />
        <circle cx="82" cy="18" r="11.5" fill="none" stroke={D.saffronSoft} strokeOpacity="0.6" strokeWidth="1.2" />
        <Cloud x={4} y={24} w={22} fill={D.sheet} />
        <Cloud x={62} y={36} w={16} fill={D.sheet} o={0.8} />
        {/* far range with snowcaps */}
        <path d={ridge([[0, 46], [10, 34], [18, 42], [28, 26], [40, 44], [50, 40], [60, 48], [72, 30], [82, 40], [90, 32], [100, 42]], 70)} fill={SLATE} />
        <g fill={D.sheet}>
          <path d="M10 34 L13.4 38.2 L11.6 37.6 L10 39 L8.2 37.4 L6.4 38.6Z" />
          <path d="M28 26 L32.8 32.6 L30.2 31.6 L28 33.6 L25.6 31.4 L23.4 32.8Z" />
          <path d="M72 30 L76.6 36.2 L74.2 35.4 L72 37.4 L69.8 35.4 L67.6 36.6Z" />
          <path d="M90 32 L93.2 36 L91.4 35.4 L90 36.8 L88.6 35.4 L87 36.2Z" />
        </g>
        {/* mid range */}
        <path d={ridge([[0, 56], [12, 46], [22, 56], [32, 52], [44, 62], [58, 60], [70, 52], [80, 58], [90, 46], [100, 54]], 80)} fill={SLATE_DEEP} />
        <path d={hills([[0, 70], [20, 64], [40, 70], [60, 72], [80, 64], [100, 68]])} fill={D.teal} />
        <path d={hills([[0, 82], [24, 76], [50, 82], [76, 77], [100, 80]])} fill={D.tealDeep} />
        {/* lake glint */}
        <path d="M30 88 H44 M56 90 H70 M40 94 H58" stroke={D.tealSoft} strokeOpacity="0.5" strokeWidth="0.8" strokeLinecap="round" />
        <Pine x={6} y={98} h={30} fill={FOREST} />
        <Pine x={15} y={100} h={22} fill={FOREST} />
        <Pine x={-1} y={100} h={20} fill={FOREST} />
        <Pine x={93} y={99} h={28} fill={FOREST} />
        <Pine x={85} y={101} h={20} fill={FOREST} />
        <Pine x={101} y={100} h={22} fill={FOREST} />
        <Birds pts={[[44, 18, 1], [50, 14, 0.8]]} stroke={SLATE_DEEP} />
      </g>
    ),
  },

  'backdrop-forest': {
    draw: (u) => (
      <g>
        <defs>
          <Hatch id={u('rays')} s={3} w={1.2} fill={D.sheet} o={0.35} angle={-30} />
        </defs>
        <Bands
          bands={[
            ['#f3efd8', 30],
            [MIST, 100],
          ]}
        />
        <circle cx="50" cy="40" r="22" fill={D.saffronSoft} />
        <path d="M30 -2 L46 -2 L70 70 L20 70Z" fill={`url(#${u('rays')})`} />
        {Array.from({ length: 12 }, (_, i) => (
          <Pine key={`f${i}`} x={i * 9 + (i % 2) * 2} y={64 + (i % 3)} h={16 + ((i * 7) % 5)} fill={FOREST_PALE} />
        ))}
        <rect y="64" width="100" height="36" fill={FOREST_PALE} />
        {[4, 16, 28, 74, 86, 97].map((x, i) => (
          <Pine key={`m${x}`} x={x} y={76 + (i % 2) * 2} h={30 + (i % 3) * 4} fill={FOREST_MID} />
        ))}
        <path d={hills([[0, 78], [30, 74], [50, 77], [70, 74], [100, 78]])} fill={FOREST_MID} />
        <Pine x={4} y={102} h={74} w={30} fill={FOREST} trunk={BARK} />
        <Pine x={96} y={102} h={80} w={30} fill={FOREST} trunk={BARK} />
        <Pine x={18} y={104} h={40} fill={FOREST} />
        <Pine x={83} y={104} h={36} fill={FOREST} />
        <path d={hills([[0, 92], [30, 88], [50, 90], [70, 88], [100, 92]])} fill={FOREST} />
        {/* mushrooms */}
        <g>
          <rect x="25.2" y="90" width="1.6" height="4" fill={D.sheet} />
          <path d="M23 90.6 Q26 85.6 29 90.6Z" fill={D.sienna} />
          <circle cx="25.4" cy="89" r="0.45" fill={D.sheet} />
          <circle cx="27" cy="88.6" r="0.4" fill={D.sheet} />
          <rect x="72.6" y="91" width="1.2" height="3" fill={D.sheet} />
          <path d="M71 91.4 Q73.2 87.8 75.4 91.4Z" fill={D.sienna} />
        </g>
        <Birds pts={[[60, 14, 0.9], [66, 18, 0.7]]} stroke={FOREST_MID} />
      </g>
    ),
  },

  'backdrop-desert-road': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('sand')} s={2.4} r={0.35} fill={MESA_DEEP} o={0.35} angle={20} />
        </defs>
        <Bands
          bands={[
            [D.sandySoft, 18],
            ['#fbe6c8', 40],
            [D.saffronSoft, 62],
          ]}
        />
        <circle cx="20" cy="22" r="9" fill={D.sandy} />
        <circle cx="20" cy="22" r="13" fill="none" stroke={D.sandy} strokeOpacity="0.35" strokeWidth="2" />
        {/* mesas */}
        <path d="M-2 62 L-2 42 L4 42 L6 38 L20 38 L22 42 L26 46 L30 62Z" fill={MESA} />
        <path d="M-2 46 H24 M-2 52 H27" stroke={MESA_DEEP} strokeWidth="0.8" strokeOpacity="0.6" />
        <path d="M70 62 L74 48 L78 46 L80 40 L94 40 L96 44 L102 44 L102 62Z" fill={MESA} />
        <path d="M76 50 H102 M73 56 H102" stroke={MESA_DEEP} strokeWidth="0.8" strokeOpacity="0.6" />
        <path d="M40 62 L42 56 L46 56 L47 54 L52 54 L53 58 L56 62Z" fill={D.sandy} />
        {/* ground */}
        <rect y="62" width="100" height="38" fill={D.sandy} />
        <rect y="62" width="100" height="38" fill={`url(#${u('sand')})`} />
        <path d="M0 62 H100 V66 Q50 63 0 66Z" fill={MESA} fillOpacity="0.35" />
        {/* road */}
        <path d="M49 62 L51 62 L80 100 L20 100Z" fill={ROAD} />
        <path d="M49 62 L50 62 L20.5 100 L20 100Z M51 62 L50 62 L79.5 100 L80 100Z" fill={D.saffronSoft} fillOpacity="0.7" />
        {[
          [64, 0.4, 1.5],
          [69, 0.6, 2.4],
          [76, 0.9, 3.6],
          [86, 1.3, 5.4],
        ].map(([y, w, h]) => (
          <rect key={y} x={50 - w / 2} y={y} width={w} height={h} fill={D.saffron} />
        ))}
        {/* cacti */}
        <g fill={CACTUS}>
          <rect x="7" y="70" width="5" height="26" rx="2.5" />
          <path d="M7.4 82 H3.6 Q2 82 2 80.4 V74.6 A1.6 1.6 0 0 1 5.2 74.6 V79 H7.4Z" />
          <path d="M11.6 78 H15 V71.6 A1.6 1.6 0 0 1 18.2 71.6 V77.4 Q18.2 80.8 15 80.8 H11.6Z" />
          <rect x="89" y="76" width="4" height="20" rx="2" />
          <path d="M89.4 85 H86.4 Q85 85 85 83.6 V79.4 A1.3 1.3 0 0 1 87.6 79.4 V82.6 H89.4Z" />
        </g>
        <path d="M9.5 72 V94 M91 78 V94" stroke={CACTUS_DEEP} strokeWidth="0.6" />
        <ellipse cx="9.5" cy="96" rx="6" ry="1" fill={MESA_DEEP} fillOpacity="0.35" />
        <ellipse cx="91" cy="96" rx="5" ry="0.9" fill={MESA_DEEP} fillOpacity="0.35" />
        <Birds pts={[[78, 20, 1.1], [84, 24, 0.8]]} stroke={MESA_DEEP} />
      </g>
    ),
  },

  'backdrop-greenhouse': {
    draw: (u) => {
      const monstera = (x: number, y: number, s: number, r: number, fill: string) => (
        <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path d="M0 0 C-8 -2 -12 -12 -6 -18 C-2 -22 4 -21 6 -16 C10 -10 6 -2 0 0Z" fill={fill} />
          <path d="M0 0 Q-2 -10 1 -18" fill="none" stroke={LEAF_DEEP} strokeWidth="0.5" />
          <path d="M-7.6 -8 L-3 -9 M-8 -13 L-2 -13 M4.8 -9 L1.2 -10" stroke={GLASS} strokeWidth="1" strokeLinecap="round" />
        </g>
      )
      const fern = (x: number, y: number, len: number, r: number) => (
        <g transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d={`M0 0 Q${fx(len * 0.15)} ${fx(-len * 0.5)} 0 ${-len}`} fill="none" stroke={LEAF_DEEP} strokeWidth="0.6" />
          {Array.from({ length: 7 }, (_, i) => {
            const t = (i + 1) / 8
            const yy = fx(-len * t)
            const w = fx(len * 0.22 * (1 - t * 0.6))
            return <path key={i} d={`M0 ${yy} q${-w} ${fx(-w * 0.3)} ${-w} ${fx(-w * 0.8)} M0 ${yy} q${w} ${fx(-w * 0.3)} ${w} ${fx(-w * 0.8)}`} stroke={LEAF} strokeWidth="1" strokeLinecap="round" fill="none" />
          })}
        </g>
      )
      return (
        <g>
          <defs>
            <Hatch id={u('glint')} s={6} w={1.4} fill="#fff" o={0.35} angle={-35} />
          </defs>
          <rect width="100" height="100" fill={GLASS} />
          <rect width="100" height="72" fill={`url(#${u('glint')})`} />
          {/* glasshouse frame: arched roof + mullions */}
          <g fill="none" stroke={D.sheet} strokeWidth="1.6">
            <path d="M-2 30 Q50 -14 102 30" />
            <path d="M-2 46 Q50 4 102 46" strokeWidth="1" />
            <path d="M12.5 72 V20 M87.5 72 V20 M30 72 V8 M70 72 V8 M50 72 V4" strokeWidth="1" />
            <path d="M0 72 H100" />
          </g>
          {/* floor */}
          <rect y="72" width="100" height="28" fill={D.sandySoft} />
          <path d="M0 80 H100 M0 89 H100 M10 72 L4 100 M30 72 L27 100 M50 72 V100 M70 72 L73 100 M90 72 L96 100" stroke={D.sandy} strokeWidth="0.6" />
          {/* hanging plants */}
          <path d="M16 0 V10 M84 0 V12" stroke={BARK} strokeWidth="0.4" />
          <path d="M12 10 H20 L19 14 Q16 16 13 14Z" fill={D.sienna} />
          <path d="M80 12 H88 L87 16 Q84 18 81 16Z" fill={D.sienna} />
          <g fill={LEAF}>
            {[
              [13, 16, 20],
              [15, 20, -10],
              [18, 18, -30],
              [14, 25, 10],
              [82, 18, 25],
              [84, 23, -5],
              [87, 20, -35],
              [85, 28, 5],
            ].map(([x, y, r]) => (
              <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1.4" ry="2.6" transform={`rotate(${r} ${x} ${y})`} />
            ))}
          </g>
          {/* left pot + monstera */}
          {monstera(10, 84, 1.25, -40, LEAF)}
          {monstera(12, 84, 1.05, 10, LEAF_DEEP)}
          {monstera(8, 84, 0.9, -80, LEAF_DEEP)}
          <path d="M2 82 H20 L18 98 H4Z" fill={D.sienna} />
          <rect x="1" y="80.5" width="20" height="3" fill={D.siennaDeep} />
          {/* right pot + ferns */}
          {fern(88, 82, 22, -25)}
          {fern(90, 82, 26, 5)}
          {fern(92, 82, 20, 35)}
          <path d="M81 82 H99 L97 98 H83Z" fill={D.teal} />
          <rect x="80" y="80.5" width="20" height="3" fill={D.tealDeep} />
          {/* small potted flowers */}
          <path d="M26 92 H34 L33 99 H27Z" fill={D.sandy} />
          <Blossom x={28} y={89} r={2} fill={D.siennaSoft} />
          <Blossom x={32} y={88} r={2.2} fill={D.sheet} />
          <path d="M66 92 H74 L73 99 H67Z" fill={D.sandy} />
          <Blossom x={70} y={88.4} r={2.4} fill={D.saffron} centre={D.sienna} />
        </g>
      )
    },
  },

  'backdrop-autumn': {
    draw: (u) => (
      <g>
        <defs>
          <Dots id={u('dots')} s={2.2} r={0.4} fill={D.sienna} o={0.4} />
        </defs>
        <Bands
          bands={[
            [D.sandySoft, 40],
            ['#fbe8d2', 72],
          ]}
        />
        <rect width="100" height="10" fill={`url(#${u('dots')})`} />
        <path d={hills([[0, 70], [20, 64], [40, 70], [60, 72], [80, 66], [100, 70]])} fill="#e9b98a" />
        <RoundTree x={30} y={72} r={6} fill={D.sandy} trunk={BARK} />
        <RoundTree x={68} y={72} r={5} fill={D.saffron} trunk={BARK} />
        {/* big trees framing */}
        <rect x="4" y="38" width="5" height="62" fill={BARK} />
        <path d="M6.5 54 L16 44" stroke={BARK} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="0" cy="18" r="20" fill={D.sienna} />
        <circle cx="16" cy="30" r="14" fill={D.sandy} />
        <circle cx="4" cy="38" r="12" fill={D.siennaDeep} />
        <rect x="91" y="40" width="5" height="60" fill={BARK} />
        <path d="M93.5 58 L84 48" stroke={BARK} strokeWidth="2" strokeLinecap="round" />
        <circle cx="100" cy="22" r="20" fill={D.saffron} />
        <circle cx="84" cy="34" r="12" fill={D.sienna} />
        <circle cx="98" cy="42" r="11" fill={D.sandy} />
        {/* ground with leaf piles */}
        <path d={hills([[0, 86], [30, 82], [50, 84], [70, 82], [100, 86]])} fill="#d98a4f" />
        <path d="M-2 100 Q2 88 12 92 Q20 86 28 100Z" fill={D.sienna} />
        <path d="M102 100 Q98 88 88 92 Q80 88 72 100Z" fill={D.siennaDeep} />
        {(
          [
            [22, 14, 30, D.sienna],
            [34, 8, -40, D.saffron],
            [72, 10, 60, D.sandy],
            [64, 18, -20, D.sienna],
            [20, 48, 80, D.saffron],
            [80, 56, -60, D.siennaDeep],
            [12, 66, 20, D.sandy],
            [90, 70, 50, D.saffron],
            [40, 94, -30, D.saffron],
            [60, 96, 70, D.sandy],
            [86, 84, 10, D.saffron],
            [16, 84, -50, D.saffron],
          ] as [number, number, number, string][]
        ).map(([x, y, r, f]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
            <path d="M0 -3 L1 -1.2 L2.6 -1.6 L1.8 0 L2.8 1.2 L0.8 1.2 L0 3 L-0.8 1.2 L-2.8 1.2 L-1.8 0 L-2.6 -1.6 L-1 -1.2Z" fill={f} />
            <path d="M0 -2 V4" stroke={BARK} strokeWidth="0.3" />
          </g>
        ))}
      </g>
    ),
  },

  'backdrop-spring-blossom': {
    draw: () => {
      const PINKS = ['#f4b6c2', '#f8d3dc', D.sheet]
      const branchL = 'M-2 6 Q14 10 24 22 M10 9 Q14 2 20 0 M18 16 Q26 12 32 14 M-2 30 Q8 30 14 40'
      const branchR = 'M102 10 Q86 14 78 26 M90 12 Q86 4 80 2 M82 20 Q74 18 68 22 M102 34 Q94 36 90 44'
      const clusters: [number, number][] = [
        [6, 6], [14, 10], [20, 2], [24, 21], [30, 13], [12, 38], [4, 30], [18, 17], [26, 26],
        [94, 10], [86, 14], [80, 4], [78, 26], [70, 21], [90, 44], [98, 34], [84, 20], [74, 30],
      ]
      return (
        <g>
          <Bands
            bands={[
              ['#e4f2ee', 50],
              ['#eef6ee', 72],
            ]}
          />
          <circle cx="50" cy="48" r="30" fill="#f6eedd" />
          <path d={hills([[0, 74], [24, 68], [50, 72], [76, 66], [100, 72]])} fill={MINT} />
          <path d={hills([[0, 86], [30, 80], [60, 84], [100, 80]])} fill={MINT_DEEP} />
          <g fill="none" stroke={BARK} strokeLinecap="round">
            <path d={branchL} strokeWidth="1.6" />
            <path d={branchR} strokeWidth="1.6" />
          </g>
          {clusters.map(([x, y], i) => (
            <Blossom key={i} x={x} y={y} r={2.6 + (i % 3) * 0.5} fill={PINKS[i % 3]} centre={D.sienna} rot={i * 23} />
          ))}
          {/* drifting petals */}
          {[
            [34, 30], [64, 36], [8, 52], [92, 58], [40, 8], [60, 6],
          ].map(([x, y], i) => (
            <ellipse key={`p${i}`} cx={x} cy={y} rx="1.1" ry="0.6" transform={`rotate(${i * 40} ${x} ${y})`} fill="#f4b6c2" />
          ))}
          {/* tulips */}
          {(
            [
              [6, 94, D.sienna],
              [12, 96, D.saffron],
              [18, 95, '#f4b6c2'],
              [82, 95, D.saffron],
              [88, 93, '#f4b6c2'],
              [94, 96, D.sienna],
            ] as [number, number, string][]
          ).map(([x, y, f]) => (
            <g key={`t${x}`}>
              <path d={`M${x} ${y + 6} V${y}`} stroke={LEAF_DEEP} strokeWidth="0.8" />
              <path d={`M${x} ${y + 4} q-2.6 -1 -2.6 -4`} stroke={LEAF} strokeWidth="1" fill="none" />
              <path d={`M${x - 2} ${y - 4} L${x - 1} ${y - 2.6} L${x} ${y - 4.4} L${x + 1} ${y - 2.6} L${x + 2} ${y - 4} V${y - 1.6} Q${x} ${y + 0.6} ${x - 2} ${y - 1.6}Z`} fill={f} />
            </g>
          ))}
          <path d={wave(98, 0.8, 4)} fill="none" stroke={LEAF_DEEP} strokeWidth="0.5" strokeOpacity="0.5" />
        </g>
      )
    },
  },
}
