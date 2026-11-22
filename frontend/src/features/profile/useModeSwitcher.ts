// Switching between Tourist and Local mode. If the mode already has its context (an active trip, or a
// local profile) it switches straight away; otherwise it opens that mode's short setup first, and only
// switches once the setup is saved. Nothing else about the profile changes.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'
import { modeMeta } from '../onboarding/options'
import type { SetupNavState } from './flow'
import { isModeReady } from './model'
import type { ExploreMode } from './types'

export function useModeSwitcher() {
  const { profile, switchMode } = useStore()
  const navigate = useNavigate()
  const [pending, setPending] = useState<ExploreMode | null>(null)
  const [message, setMessage] = useState('')

  async function choose(mode: ExploreMode, opts: { returnTo: string; then?: () => void }) {
    if (pending) return
    if (!isModeReady(profile, mode)) {
      navigate(`/mode/${mode}`, { state: { activate: true, returnTo: opts.returnTo } satisfies SetupNavState })
      return
    }
    if (profile?.activeMode === mode) return opts.then?.()
    setPending(mode)
    try {
      await switchMode(mode)
      setMessage(`Switched to ${modeMeta(mode).title} mode.`)
      opts.then?.()
    } catch {
      setMessage('Couldn’t switch modes. Please try again.')
    } finally {
      setPending(null)
    }
  }

  return { choose, pending, message, activeMode: profile?.activeMode ?? null }
}

// The look of one mode option, shared by ModeToggle, ModeSwitch and ModePage. Both start as equal
// sheet buttons; hover gives a light tint (Tourist saffron, Local teal), and the chosen mode gets
// the full fill plus a thicker ink rule (and a tick, drawn by the component). Ink text throughout
// (≥7:1). Tailwind only applies hover: on devices that can hover, so taps never leave a tint behind.
const modeTones: Record<ExploreMode, { hover: string; selected: string }> = {
  tourist: { hover: 'hover:bg-saffron-soft', selected: 'bg-saffron' },
  local: { hover: 'hover:bg-teal-soft/60', selected: 'bg-teal-soft' },
}

export function modeOptionClasses(mode: ExploreMode, selected: boolean) {
  return cn(
    'relative border-2 border-ink text-ink transition-[background-color,box-shadow,transform] duration-200 ease-out',
    'active:translate-x-px active:translate-y-px aria-busy:cursor-wait',
    selected ? cn(modeTones[mode].selected, 'inset-ring-2 inset-ring-ink') : cn('bg-sheet', modeTones[mode].hover),
  )
}
