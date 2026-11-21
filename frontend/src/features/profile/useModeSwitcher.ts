// Switching between Tourist and Local mode. If the mode already has its context (an active trip, or a
// local profile) it switches straight away; otherwise it opens that mode's short setup first, and only
// switches once the setup is saved. Nothing else about the profile changes.
import { useState } from 'react'
import { useNavigate } from 'react-router'
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
