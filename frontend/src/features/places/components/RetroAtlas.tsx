// "Where I've explored": a vintage atlas with a pin for every discovered city.
// The map art is SVG (scales with the container); the pins are real buttons laid over it, so they
// stay a tappable size at any width, take keyboard focus, and show the city name on hover, focus
// or tap. New pins drop in. No map service, no API key.
import { useState } from 'react'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { cityLabel, isPinned } from '../../profile/model'
import type { DiscoveredCity } from '../../profile/types'
import { MAP_H, MAP_W, NORTH, project } from '../mapFrame'
import { LAND_PATH } from '../worldLand'

const GRID_LNG = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]
const GRID_LAT = [60, 30, 0, -30]

function CompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="22" fill="var(--color-sheet)" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2 3" />
      <path d="M32 4 37 32 32 60 27 32z" fill="var(--color-saffron)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 32 32 27 60 32 32 37z" fill="var(--color-sheet)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 4 37 32H27z" fill="var(--color-sienna)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <text x="32" y="-2" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--color-ink)" fontFamily="var(--font-sans)">
        N
      </text>
    </svg>
  )
}

type RetroAtlasProps = {
  cities: DiscoveredCity[]
  /** Highlight (and drop-animate) this city, e.g. the one just added. */
  newestId?: string | null
  className?: string
}

export default function RetroAtlas({ cities, newestId, className }: RetroAtlasProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const pinned = cities.filter(isPinned)
  const countries = new Set(pinned.map((c) => c.countryCode)).size

  return (
    <figure className={cn('border-2 border-ink bg-teal-soft', className)}>
      <div className="relative" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <pattern id="atlas-waves" width="28" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 10c4-3 10-3 14 0s10 3 14 0" fill="none" stroke="var(--color-teal)" strokeOpacity=".35" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#atlas-waves)" />
          {/* Graticule */}
          <g stroke="var(--color-ink)" strokeOpacity=".3" strokeWidth="1" strokeDasharray="3 5" fill="none">
            {GRID_LNG.map((lng) => {
              const [x] = project(0, lng)
              return <line key={lng} x1={x} x2={x} y1={0} y2={MAP_H} />
            })}
            {GRID_LAT.map((lat) => {
              const [, y] = project(lat, 0)
              return <line key={lat} x1={0} x2={MAP_W} y1={y} y2={y} />
            })}
          </g>
          <line x1="0" x2={MAP_W} y1={(NORTH / 360) * MAP_W} y2={(NORTH / 360) * MAP_W} stroke="var(--color-sienna-deep)" strokeOpacity=".55" strokeWidth="1.4" />
          {/* Land */}
          <path d={LAND_PATH} fill="var(--color-saffron-soft)" stroke="var(--color-ink)" strokeWidth="1.3" strokeLinejoin="round" fillRule="evenodd" />
          <text x="8" y={(NORTH / 360) * MAP_W - 5} fontSize="10" fontWeight="700" letterSpacing="2" fill="var(--color-sienna-deep)" fontFamily="var(--font-sans)">
            EQUATOR
          </text>
        </svg>

        {/* Pins: real buttons positioned by percentage, so they keep their size at any map width. */}
        <ul className="absolute inset-0" aria-label="Cities on the map">
          {pinned.map((c) => {
            const [x, y] = project(c.lat!, c.lng!)
            const left = (x / MAP_W) * 100
            const top = (y / MAP_H) * 100
            const open = selected === c.id
            const label = cityLabel(c)
            return (
              <li key={c.id} className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={open}
                  onClick={() => setSelected(open ? null : c.id)}
                  className={cn('group/pin peer absolute bottom-0 left-1/2 -translate-x-1/2 focus-visible:outline-none', c.id === newestId && 'motion-safe:animate-pop')}
                >
                  <Icon
                    name="pin"
                    accent="sienna"
                    strokeWidth={2}
                    className={cn('size-7 drop-shadow-[1px_1px_0_var(--color-ink)] transition-transform group-hover/pin:-translate-y-0.5 group-focus-visible/pin:scale-125 sm:size-8', open && 'scale-125')}
                  />
                </button>
                {/* Name tag: shown on hover, keyboard focus, or when tapped. */}
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute bottom-9 z-10 border-2 border-ink bg-sheet px-2 py-0.5 text-xs font-bold whitespace-nowrap shadow-block-sm sm:bottom-10',
                    left > 75 ? 'right-0' : left < 25 ? 'left-0' : 'left-1/2 -translate-x-1/2',
                    open ? 'block' : 'hidden peer-hover:block peer-focus-visible:block',
                  )}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ul>

        <CompassRose className="absolute bottom-2 left-2 size-12 sm:size-16" />
      </div>
      <figcaption className="sheet-grain flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink px-4 py-2.5">
        <span className="font-display text-lg uppercase">MIGO Atlas</span>
        <span className="text-sm font-bold">
          {pinned.length} {pinned.length === 1 ? 'city' : 'cities'} · {countries} {countries === 1 ? 'country' : 'countries'}
        </span>
      </figcaption>
    </figure>
  )
}
