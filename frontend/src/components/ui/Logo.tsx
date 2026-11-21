import { useState } from 'react'
import { APP_NAME } from '../../lib/config'
import { cn } from '../../lib/cn'

type LogoSize = 'sm' | 'lg'

type LogoProps = {
  size?: LogoSize
  className?: string
}

const imgSizes: Record<LogoSize, string> = { sm: 'h-10', lg: 'h-40' }
// Red on sky is 1.5:1, so the wordmark is only ever rendered big (PRD 7 contrast rule).
const textSizes: Record<LogoSize, string> = { sm: 'text-3xl', lg: 'text-7xl leading-[0.85]' }

// Renders /assets/logo.png when it exists, otherwise a stamp-font wordmark of APP_NAME.
export default function Logo({ size = 'lg', className }: LogoProps) {
  const [hasImage, setHasImage] = useState(true)

  if (hasImage) {
    return (
      <img
        src="/assets/logo.png"
        alt={APP_NAME}
        className={cn('w-auto', imgSizes[size], className)}
        onError={() => setHasImage(false)}
      />
    )
  }

  return (
    <span role="img" aria-label={APP_NAME} className={cn('block font-display text-red uppercase', textSizes[size], className)}>
      {APP_NAME}
    </span>
  )
}
