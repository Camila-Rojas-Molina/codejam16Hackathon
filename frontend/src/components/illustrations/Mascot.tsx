// Migo, the MIGO mascot: a friendly map pin. Original hand-drawn style art, flat fills, wobbly navy strokes.
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type MascotMood = 'wave' | 'cheer' | 'think'

const stroke = {
  stroke: 'var(--color-navy)',
  strokeWidth: 4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

type MascotProps = {
  mood?: MascotMood
  className?: string
  /** Pin fill. Sun for Tourist mode, bubble for Local, by convention. */
  fill?: string
}

export function Mascot({ mood = 'wave', className, fill = 'var(--color-bubble)' }: MascotProps) {
  return (
    <svg viewBox="0 0 120 152" className={cn('h-32 w-auto', className)} aria-hidden>
      <ellipse cx="60" cy="146" rx="22" ry="4" fill="var(--color-navy)" opacity="0.2" />

      {/* Arms behind the body */}
      {mood === 'cheer' ? (
        <g className="motion-safe:animate-wiggle" style={{ transformOrigin: '22px 74px' }}>
          <path d="M22 74 C13 66 9 56 7 45" fill="none" {...stroke} />
          <circle cx="7" cy="40" r="6" fill={fill} {...stroke} />
        </g>
      ) : mood === 'think' ? null : (
        <g>
          <path d="M21 80 C13 86 10 93 9 99" fill="none" {...stroke} />
          <circle cx="9" cy="103" r="6" fill={fill} {...stroke} />
        </g>
      )}
      {mood === 'think' ? (
        <g>
          <path d="M99 80 C106 88 108 96 108 104" fill="none" {...stroke} />
          <circle cx="108" cy="108" r="6" fill={fill} {...stroke} />
        </g>
      ) : (
        <g
          className={mood === 'wave' ? 'motion-safe:animate-wave' : 'motion-safe:animate-wiggle'}
          style={{ transformOrigin: '99px 74px' }}
        >
          <path d="M99 74 C108 67 112 58 114 47" fill="none" {...stroke} />
          <circle cx="114" cy="42" r="6" fill={fill} {...stroke} />
        </g>
      )}

      {/* Body: a slightly lopsided map pin */}
      <path
        d="M60 141 C52 124 22 102 19 66 C16 34 36 15 61 15 C88 16 104 36 101 64 C98 100 68 124 60 141 Z"
        fill={fill}
        {...stroke}
      />
      <path d="M33 46 C36 35 43 29 52 26" fill="none" stroke="var(--color-white)" strokeWidth="4" strokeLinecap="round" opacity="0.85" />

      {/* Cheeks */}
      <circle cx="37" cy="73" r="5.5" fill="var(--color-red)" opacity="0.3" />
      <circle cx="83" cy="73" r="5.5" fill="var(--color-red)" opacity="0.3" />

      {/* Eyes */}
      {mood === 'cheer' ? (
        <>
          <path d="M40 61 Q47 52 54 61" fill="none" {...stroke} />
          <path d="M66 61 Q73 52 80 61" fill="none" {...stroke} />
        </>
      ) : mood === 'think' ? (
        <>
          <ellipse cx="50" cy="56" rx="4" ry="5.5" fill="var(--color-navy)" />
          <ellipse cx="76" cy="56" rx="4" ry="5.5" fill="var(--color-navy)" />
          <path d="M44 45 Q50 42 55 45" fill="none" {...stroke} strokeWidth={3} />
        </>
      ) : (
        <>
          <ellipse cx="47" cy="59" rx="4.5" ry="6" fill="var(--color-navy)" />
          <ellipse cx="73" cy="59" rx="4.5" ry="6" fill="var(--color-navy)" />
          <circle cx="48.5" cy="56.5" r="1.6" fill="var(--color-white)" />
          <circle cx="74.5" cy="56.5" r="1.6" fill="var(--color-white)" />
        </>
      )}

      {/* Mouth */}
      {mood === 'cheer' ? (
        <path d="M47 73 Q60 92 73 73 Z" fill="var(--color-navy)" {...stroke} strokeWidth={3} />
      ) : mood === 'think' ? (
        <circle cx="63" cy="79" r="3.5" fill="none" {...stroke} strokeWidth={3} />
      ) : (
        <path d="M49 75 Q60 85 71 75" fill="none" {...stroke} />
      )}

      {/* Thinking hand on the chin, drawn over the body */}
      {mood === 'think' && (
        <g>
          <path d="M23 86 C30 97 40 99 47 94" fill="none" {...stroke} />
          <circle cx="51" cy="92" r="6" fill={fill} {...stroke} />
        </g>
      )}
    </svg>
  )
}

type MascotSaysProps = {
  children: ReactNode
  mood?: MascotMood
  fill?: string
  className?: string
}

/** Migo with a speech bubble. The words are real text (read by screen readers); the art is decorative. */
export function MascotSays({ children, mood = 'wave', fill, className }: MascotSaysProps) {
  return (
    <div className={cn('flex items-end gap-1', className)}>
      <Mascot mood={mood} fill={fill} className="h-28 shrink-0 motion-safe:animate-bob" />
      <div className="relative mb-10 min-w-0 flex-1">
        <svg viewBox="0 0 24 30" className="absolute bottom-3 -left-[19px] h-7 w-6" aria-hidden>
          <path d="M24 2 L2 24 L24 20 Z" fill="var(--color-paper)" />
          <path d="M23 3 L2 24 L23 20" fill="none" {...stroke} />
        </svg>
        <div className="rounded-[1.4rem_1.1rem_1.5rem_1.2rem] border-4 border-navy bg-paper px-4 py-3 text-navy">
          {children}
        </div>
      </div>
    </div>
  )
}
