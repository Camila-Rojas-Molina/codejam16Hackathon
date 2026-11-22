// Device-local matches. The same rules as backend/supabase/migrations/013_connections.sql, for when
// Supabase isn't configured (every account on this device shares one table, so two accounts on one
// device can try the whole tourist → local flow) and for MIGO's sample profiles, which only exist in
// the app. Only the data layer (api.ts) imports this.
//
// A tourist picks a local → matched straight away (accepted). The local's "You've been matched!"
// stays new (recipientSeen false) until they answer it: Say hi keeps it, Not now closes it (declined).
// 'pending' / 'cancelled' rows come from the first version (the local had to accept a request).
import type { Connection, ConnectionStatus, Person } from '../features/chat/types'
import { readJSON, writeJSON } from './storage'

const KEY = 'migo:connections:v1'

/** How long a "Not now" keeps a local out of that tourist's Discover. Same as migo_decline_cooldown(). */
export const DECLINE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

export type Row = {
  id: string
  requesterId: string
  recipientId: string
  status: ConnectionStatus
  createdAt: number
  respondedAt: number | null
  updatedAt: number
  removedBy: string | null
  requesterSeen: boolean
  recipientSeen: boolean
  /** Snapshots of each side's public card, for people who aren't accounts on this device (samples). */
  requester: Person
  recipient: Person
}

const STATUSES: ConnectionStatus[] = ['pending', 'accepted', 'declined', 'cancelled', 'removed']

function isRow(v: unknown): v is Row {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Partial<Row>
  return (
    typeof r.id === 'string' &&
    typeof r.requesterId === 'string' &&
    typeof r.recipientId === 'string' &&
    STATUSES.includes(r.status as ConnectionStatus) &&
    typeof r.requester === 'object' &&
    typeof r.recipient === 'object'
  )
}

export function load(): Row[] {
  const raw = readJSON<{ rows?: unknown[] }>(KEY)
  return Array.isArray(raw?.rows) ? raw.rows.filter(isRow) : []
}

function save(rows: Row[]) {
  writeJSON(KEY, { rows })
}

const samePair = (r: Row, a: string, b: string) =>
  (r.requesterId === a && r.recipientId === b) || (r.requesterId === b && r.recipientId === a)
const live = (r: Row) => r.status === 'pending' || r.status === 'accepted'

/** The connection as `me` sees it. `fresh` swaps in the current card for people who are accounts here. */
export function asConnection(r: Row, me: string, fresh?: (id: string) => Person | null): Connection {
  const outgoing = r.requesterId === me
  const otherId = outgoing ? r.recipientId : r.requesterId
  return {
    id: r.id,
    status: r.status,
    direction: outgoing ? 'outgoing' : 'incoming',
    person: fresh?.(otherId) ?? (outgoing ? r.recipient : r.requester),
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    updatedAt: r.updatedAt,
    removedByMe: r.removedBy === me,
    seen: outgoing ? r.requesterSeen : r.recipientSeen,
  }
}

export function forAccount(me: string): Row[] {
  return load()
    .filter((r) => r.requesterId === me || r.recipientId === me)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function livePair(me: string, other: string): Row | null {
  return load().find((r) => samePair(r, me, other) && live(r)) ?? null
}

/** True when `other` said "not now" to `me` recently. */
export function declinedRecently(me: string, other: string, now = Date.now()): boolean {
  return load().some(
    (r) => r.requesterId === me && r.recipientId === other && r.status === 'declined' && (r.respondedAt ?? 0) > now - DECLINE_COOLDOWN_MS,
  )
}

const newId = () => `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Tourist (`me`) picks a local (`them`): a match, straight away. Same outcomes as
 * migo_request_connection: an existing match is returned as is, and an old pending request between
 * the two (either way) becomes the match. The local gets "You've been matched!" (recipientSeen false).
 */
export function request(me: Person, them: Person): Row {
  const rows = load()
  const now = Date.now()
  const existing = rows.find((r) => samePair(r, me.id, them.id) && live(r))
  if (existing) {
    if (existing.status === 'pending') {
      Object.assign(existing, {
        status: 'accepted',
        respondedAt: now,
        updatedAt: now,
        requesterSeen: existing.requesterId === me.id,
        recipientSeen: existing.recipientId === me.id,
      })
      save(rows)
    }
    return existing
  }
  const row: Row = {
    id: newId(),
    requesterId: me.id,
    recipientId: them.id,
    status: 'accepted',
    createdAt: now,
    respondedAt: now,
    updatedAt: now,
    removedBy: null,
    requesterSeen: true,
    recipientSeen: false,
    requester: me,
    recipient: them,
  }
  save([...rows, row])
  return row
}

/**
 * MIGO assigns a sample tourist to a local (`me`) who has nobody yet, so Local mode can be tried
 * alone: the local gets "You've been matched!" exactly as when a real tourist picks them.
 */
export function assignSample(sampleTourist: Person, me: Person): Row {
  return request(sampleTourist, me)
}

function update(id: string, change: (r: Row) => boolean): Row | null {
  const rows = load()
  const row = rows.find((r) => r.id === id)
  if (!row) return null
  if (change(row)) save(rows)
  return row
}

/**
 * The local answers "You've been matched!": true = Say hi (keep it), false = Not now (close it).
 * Only until they've said hi; anything already settled comes back unchanged. Also answers old pending requests.
 */
export function respond(me: string, id: string, accept: boolean): Row | null {
  const now = Date.now()
  return update(id, (r) => {
    if (r.recipientId !== me) throw new Error('Match not found.')
    const open = r.status === 'pending' || (r.status === 'accepted' && !r.recipientSeen)
    if (!open) return false
    if (accept) {
      Object.assign(r, { status: 'accepted', respondedAt: r.respondedAt ?? now, updatedAt: now, recipientSeen: true, requesterSeen: r.status === 'pending' ? false : r.requesterSeen })
    } else {
      Object.assign(r, { status: 'declined', respondedAt: now, updatedAt: now, recipientSeen: true, requesterSeen: false })
    }
    return true
  })
}

export function cancel(me: string, id: string): Row | null {
  return update(id, (r) => {
    if (r.requesterId !== me) throw new Error('Request not found.')
    if (r.status !== 'pending') return false
    Object.assign(r, { status: 'cancelled', updatedAt: Date.now(), recipientSeen: true })
    return true
  })
}

export function remove(me: string, id: string): Row | null {
  return update(id, (r) => {
    if (r.requesterId !== me && r.recipientId !== me) throw new Error('Connection not found.')
    if (r.status !== 'accepted') return false
    Object.assign(r, { status: 'removed', removedBy: me, updatedAt: Date.now(), requesterSeen: true, recipientSeen: true })
    return true
  })
}

export function markSeen(me: string, ids?: string[]) {
  const rows = load()
  let changed = false
  for (const r of rows) {
    if (ids && !ids.includes(r.id)) continue
    if (r.requesterId === me && !r.requesterSeen) {
      r.requesterSeen = true
      changed = true
    }
    // "You've been matched!" (and an old request) stays new until it's answered.
    if (r.recipientId === me && !r.recipientSeen && r.status !== 'pending' && r.status !== 'accepted') {
      r.recipientSeen = true
      changed = true
    }
  }
  if (changed) save(rows)
}

/** Deleting an account removes its connections (the SQL foreign keys cascade the same way). */
export function deleteAccountRows(accountId: string) {
  save(load().filter((r) => r.requesterId !== accountId && r.recipientId !== accountId))
}

/** The localStorage key, so other tabs can refresh when it changes. */
export const STORAGE_KEY = KEY
