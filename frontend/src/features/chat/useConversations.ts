// Everyone in your Messages: people you're connected with (an accepted connection request), hunt
// teammates (in any mode or trip), and anyone you have a device thread with. Server threads
// (015_messages.sql) only show while you're matched: a removed match stops showing. Removing someone hides
// them (their messages are kept) until a connection is accepted after that time.
// Sorted by latest message; people you haven't messaged yet come last, newest connection first.
import { useMemo } from 'react'
import { messageDelivery } from '../../lib/api'
import type { User } from '../../lib/types'
import { useStore } from '../../store/useStore'
import type { Connection, Conversation, Person } from './types'

export const personFromUser = (u: User): Person => ({
  id: u.id,
  name: u.name,
  avatar: u.avatar,
  mode: u.role,
  interests: u.interests ?? [],
  languages: u.languages ?? [],
  funFact: u.funFact,
  demo: u.demo,
})

export function useConversations(): Conversation[] {
  const { partner, parked, threads, connections, profile } = useStore()
  const removed = profile?.removedChats
  return useMemo(() => {
    const people = new Map<string, { person: Person; connection: Connection | null; since: number }>()
    for (const p of [partner, ...Object.values(parked).map((s) => s.partner)]) {
      if (p) people.set(p.id, { person: personFromUser(p), connection: null, since: 0 })
    }
    for (const t of Object.values(threads)) {
      if (!t.server && !people.has(t.person.id)) people.set(t.person.id, { person: t.person, connection: null, since: 0 })
    }
    for (const c of connections ?? []) {
      if (c.status !== 'accepted') continue
      // A connection brings a removed person back only if it was made after the removal.
      people.set(c.person.id, { person: c.person, connection: c, since: c.respondedAt ?? c.updatedAt })
    }
    return [...people.values()]
      .filter(({ person, since }) => {
        const at = removed?.[person.id]
        return at === undefined || since > at
      })
      .map(({ person, connection, since }) => {
        const messages = threads[person.id]?.messages ?? []
        return {
          person,
          connection,
          messages,
          unread: messages.filter((m) => m.from === 'them' && !m.read).length,
          last: messages.at(-1) ?? null,
          delivery: messageDelivery(person.id),
          since,
        }
      })
      .sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0) || b.since - a.since)
      .map(({ since: _since, ...c }) => c)
  }, [partner, parked, threads, connections, removed])
}

/** True if you can message this person (they're in your Messages). */
export const canMessage = (conversations: Conversation[], personId: string) => conversations.some((c) => c.person.id === personId)

/**
 * What needs your attention in Chat:
 *   matched   locals: "You've been matched!" (a tourist picked you) until you Say hi or say Not now.
 *             Also first-version requests still waiting for an answer.
 *   answers   tourists: news about a match you made that you haven't seen (a local's Not now, or
 *             the yes to a first-version request).
 */
export function useConnectionNews() {
  const { connections } = useStore()
  return useMemo(() => {
    const list = connections ?? []
    const matched = list.filter((c) => c.direction === 'incoming' && !c.seen && (c.status === 'accepted' || c.status === 'pending'))
    const answers = list.filter((c) => c.direction === 'outgoing' && !c.seen && (c.status === 'accepted' || c.status === 'declined'))
    // A "not now" is shown once, quietly; it doesn't count towards the badge.
    const yes = answers.filter((c) => c.status === 'accepted')
    return { matched, answers, badge: matched.length + yes.length }
  }, [connections])
}
