// The local's answer to "You've been matched!" (shared by MatchNotice and the Messages inbox).
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useStore } from '../../store/useStore'
import type { Connection } from './types'

/** The words for one match, shared with the Messages inbox. */
export function matchedCopy(c: Connection) {
  return c.person.demo
    ? `${c.person.name} (a sample tourist from MIGO’s demo pool) has been matched with you as their local.`
    : `${c.person.name} is visiting and picked you as their local. Want to show them around?`
}

/** Say hi / Not now for one match. `onDone` runs after a successful answer. */
export function useAnswerMatch() {
  const { respondToConnection } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function answer(c: Connection, sayHi: boolean) {
    setBusy(c.id)
    setError(null)
    try {
      const after = await respondToConnection(c.id, sayHi)
      if (sayHi && after.status === 'accepted') navigate(`/chat/${encodeURIComponent(c.person.id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t answer that. Try again.')
    } finally {
      setBusy(null)
    }
  }
  return { answer, busy, error }
}

