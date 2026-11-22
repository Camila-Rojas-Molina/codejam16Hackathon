// Chat: discovering compatible people and talking to the ones you've connected with.
import type { DecisionStyle, DogStance, GroupSize, Interest, Pace, PlanningStyle, SocialEnergy } from '../profile/types'
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
  /** Public answers used to rank people in Discover (never the private ones; see profile/privacy.ts). */
  traits?: PersonTraits
}

export type PersonTraits = {
  energy?: SocialEnergy
  planning?: PlanningStyle
  decisions?: DecisionStyle
  pace?: Pace
  groupSize?: GroupSize
  /** Never 'no-dogs': that answer is private. */
  dogStance?: Exclude<DogStance, 'no-dogs'>
}

// ---- Connections ------------------------------------------------------------------------------
// A tourist asks a local to connect; the local says Connect or Not now. Accepted connections open a
// conversation in Messages and leave Discover on both sides. Rules: backend/supabase/migrations/013_connections.sql.

/**
 *   pending    waiting for the local's answer
 *   accepted   connected: you can message each other
 *   declined   the local said "not now" (closed, no conversation)
 *   cancelled  the tourist withdrew the request before an answer
 *   removed    one of you removed the other from Messages
 */
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed'

export type Connection = {
  id: string
  status: ConnectionStatus
  /** outgoing = you asked; incoming = they asked you. */
  direction: 'outgoing' | 'incoming'
  /** The other person. */
  person: Person
  createdAt: number
  respondedAt: number | null
  updatedAt: number
  removedByMe: boolean
  /** False until you've been shown the latest change (a new request, or the answer to yours). */
  seen: boolean
}

/** A local you could ask to connect with, and how well you match. */
export type DiscoverEntry = { person: Person; pending: boolean }

export type Message = {
  id: string
  /** 'me' = sent by this account; 'them' = received (only ever arrives from the messaging backend). */
  from: 'me' | 'them'
  text: string
  at: number
  /** Your own messages are always read; theirs once you've opened the conversation. */
  read: boolean
  /** Server messages you sent: true once they've read it. */
  seenByThem?: boolean
  /** Typed on this device before messaging reached the server: the other person never got it. */
  local?: boolean
}

/**
 * What's stored per conversation: who it's with and the messages so far.
 * `server` threads come from Supabase (015_messages.sql); the rest live on this device.
 */
export type Thread = { person: Person; messages: Message[]; server?: boolean }

/** Where messages to someone go: Supabase (they get them), or this device (samples, no backend). */
export type Delivery = 'server' | 'device'

/** A conversation with one person: someone you're connected with, or a hunt teammate. */
export type Conversation = {
  person: Person
  /** The accepted connection behind it (null for hunt teammates and older threads). */
  connection: Connection | null
  messages: Message[]
  unread: number
  last: Message | null
  delivery: Delivery
}

export const MESSAGE_MAX_LENGTH = 500
