// Migo the walking globe as a nav icon (the MAP tab). The official cut-out, never redrawn, recoloured
// with an SVG filter into the icon set's palette so it sits with the line icons: dark linework in
// ink, the globe in the accent colour, highlights (eyes, shine) in paper, with a thin ink outline.
// Takes the same `accent` as <Icon>, so it follows the active / inactive states of the other tabs,
// and every colour is a design token (dark mode overrides the tokens, not this file).
//
// Uses the square head crop (public/assets/mascot/nav-icon.webp). Until that file exists, it falls
// back to the "hello" pose framed on the globe.
import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import type { IconAccent } from './Icon'

const accents: Record<IconAccent, string> = {
  saffron: 'var(--color-saffron)',
  teal: 'var(--color-teal)',
  sienna: 'var(--color-sienna)',
  sandy: 'var(--color-sandy)',
  sheet: 'var(--color-sheet)',
  none: 'var(--color-sheet)',
}

// Where the artwork sits in the 24×24 icon grid.
const HEAD = { href: '/assets/mascot/nav-icon.webp', x: 0.6, y: 0.6, width: 22.8, height: 22.8 }
// hello.webp is 344×378 with the globe centred near (157, 138), radius ~118: scale it so the globe
// fills the grid, and clip to it (the clouds and the waving arm would just be noise at this size).
const FALLBACK = { href: '/assets/mascot/hello.webp', x: -2.63, y: -0.86, width: 32.07, height: 35.24 }

// Remembered once the head crop fails to load, so later icons go straight to the fallback.
let headMissing = false

type MascotIconProps = {
  accent?: IconAccent
  /** Announced to screen readers. Omit when the icon sits next to text that says the same thing. */
  label?: string
  className?: string
}

export default function MascotIcon({ accent = 'saffron', label, className }: MascotIconProps) {
  const id = `migo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [fallback, setFallback] = useState(headMissing)
  const art = fallback ? FALLBACK : HEAD
  const ink = { floodColor: 'var(--color-ink)' }

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-6 shrink-0', className)}
      style={{ ['--icon-accent' as string]: accents[accent] }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          {/* Soften first, so the artwork's fine stippling drops out and only real lines remain. */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.12" result="soft" />
          {/* Darkness (1 − luminance), kept only where the artwork is. */}
          <feColorMatrix in="soft" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 1" result="dark" />
          <feComposite in="dark" in2="SourceAlpha" operator="in" result="darkIn" />
          {/* Linework: only the darkest tones, snapped to a crisp edge. */}
          <feComponentTransfer in="darkIn" result="lineAlpha">
            <feFuncA type="linear" slope="6.5" intercept="-3.75" />
          </feComponentTransfer>
          {/* Thicken it a touch so it holds up at 1x. */}
          <feMorphology in="lineAlpha" operator="dilate" radius="0.18" result="lineMask" />
          {/* Highlights: only the lightest tones. */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0" result="light" />
          <feComposite in="light" in2="SourceAlpha" operator="in" result="lightIn" />
          <feComponentTransfer in="lightIn" result="shineMask">
            <feFuncA type="linear" slope="8" intercept="-6.9" />
          </feComponentTransfer>
          {/* A thin ink outline around the whole silhouette, like the other icons. */}
          <feMorphology in="SourceAlpha" operator="dilate" radius="0.45" result="halo" />
          <feFlood style={ink} result="inkFill" />
          <feComposite in="inkFill" in2="halo" operator="in" result="outline" />
          <feFlood style={{ floodColor: 'var(--icon-accent)' }} result="accentFill" />
          <feComposite in="accentFill" in2="SourceAlpha" operator="in" result="base" />
          <feFlood style={{ floodColor: 'var(--color-sheet)' }} result="paperFill" />
          <feComposite in="paperFill" in2="shineMask" operator="in" result="shine" />
          <feComposite in="inkFill" in2="lineMask" operator="in" result="lines" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="base" />
            <feMergeNode in="shine" />
            <feMergeNode in="lines" />
          </feMerge>
        </filter>
        <clipPath id={`${id}-clip`}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      <image
        href={art.href}
        x={art.x}
        y={art.y}
        width={art.width}
        height={art.height}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${id})`}
        clipPath={fallback ? `url(#${id}-clip)` : undefined}
        onError={() => {
          headMissing = true
          setFallback(true)
        }}
      />
      {fallback && <circle cx="12" cy="12" r="10.9" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" />}
    </svg>
  )
}
