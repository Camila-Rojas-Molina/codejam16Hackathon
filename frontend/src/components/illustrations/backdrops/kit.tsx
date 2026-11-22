// Small drawing pieces shared by the backdrop scenes. Everything is in the scene's 0–100 square.
import { D, fx, scatter, sparkle } from './util'

/** A halftone dot pattern (use as fill="url(#id)"). */
export function Dots({ id, s = 2.4, r = 0.45, fill = D.ink, o = 1, angle = 45 }: { id: string; s?: number; r?: number; fill?: string; o?: number; angle?: number }) {
  return (
    <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
      <circle cx={s / 2} cy={s / 2} r={r} fill={fill} fillOpacity={o} />
    </pattern>
  )
}

/** Diagonal hatching (use as fill="url(#id)"). */
export function Hatch({ id, s = 2, w = 0.5, fill = D.ink, o = 1, angle = -45 }: { id: string; s?: number; w?: number; fill?: string; o?: number; angle?: number }) {
  return (
    <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
      <rect width={w} height={s} fill={fill} fillOpacity={o} />
    </pattern>
  )
}

/** Horizontal flat colour bands, top to bottom: [colour, until y]. */
export function Bands({ bands, from = 0 }: { bands: [string, number][]; from?: number }) {
  return (
    <g>
      {bands.map(([fill, to], i) => {
        const y = i === 0 ? from : bands[i - 1][1]
        return <rect key={i} x="0" y={y} width="100" height={fx(to - y + 0.2)} fill={fill} />
      })}
    </g>
  )
}

/** A puffy flat-bottomed cloud, its base on y, from x to x + w. */
export function Cloud({ x, y, w, fill = D.sheet, o = 1, className }: { x: number; y: number; w: number; fill?: string; o?: number; className?: string }) {
  const d = `M${fx(x)} ${fx(y)} A${fx(w * 0.15)} ${fx(w * 0.15)} 0 0 1 ${fx(x + w * 0.24)} ${fx(y - w * 0.17)} A${fx(w * 0.2)} ${fx(w * 0.2)} 0 0 1 ${fx(x + w * 0.62)} ${fx(y - w * 0.22)} A${fx(w * 0.17)} ${fx(w * 0.17)} 0 0 1 ${fx(x + w)} ${fx(y)}Z`
  return <path d={d} fill={fill} fillOpacity={o} className={className} />
}

/** A tiered pine standing on (x, y). */
export function Pine({ x, y, h, w = h * 0.5, fill, trunk, snow }: { x: number; y: number; h: number; w?: number; fill: string; trunk?: string; snow?: string }) {
  const p = (dx: number, dy: number) => `${fx(x + dx * w)} ${fx(y - dy * h)}`
  const d = `M${p(0, 1)} L${p(0.26, 0.64)} L${p(0.15, 0.64)} L${p(0.38, 0.32)} L${p(0.24, 0.32)} L${p(0.5, 0.06)} L${p(-0.5, 0.06)} L${p(-0.24, 0.32)} L${p(-0.38, 0.32)} L${p(-0.15, 0.64)} L${p(-0.26, 0.64)}Z`
  return (
    <g>
      {trunk ? <rect x={fx(x - w * 0.06)} y={fx(y - h * 0.08)} width={fx(w * 0.12)} height={fx(h * 0.08)} fill={trunk} /> : null}
      <path d={d} fill={fill} />
      {snow ? (
        <path
          d={`M${p(0, 1)} L${p(0.17, 0.77)} Q${p(0.06, 0.8)} ${p(0, 0.74)} Q${p(-0.08, 0.8)} ${p(-0.17, 0.77)}Z M${p(0.3, 0.42)} L${p(0.38, 0.32)} L${p(0.24, 0.32)} Q${p(0.2, 0.37)} ${p(0.12, 0.34)}Z M${p(-0.3, 0.42)} L${p(-0.38, 0.32)} L${p(-0.24, 0.32)} Q${p(-0.2, 0.37)} ${p(-0.12, 0.34)}Z`}
          fill={snow}
        />
      ) : null}
    </g>
  )
}

/** A round deciduous tree on (x, y). */
export function RoundTree({ x, y, r, fill, trunk, shade }: { x: number; y: number; r: number; fill: string; trunk: string; shade?: string }) {
  return (
    <g>
      <rect x={fx(x - r * 0.12)} y={fx(y - r * 1.2)} width={fx(r * 0.24)} height={fx(r * 1.2)} fill={trunk} />
      <circle cx={x} cy={fx(y - r * 1.75)} r={r} fill={fill} />
      {shade ? <path d={`M${fx(x - r)} ${fx(y - r * 1.75)} A${r} ${r} 0 0 0 ${fx(x + r)} ${fx(y - r * 1.75)} Q${x} ${fx(y - r * 1.35)} ${fx(x - r)} ${fx(y - r * 1.75)}Z`} fill={shade} /> : null}
    </g>
  )
}

/** A palm tree: curved trunk from (x, y) to the crown at (tx, ty). */
export function Palm({ x, y, tx, ty, trunk, leaf, leafDark, s = 1 }: { x: number; y: number; tx: number; ty: number; trunk: string; leaf: string; leafDark: string; s?: number }) {
  const mx = (x + tx) / 2 + (ty - y) * 0.12
  const my = (y + ty) / 2
  const fronds = [-170, -135, -100, -62, -25, 12]
  return (
    <g>
      <path d={`M${x} ${y} Q${fx(mx)} ${fx(my)} ${tx} ${ty}`} fill="none" stroke={trunk} strokeWidth={fx(3 * s)} strokeLinecap="round" />
      <path d={`M${x} ${y} Q${fx(mx)} ${fx(my)} ${tx} ${ty}`} fill="none" stroke={leafDark} strokeOpacity="0.35" strokeWidth={fx(3 * s)} strokeDasharray={`${fx(0.6 * s)} ${fx(2.2 * s)}`} />
      {fronds.map((a, i) => (
        <path
          key={a}
          transform={`translate(${tx} ${ty}) rotate(${a}) scale(${s})`}
          d="M0 0 Q9 -6 19 1 Q13 0 10 2 Q6 1 0 0Z"
          fill={i % 2 ? leafDark : leaf}
        />
      ))}
      <circle cx={tx} cy={fx(ty + 1.2 * s)} r={fx(1.3 * s)} fill={trunk} />
    </g>
  )
}

/** A few distant birds (little "v" strokes). */
export function Birds({ pts, stroke = D.ink, w = 0.5 }: { pts: [number, number, number][]; stroke?: string; w?: number }) {
  return (
    <g fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {pts.map(([x, y, s], i) => (
        <path key={i} d={`M${fx(x - 2 * s)} ${fx(y - 0.6 * s)} Q${fx(x - 1 * s)} ${fx(y - 1.3 * s)} ${x} ${y} Q${fx(x + 1 * s)} ${fx(y - 1.3 * s)} ${fx(x + 2 * s)} ${fx(y - 0.6 * s)}`} />
      ))}
    </g>
  )
}

/** A starfield: dots and a few sparkles; `twinkle` marks some of them for the twinkle motion. */
export function Stars({ seed, n, fill = D.sheet, y1 = 70, hole, sparkles = 5, twinkle = false }: { seed: number; n: number; fill?: string; y1?: number; hole?: [number, number, number, number]; sparkles?: number; twinkle?: boolean }) {
  const pts = scatter(seed, n + sparkles, { y1, hole })
  return (
    <g fill={fill}>
      {pts.map((p, i) =>
        i < sparkles ? (
          <path key={i} d={sparkle(p.x, p.y, fx(1.1 + p.t * 1.2))} className={twinkle ? 'mbd-tw' : undefined} style={twinkle ? { animationDelay: `${fx(-p.t * 4)}s` } : undefined} />
        ) : (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={fx(0.18 + p.t * 0.32)}
            fillOpacity={fx(0.55 + p.t * 0.45)}
            className={twinkle && i % 3 === 0 ? 'mbd-tw' : undefined}
            style={twinkle && i % 3 === 0 ? { animationDelay: `${fx(-p.t * 4)}s` } : undefined}
          />
        ),
      )}
    </g>
  )
}

/** A five-petal blossom. */
export function Blossom({ x, y, r, fill, centre = D.saffron, rot = 0 }: { x: number; y: number; r: number; fill: string; centre?: string; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={fx(-r * 0.55)} rx={fx(r * 0.42)} ry={fx(r * 0.55)} transform={`rotate(${a})`} fill={fill} />
      ))}
      <circle r={fx(r * 0.25)} fill={centre} />
    </g>
  )
}

/** A leaf shape pointing up, centred on (x, y). */
export function Leaf({ x, y, s, rot, fill, vein }: { x: number; y: number; s: number; rot: number; fill: string; vein?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 -3 Q2.4 -0.6 0 3 Q-2.4 -0.6 0 -3Z" fill={fill} />
      {vein ? <path d="M0 -2.2 L0 3.6" stroke={vein} strokeWidth="0.25" strokeLinecap="round" /> : null}
    </g>
  )
}
