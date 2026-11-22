import { useState } from 'react'
import { APP_NAME } from '../../lib/config'
import { cn } from '../../lib/cn'

type LogoSize = 'sm' | 'md' | 'lg'
type LogoVariant = 'wordmark' | 'icon'

type LogoProps = {
  size?: LogoSize
  /** wordmark = /assets/logo.png (MIGO), icon = /assets/icon.png (the M). */
  variant?: LogoVariant
  className?: string
}

// The PNGs are 500×500 with the artwork in the middle. These boxes are the artwork's pixel bounds,
// so we can crop the padding with CSS and keep the original asset untouched.
const ART: Record<LogoVariant, { src: string; box: [number, number, number, number] }> = {
  wordmark: { src: '/assets/logo.png', box: [38, 181, 480, 322] },
  icon: { src: '/assets/icon.png', box: [132, 155, 368, 345] },
}
const CANVAS = 500

const heights: Record<LogoSize, string> = { sm: 'h-9', md: 'h-12', lg: 'h-24' }
// Fallback wordmark only (the logo image is the brand); sienna-deep on paper is 4.6:1.
const textSizes: Record<LogoSize, string> = { sm: 'text-3xl', md: 'text-4xl', lg: 'text-7xl leading-[0.85]' }

// Renders the MIGO logo asset, cropped to its artwork. Falls back to a stamp-font wordmark if it can't load.
export default function Logo({ size = 'lg', variant = 'wordmark', className }: LogoProps) {
  const [hasImage, setHasImage] = useState(true)
  const { src, box } = ART[variant]
  const [x0, y0, x1, y1] = box
  const w = x1 - x0
  const h = y1 - y0

  if (hasImage) {
    return (
      <span
        role="img"
        aria-label={APP_NAME}
        className={cn('relative block shrink-0 overflow-hidden', heights[size], className)}
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => setHasImage(false)}
          className="absolute max-w-none"
          style={{
            width: `${(CANVAS / w) * 100}%`,
            left: `${(-x0 / w) * 100}%`,
            top: `${(-y0 / h) * 100}%`,
          }}
        />
      </span>
    )
  }

  return (
    <span role="img" aria-label={APP_NAME} className={cn('block font-display text-sienna-deep uppercase', textSizes[size], className)}>
      {variant === 'icon' ? APP_NAME.slice(0, 1) : APP_NAME}
    </span>
  )
}
