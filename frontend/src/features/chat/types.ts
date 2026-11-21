// Chat: discovering compatible people and talking to the ones you've connected with.
import type { Interest } from '../profile/types'
import type { Role } from '../../lib/types'

/** Someone you could meet. `demo` marks sample profiles shown until live discovery is connected. */
export type Person = {
  id: string
  name: string
  avatar: string
  mode: Role
  interests: Interest[]
  languages: string[]
  funFact?: string
  demo?: boolean
}

export type Message = {
  id: string
  /** 'me' = sent by this account; 'them' = received (only ever arrives from the messaging backend). */
  from: 'me' | 'them'
  text: string
  at: number
  read: boolean
}

/** What's stored per conversation: who it's with and the messages so far. */
export type Thread = { person: Person; messages: Message[] }

/** A conversation with one person. You can message people you've been matched with as teammates. */
export type Conversation = {
  person: Person
  messages: Message[]
  unread: number
  last: Message | null
}

export const MESSAGE_MAX_LENGTH = 500
