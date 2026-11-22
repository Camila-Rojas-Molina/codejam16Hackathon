// Puts device threads (lib/profileDb) and server messages (015_messages.sql) together into one
// thread per person. Pure, so the store can memoise it.
import type { ServerMessage } from '../../lib/backend'
import type { Connection, Delivery, Message, Person, Thread } from './types'

export type Inbox = { byId: Record<string, ServerMessage>; people: Record<string, Person> }

export function mergeThreads(
  device: Record<string, Thread>,
  inbox: Inbox,
  connections: Connection[] | null,
  delivery: (personId: string) => Delivery,
): Record<string, Thread> {
  const out: Record<string, Thread> = {}
  const cards = new Map((connections ?? []).map((c) => [c.person.id, c.person]))

  for (const [id, t] of Object.entries(device)) {
    if (delivery(id) === 'device') {
      out[id] = t
      continue
    }
    // Typed before messaging reached the server: kept, but marked (they never got these).
    out[id] = { person: cards.get(id) ?? t.person, server: true, messages: t.messages.map((m) => ({ ...m, local: true })) }
  }

  const byPerson = new Map<string, Message[]>()
  for (const { with: withId, ...m } of Object.values(inbox.byId)) {
    const list = byPerson.get(withId)
    if (list) list.push(m)
    else byPerson.set(withId, [m])
  }
  for (const [id, messages] of byPerson) {
    const person = cards.get(id) ?? inbox.people[id] ?? out[id]?.person
    if (!person) continue
    out[id] = {
      person,
      server: true,
      messages: [...(out[id]?.messages ?? []), ...messages].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)),
    }
  }
  return out
}
