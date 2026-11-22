// The MIGO Atlas: a vintage, hand-printed world map with a pin for every place.
//   - The map art is SVG (land with water-lining, graticule, ocean names, compass rose); it zooms by
//     changing the viewBox, so lines stay crisp at any size.
//   - Pins are real buttons laid over it, so they keep a tappable size at any width, take keyboard
//     focus, and show the place name on hover, focus or tap.
//   - Pins that would sit on top of each other merge into a numbered stamp; tapping it zooms in.
//   - It starts zoomed to fit the pins; "Whole world" and "Fit pins" switch views.
// No map service, no API key, no tiles.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { MAP_H, MAP_W, MIN_VIEW_W, NORTH, SOUTH, clampView, fitView, project, sameView, worldView, type MapView } from '../mapFrame'
import type { AtlasPin } from '../pins'
import { LAND_PATH } from '../worldLand'

type Mode = { kind: 'fit' } | { kind: 'world' } | { kind: 'view'; view: MapView }

type Group = { id: string; members: AtlasPin[]; x: number; y: number }

const OCEANS: [label: string, lat: number, lng: number][] = [
  ['Pacific Ocean', -12, -132],
  ['Atlantic Ocean', 28, -45],
  ['Indian Ocean', -24, 79],
  ['Southern Ocean', -52, 20],
]

/** Narrower containers get a taller map, so a phone shows more than a thin strip. */
const NARROW_BELOW = 560
/** Pins closer than this (px) merge into a numbered stamp. */
const CLUSTER_PX = 30

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function CompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="-4 -12 72 80" className={className} aria-hidden>
      <circle cx="32" cy="32" r="22" fill="var(--color-sheet)" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2 3" />
      <path d="M32 4 37 32 32 60 27 32z" fill="var(--color-saffron)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 32 32 27 60 32 32 37z" fill="var(--color-sheet)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 4 37 32H27z" fill="var(--color-sienna)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <text x="32" y="-2" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--color-ink)" fontFamily="var(--font-sans)">
        N
      </text>
    </svg>
  )
}

/** The home marker: a teal house stamp on a short post, unlike the explored-city pins. */
function HomeMarker({ active }: { active: boolean }) {
  return (
    <span className={cn('relative flex flex-col items-center transition-transform', active && 'scale-110')}>
      <span className="grid size-8 place-items-center border-2 border-ink bg-teal shadow-block-sm">
        <Icon name="house" accent="sheet" strokeWidth={2} className="size-5 text-ink" />
      </span>
      <span className="h-2.5 w-0.5 bg-ink" />
      <span className="-mt-1 size-2 rounded-full border-2 border-ink bg-sheet" />
    </span>
  )
}

/** Animates between views (skipped when the person prefers less motion). */
function useAnimatedView(target: MapView) {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)
  const { x, y, w, h } = target
  useEffect(() => {
    const from = shownRef.current
    const to = { x, y, w, h }
    if (sameView(from, to)) return
    let raf = 0
    const start = performance.now()
    const duration = prefersReducedMotion() ? 0 : 420
    const tick = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const v = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e }
      shownRef.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [x, y, w, h])
  return shown
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

const inside = (v: MapView, [x, y]: [number, number], margin = 0) =>
  x >= v.x - margin && x <= v.x + v.w + margin && y >= v.y - margin && y <= v.y + v.h + margin

const centredOn = (v: MapView, [x, y]: [number, number]) => clampView({ ...v, x: x - v.w / 2, y: y - v.h / 2 })

const reaspect = (v: MapView, aspect: number): MapView => {
  const h = v.w / aspect
  return clampView({ x: v.x, y: v.y + (v.h - h) / 2, w: v.w, h })
}

type RetroAtlasProps = {
  /** Explored places. */
  pins: AtlasPin[]
  /** Home, drawn as a distinct house marker. */
  home?: AtlasPin | null
  /** Dotted voyage lines from home to each pin. */
  routes?: boolean
  /** Drop-animate this pin (e.g. the one just added). */
  newestId?: string | null
  /** Controlled selection (the pin whose name tag is open). Omit to let the atlas manage it. */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Closest the automatic fit zooms in, in map units (1000 = the whole world). */
  fitMinW?: number
  /** Width ÷ height on narrow and on wide containers. */
  aspect?: { narrow: number; wide: number }
  title?: string
  /** Shown in the caption, e.g. "8 cities · 7 countries". */
  stats?: ReactNode
  /** Shown over the map when there's nothing pinned yet. */
  emptyMessage?: string
  className?: string
}

export default function RetroAtlas({
  pins,
  home = null,
  routes = false,
  newestId,
  selectedId,
  onSelect,
  fitMinW = MIN_VIEW_W * 2.5,
  aspect: aspects = { narrow: 1.45, wide: 2.1 },
  title = 'MIGO Atlas',
  stats,
  emptyMessage,
  className,
}: RetroAtlasProps) {
  const [boxRef, width] = useWidth<HTMLDivElement>()
  const aspect = width > 0 && width < NARROW_BELOW ? aspects.narrow : aspects.wide
  const [mode, setMode] = useState<Mode>({ kind: 'fit' })
  const [ownSelected, setOwnSelected] = useState<string | null>(null)
  const selected = selectedId !== undefined ? selectedId : ownSelected
  const select = (id: string | null) => (onSelect ? onSelect(id) : setOwnSelected(id))

  // A new pin always brings the view back to "fit", so you see it land.
  const [lastNewest, setLastNewest] = useState(newestId)
  if (newestId !== lastNewest) {
    setLastNewest(newestId)
    if (newestId) setMode({ kind: 'fit' })
  }

  const all = useMemo(() => (home ? [...pins, home] : pins), [pins, home])
  const points = useMemo(() => all.map((p) => project(p.lat, p.lng)), [all])
  let target =
    mode.kind === 'world' ? worldView(aspect) : mode.kind === 'view' ? reaspect(mode.view, aspect) : fitView(points, aspect, fitMinW)
  // A pin picked from outside (e.g. the list below) is brought into view.
  const selectedPin = all.find((p) => p.id === selected)
  if (selectedPin) {
    const pt = project(selectedPin.lat, selectedPin.lng)
    if (!inside(target, pt, -target.w * 0.04)) target = centredOn(target, pt)
  }
  const view = useAnimatedView(target)
  const world = worldView(aspect)
  const isWorld = sameView(target, world)
  const isFit = sameView(target, fitView(points, aspect, fitMinW))

  // Map units per screen pixel: keeps labels and strokes a constant size while zooming.
  const k = view.w / (width || 700)

  // Group explored pins that would overlap at the target zoom. Home and the selected pin stay apart.
  const groups = useMemo<Group[]>(() => {
    const kt = target.w / (width || 700)
    const radius = target.w > MIN_VIEW_W * 1.1 ? CLUSTER_PX * kt : 0
    const out: (Group & { sx: number; sy: number })[] = []
    for (const p of pins) {
      const [x, y] = project(p.lat, p.lng)
      const g = p.id === selected ? undefined : out.find((o) => o.id !== selected && Math.hypot(o.sx - x, o.sy - y) < radius)
      if (g) g.members.push(p)
      else out.push({ id: p.id, members: [p], x, y, sx: x, sy: y })
    }
    return out.map((g) => {
      if (g.members.length === 1) return g
      const pts = g.members.map((m) => project(m.lat, m.lng))
      return { ...g, id: `group-${g.members.map((m) => m.id).join('-')}`, x: pts.reduce((s, p) => s + p[0], 0) / pts.length, y: pts.reduce((s, p) => s + p[1], 0) / pts.length }
    })
  }, [pins, selected, target.w, width])

  const pos = (x: number, y: number) => ({ left: ((x - view.x) / view.w) * 100, top: ((y - view.y) / view.h) * 100 })
  const homePt = home ? project(home.lat, home.lng) : null

  const step = view.w > 420 ? 30 : view.w > 140 ? 10 : 5
  const lngLines: number[] = []
  for (let lng = -180 + step; lng < 180; lng += step) lngLines.push(lng)
  const latLines: number[] = []
  for (let lat = Math.ceil(SOUTH / step) * step; lat < NORTH; lat += step) latLines.push(lat)

  function zoomTo(members: AtlasPin[]) {
    select(null)
    const v = fitView(members.map((m) => project(m.lat, m.lng)), aspect, MIN_VIEW_W)
    // Never a dead end: always at least halve the view.
    const w = Math.min(v.w, target.w / 2)
    setMode({ kind: 'view', view: clampView({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - w / aspect) / 2, w: Math.max(w, MIN_VIEW_W), h: Math.max(w, MIN_VIEW_W) / aspect }) })
  }

  function tag(label: string, left: number, top: number, open: boolean, above: number) {
    const below = top < 24
    return (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute z-10 max-w-[60vw] truncate border-2 border-ink bg-sheet px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-block-sm sm:text-sm',
          below ? 'top-2' : '',
          left > 70 ? 'right-[-10px]' : left < 30 ? 'left-[-10px]' : 'left-1/2 -translate-x-1/2',
          open ? 'block' : 'hidden group-hover/pin:block group-focus-within/pin:block',
        )}
        style={below ? undefined : { bottom: above }}
      >
        {label}
      </span>
    )
  }

  const summary = [
    home ? `Home: ${home.label}.` : '',
    pins.length ? `${pins.length} ${pins.length === 1 ? 'place' : 'places'} pinned: ${pins.map((p) => p.label).join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <figure
      className={cn('border-2 border-ink bg-teal-soft', className)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && selected) {
          e.stopPropagation()
          select(null)
        }
      }}
    >
      <div ref={boxRef} className="relative overflow-hidden" style={{ aspectRatio: `${aspect}` }}>
        {/* Sea: engraved wave lines that stay the same size at any zoom. */}
        <svg className="absolute inset-0 size-full" aria-hidden onClick={() => select(null)}>
          <defs>
            <pattern id="atlas-waves" width="26" height="13" patternUnits="userSpaceOnUse">
              <path d="M0 9c4-3 9-3 13 0s9 3 13 0" fill="none" stroke="var(--color-teal)" strokeOpacity=".35" strokeWidth="1.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#atlas-waves)" />
        </svg>

        {/* Land, graticule and labels: zoomed through the viewBox. */}
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
        >
          <g stroke="var(--color-ink)" strokeOpacity=".28" strokeWidth="1" strokeDasharray="3 5" fill="none" vectorEffect="non-scaling-stroke">
            {lngLines.map((lng) => {
              const [x] = project(0, lng)
              return <line key={`x${lng}`} x1={x} x2={x} y1={-MAP_H} y2={MAP_H * 2} vectorEffect="non-scaling-stroke" />
            })}
            {latLines.map((lat) => {
              const [, y] = project(lat, 0)
              return <line key={`y${lat}`} x1={-MAP_W} x2={MAP_W * 2} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
            })}
          </g>
          {/* Tropics and equator, in red ink like an old school atlas. */}
          {[23.44, -23.44].map((lat) => (
            <line key={lat} x1={-MAP_W} x2={MAP_W * 2} y1={project(lat, 0)[1]} y2={project(lat, 0)[1]} stroke="var(--color-sienna-deep)" strokeOpacity=".4" strokeWidth="1" strokeDasharray="8 4 2 4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={-MAP_W} x2={MAP_W * 2} y1={project(0, 0)[1]} y2={project(0, 0)[1]} stroke="var(--color-sienna-deep)" strokeOpacity=".6" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          {/* Water-lining: soft rings along every coast, then the land itself. */}
          <path d={LAND_PATH} fill="none" stroke="var(--color-teal)" strokeOpacity=".16" strokeWidth="10" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={LAND_PATH} fill="none" stroke="var(--color-teal)" strokeOpacity=".28" strokeWidth="5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={LAND_PATH} fill="var(--color-saffron-soft)" stroke="var(--color-ink)" strokeWidth="1.3" strokeLinejoin="round" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
          <g fontFamily="var(--font-serif)" fontStyle="italic" fill="var(--color-teal-deep)" textAnchor="middle" fontSize={(width && width < NARROW_BELOW ? 10 : 13) * k} letterSpacing={1.5 * k}>
            {OCEANS.map(([label, lat, lng]) => {
              const [x, y] = project(lat, lng)
              return (
                <text key={label} x={x} y={y}>
                  {label}
                </text>
              )
            })}
          </g>
          <text x={view.x + 10 * k} y={project(0, 0)[1] - 5 * k} fontSize={9 * k} fontWeight="700" letterSpacing={2 * k} fill="var(--color-sienna-deep)" fontFamily="var(--font-sans)">
            EQUATOR
          </text>
          {/* Voyage lines from home. */}
          {routes && homePt && (
            <g fill="none" stroke="var(--color-sienna-deep)" strokeOpacity=".75" strokeWidth="1.6" strokeDasharray="1 5" strokeLinecap="round">
              {pins.map((p) => {
                const [x, y] = project(p.lat, p.lng)
                const d = Math.hypot(x - homePt[0], y - homePt[1])
                if (d < 2) return null
                return (
                  <path key={p.id} d={`M${homePt[0]} ${homePt[1]} Q${(x + homePt[0]) / 2} ${(y + homePt[1]) / 2 - d * 0.22} ${x} ${y}`} vectorEffect="non-scaling-stroke" />
                )
              })}
            </g>
          )}
        </svg>

        {/* Printed double rule around the map. */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_5px_var(--color-sheet),inset_0_0_0_7px_var(--color-ink)]" aria-hidden />
        <CompassRose className="pointer-events-none absolute bottom-3 left-3 size-11 sm:size-14" />

        {all.length === 0 && emptyMessage && (
          <p className="absolute inset-x-6 top-1/2 mx-auto w-fit -translate-y-1/2 border-2 border-ink bg-sheet px-3 py-2 text-center text-sm font-semibold shadow-block-sm">
            {emptyMessage}
          </p>
        )}

        {/* Pins: real buttons positioned by percentage, so they keep their size at any width. */}
        {width > 0 && (
          <ul className="pointer-events-none absolute inset-0" aria-label="Pins on the map">
            {groups.map((g) => {
              const { left, top } = pos(g.x, g.y)
              if (left < -5 || left > 105 || top < -5 || top > 110) return null
              if (g.members.length > 1) {
                const names = g.members.map((m) => m.label.split(',')[0])
                const label = `${g.members.length} places: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ` and ${names.length - 4} more` : ''}`
                return (
                  <li key={g.id} className="group/pin absolute" style={{ left: `${left}%`, top: `${top}%` }}>
                    <button
                      type="button"
                      onClick={() => zoomTo(g.members)}
                      aria-label={`${label}. Zoom in`}
                      className="pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center focus-visible:outline-3 focus-visible:outline-ink"
                    >
                      <span className="grid size-9 place-items-center rounded-full border-2 border-ink bg-sienna font-display text-sm text-sheet shadow-block-sm outline-2 outline-offset-2 outline-ink/40 outline-dashed transition-transform group-hover/pin:scale-110">
                        {g.members.length}
                      </span>
                    </button>
                    {tag(`${label} · tap to zoom`, left, top, false, 26)}
                  </li>
                )
              }
              const p = g.members[0]
              const open = selected === p.id
              const isNew = p.id === newestId
              return (
                <li key={p.id} className={cn('group/pin absolute', open && 'z-20')} style={{ left: `${left}%`, top: `${top}%` }}>
                  {isNew && <span className="absolute -top-2 -left-2 size-4 rounded-full border-2 border-sienna motion-safe:animate-ring" aria-hidden />}
                  <button
                    type="button"
                    aria-label={p.label}
                    aria-pressed={open}
                    onClick={() => select(open ? null : p.id)}
                    className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-full items-end justify-center focus-visible:outline-3 focus-visible:outline-ink"
                  >
                    <Icon
                      name="pin"
                      accent="sienna"
                      strokeWidth={2}
                      className={cn(
                        'size-8 translate-y-[3px] drop-shadow-[1px_1px_0_var(--color-ink)] transition-transform group-hover/pin:translate-y-0',
                        open && 'scale-125',
                        isNew && 'motion-safe:animate-pop',
                      )}
                    />
                  </button>
                  {tag(p.label, left, top, open, 40)}
                </li>
              )
            })}
            {home && homePt && (() => {
              const { left, top } = pos(homePt[0], homePt[1])
              if (left < -5 || left > 105 || top < -5 || top > 110) return null
              const open = selected === home.id
              return (
                <li className={cn('group/pin absolute z-10', open && 'z-20')} style={{ left: `${left}%`, top: `${top}%` }}>
                  <button
                    type="button"
                    aria-label={`Home: ${home.label}`}
                    aria-pressed={open}
                    onClick={() => select(open ? null : home.id)}
                    className="pointer-events-auto absolute flex h-14 w-11 -translate-x-1/2 -translate-y-full items-end justify-center focus-visible:outline-3 focus-visible:outline-ink"
                  >
                    <span className="translate-y-[4px]">
                      <HomeMarker active={open} />
                    </span>
                  </button>
                  {tag(`Home · ${home.label}`, left, top, open, 52)}
                </li>
              )
            })()}
          </ul>
        )}
      </div>

      <figcaption className="sheet-grain flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-ink px-3 py-2 sm:px-4">
        <span className="font-display text-lg uppercase">{title}</span>
        {stats && <span className="text-sm font-bold">{stats}</span>}
        <span className="sr-only">{summary}</span>
        {all.length > 0 && (
          <span className="ml-auto flex gap-2">
            {!isFit && (
              <button
                type="button"
                onClick={() => setMode({ kind: 'fit' })}
                className="flex min-h-11 items-center gap-1.5 border-2 border-ink bg-sheet px-2.5 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron"
              >
                <Icon name="pin" accent="sienna" className="size-5" />
                Fit pins
              </button>
            )}
            {!isWorld && (
              <button
                type="button"
                onClick={() => setMode({ kind: 'world' })}
                className="flex min-h-11 items-center gap-1.5 border-2 border-ink bg-sheet px-2.5 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:bg-saffron"
              >
                <Icon name="globe" className="size-5" />
                Whole world
              </button>
            )}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
