// Everyone you can talk to: teammates you've been matched with (in any mode or trip) plus anyone
// you already have a thread with. Sorted by latest message; teammates you haven't messaged come last.
import { useMemo } from 'react'
import type { User } from '../../lib/types'
import { useStore } from '../../store/useStore'
import type { Conversation, Person } from './types'

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
  const { partner, parked, threads } = useStore()
  return useMemo(() => {
    const people = new Map<string, Person>()
    for (const p of [partner, ...Object.values(parked).map((s) => s.partner)]) {
      if (p) people.set(p.id, personFromUser(p))
    }
    for (const t of Object.values(threads)) people.set(t.person.id, t.person)
    return [...people.values()]
      .map((person) => {
        const messages = threads[person.id]?.messages ?? []
        return {
          person,
          messages,
          unread: messages.filter((m) => m.from === 'them' && !m.read).length,
          last: messages.at(-1) ?? null,
        }
      })
      .sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0))
  }, [partner, parked, threads])
}

/** True if you can message this person (you've been teammates, or there's already a thread). */
export const canMessage = (conversations: Conversation[], personId: string) => conversations.some((c) => c.person.id === personId)
