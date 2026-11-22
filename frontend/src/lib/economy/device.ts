// Device-only economy: the same rules as the server (007_economy.sql), kept in this browser's
// localStorage. Used when Supabase isn't configured (development, offline demos). Which quests a
// person gets, the periods and how far along they are come from the shared quest engine
// (features/quests/engine.ts), the same rules the server runs in SQL.
//
// NOT TAMPER-PROOF. Anyone can edit their own localStorage, so balances here prove nothing; the
// state says `source: 'device'` so screens can label it. What it does guarantee, like the server:
//   * every points change is one ledger row with a unique ref ('quest:<assignment id>',
//     'purchase:<item id>', 'legacy:<old ref>'), so a reward or purchase never applies twice;
//   * one daily refresh per day; the balance never goes below zero; buying never auto-equips;
//   * rewards and prices come from the catalogues, never from the caller.
// Days and weeks use this device's own clock and timezone (the server uses the saved timezone).
//
// The first load for an account carries over the old device ledger, owned and equipped items from
// its profile record (record.rewards), so existing balances, wardrobes and claims survive.
import type { EconomyApi, EconomyState, LedgerEntry, QuestAssignment, ShopSlot } from '../../features/economy/types'
import { hasUniversalProfile } from '../../features/profile/flow'
import { activeTrip, isModeReady } from '../../features/profile/model'
import type { Account, ProfileRecord } from '../../features/profile/types'
import { questDef } from '../../features/quests/catalog'
import {
  assignmentProgress,
  dailyRefreshAvailable,
  issueAssignments,
  periodsAt,
  refreshDailyAssignment,
  type IssueInput,
  type QuestFacts,
  type QuestPerson,
  type VisitPage,
} from '../../features/quests/engine'
import { shopItem } from '../../features/rewards/shop'
import * as db from '../profileDb'
import { readJSON, writeJSON } from '../storage'
import type { HuntResult } from '../types'
import { SHOP_SLOTS_ALL } from './normalize'

/** What the device economy reads to measure progress (the store passes its latest copy). */
export type DeviceFacts = {
  profile: ProfileRecord | null
  account: Account | null
  /** Completed hunts across every exploring context. */
  huntResults: HuntResult[]
}

/** A quest as stored on the device. Progress/claimable are computed on every read. */
type StoredAssignment = Omit<QuestAssignment, 'progress' | 'claimable'>

type Book = {
  v: 1
  /** Every points change, oldest first. */
  ledger: LedgerEntry[]
  owned: string[]
  equipped: Partial<Record<ShopSlot, string>>
  assignments: StoredAssignment[]
  /** Page visits, at most one per page per local day (a few weeks kept). */
  visits: { page: VisitPage; at: number }[]
  timezone: string
  /** When record.rewards was carried over (once). */
  migratedAt: string
}

const KEY = 'migo:economy:v1'
const RECENT_LIMIT = 50
const HISTORY_LIMIT = 50
const DAY_MS = 86_400_000

// ---- Storage ---------------------------------------------------------------------------------

function loadAll(): Record<string, Book> {
  const all = readJSON<Record<string, Book>>(KEY)
  return all && typeof all === 'object' && !Array.isArray(all) ? all : {}
}

function saveBook(accountId: string, book: Book) {
  writeJSON(KEY, { ...loadAll(), [accountId]: book })
}

/** Removes an account's device economy (account deleted). */
export function forgetDeviceEconomy(accountId: string) {
  const all = loadAll()
  if (!(accountId in all)) return
  delete all[accountId]
  writeJSON(KEY, all)
}

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** The old device ledger/owned/equipped (profile record) as the first page of the new book. */
function migrate(record: ProfileRecord | null): Book {
  const rewards = record?.rewards
  const seen = new Set<string>()
  const ledger: LedgerEntry[] = []
  for (const e of rewards?.ledger ?? []) {
    const ref = `legacy:${e.refId}`
    if (seen.has(ref) || !Number.isFinite(e.amount)) continue
    seen.add(ref)
    ledger.push({
      id: `legacy-${e.id}`,
      amount: e.amount,
      kind: 'legacy',
      ref,
      label: e.label || (e.amount < 0 ? 'Shop purchase' : 'Challenge reward'),
      at: new Date(Number.isFinite(e.at) ? e.at : 0).toISOString(),
    })
  }
  ledger.sort((a, b) => a.at.localeCompare(b.at))
  const owned = [...new Set(rewards?.owned ?? [])]
  const equipped: Book['equipped'] = {}
  for (const slot of SHOP_SLOTS_ALL) {
    const id = rewards?.equipped[slot]
    // Kept if still owned and (when the item is known) worn in its own slot.
    if (id && owned.includes(id) && (shopItem(id)?.slot ?? slot) === slot) equipped[slot] = id
  }
  return { v: 1, ledger, owned, equipped, assignments: [], visits: [], timezone: localTimezone(), migratedAt: new Date().toISOString() }
}

function readBook(accountId: string, facts: DeviceFacts): Book {
  const saved = loadAll()[accountId]
  if (saved && saved.v === 1 && Array.isArray(saved.ledger)) {
    return {
      ...saved,
      owned: Array.isArray(saved.owned) ? saved.owned : [],
      equipped: saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {},
      assignments: Array.isArray(saved.assignments) ? saved.assignments : [],
      visits: Array.isArray(saved.visits) ? saved.visits : [],
    }
  }
  // First time: carry over the record's rewards (the store's copy if it's this account's, else storage).
  const record = facts.profile?.accountId === accountId ? facts.profile : db.getRecord(accountId)
  const book = migrate(record)
  saveBook(accountId, book)
  return book
}

// ---- Facts for the engine ----------------------------------------------------------------------

const balanceOf = (book: Book) => book.ledger.reduce((n, e) => n + e.amount, 0)

function personOf(profile: ProfileRecord | null, huntResults: HuntResult[]): QuestPerson {
  const u = profile?.universal
  const trip = profile?.activeMode === 'tourist' ? activeTrip(profile) : null
  return {
    mode: profile?.activeMode ?? null,
    interests: [...new Set([...(u?.interests ?? []), ...(trip?.interests ?? [])])],
    accessibility: [...new Set([...(u?.accessibility.needs ?? []), ...(trip?.accessibility.needs ?? [])])],
    pace: u?.exploration.pace ?? null,
    // Device hunts only exist with a team of two (the store needs a team to finish one).
    hasTeamedUp: huntResults.length > 0,
  }
}

/** All-time facts; the engine limits them to each quest's period. */
function factsOf(book: Book, f: DeviceFacts, accountId: string): QuestFacts {
  const profile = f.profile?.accountId === accountId ? f.profile : null
  const account = f.account?.id === accountId ? f.account : null
  const u = profile?.universal
  const purchases = book.ledger
    .filter((e) => e.amount < 0 && (e.kind === 'purchase' || e.ref.startsWith('legacy:item:')))
    .map((e) => ({ itemId: e.ref.replace(/^(legacy:item:|purchase:)/, ''), at: Date.parse(e.at) || 0 }))
  return {
    huntResults: f.huntResults.map((r) => ({ huntId: r.huntId, completedAt: r.completedAt, withPartner: true })),
    // Gallery photos need the server: there is nothing to count on this device.
    photos: [],
    cities: (u?.citiesDiscovered ?? []).map((c) => ({ placeId: c.placeId && c.lat !== null ? c.placeId : null, addedAt: c.addedAt })),
    profile: {
      questionnaireComplete: hasUniversalProfile(profile),
      homeCityPinned: !!(u?.homeCityPlace || profile?.local?.homeCityPlace),
      avatarChosen: !!account?.avatar,
      bothModesReady: isModeReady(profile, 'tourist') && isModeReady(profile, 'local'),
    },
    visits: book.visits,
    completedQuests: book.assignments
      .filter((a) => a.status === 'completed' && a.completedAt)
      .map((a) => ({ defId: a.defId, category: a.category, completedAt: Date.parse(a.completedAt as string) || 0 })),
    purchases,
    equipped: Object.values(book.equipped).filter((id): id is string => !!id),
  }
}

function issueInput(book: Book, f: DeviceFacts, accountId: string, now: number): IssueInput {
  return {
    now,
    timezone: book.timezone,
    seed: accountId,
    person: personOf(f.profile?.accountId === accountId ? f.profile : null, f.huntResults),
    existing: book.assignments,
  }
}

/** A claim under the first challenge system ('challenge:<id>:<period>') counts as completed. */
function legacyClaim(book: Book, a: StoredAssignment): LedgerEntry | undefined {
  const period = a.category === 'starter' ? 'once' : a.periodKey.startsWith('d:') ? a.periodKey.split(':')[1] : null
  return period ? book.ledger.find((e) => e.ref === `legacy:challenge:${a.defId}:${period}`) : undefined
}

/** Fills this period's empty slots and expires last period's. Returns true when the book changed. */
function ensureAssignments(book: Book, f: DeviceFacts, accountId: string, now: number): boolean {
  const { issue, expire } = issueAssignments(issueInput(book, f, accountId, now))
  if (issue.length === 0 && expire.length === 0) return false
  const expired = new Set(expire)
  for (const a of book.assignments) if (expired.has(a.id)) a.status = 'expired'
  for (const fresh of issue) {
    if (book.assignments.some((a) => a.id === fresh.id)) continue
    const stored = stripProgress(fresh)
    const old = legacyClaim(book, stored)
    if (old) Object.assign(stored, { status: 'completed', completedAt: old.at })
    book.assignments.push(stored)
  }
  // Keep the book small: expired/replaced quests and old visits go after five weeks (completed stay).
  const cutoff = now - 35 * DAY_MS
  book.assignments = book.assignments.filter((a) => a.status === 'completed' || a.status === 'active' || Date.parse(a.assignedAt) > cutoff)
  book.visits = book.visits.filter((v) => v.at > cutoff)
  return true
}

function stripProgress(a: QuestAssignment): StoredAssignment {
  const { progress: _progress, claimable: _claimable, ...stored } = a
  return stored
}

function withProgress(a: StoredAssignment, facts: QuestFacts, timezone: string, now: number): QuestAssignment {
  const { progress, target } = assignmentProgress({ ...a, progress: 0, target: 1 }, facts, timezone)
  const live = a.status === 'active' && (!a.expiresAt || Date.parse(a.expiresAt) > now)
  const status = a.status === 'active' && !live ? 'expired' : a.status
  const known = !!questDef(a.defId)
  return { ...a, status, progress: status === 'completed' ? target : progress, target, claimable: live && known && progress >= target }
}

function toState(book: Book, f: DeviceFacts, accountId: string, now: number): EconomyState {
  const facts = factsOf(book, f, accountId)
  const all = book.assignments.map((a) => withProgress(a, facts, book.timezone, now))
  const periods = periodsAt(now, book.timezone)
  return {
    balance: balanceOf(book),
    earnedTotal: book.ledger.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0),
    spentTotal: book.ledger.filter((e) => e.amount < 0).reduce((n, e) => n - e.amount, 0),
    recent: [...book.ledger].reverse().slice(0, RECENT_LIMIT),
    owned: [...book.owned],
    equipped: { ...book.equipped },
    quests: all.filter((a) => a.status === 'active'),
    history: all
      .filter((a) => a.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, HISTORY_LIMIT),
    dailyRefreshAvailable: dailyRefreshAvailable(book.assignments, now, book.timezone),
    nextDailyReset: new Date(periods.day.end).toISOString(),
    nextWeeklyReset: new Date(periods.week.end).toISOString(),
    timezone: book.timezone,
    source: 'device',
  }
}

const newEntryId = () => `pts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const REFRESH_ERRORS: Record<string, string> = {
  'not-found': 'Quest not found',
  'not-today': 'That challenge is from another day',
  'not-active': 'That quest is no longer active',
  'already-done': 'That challenge is finished: claim it instead',
  'no-refresh-left': 'Daily refresh already used',
  'nothing-else': 'No other daily challenge is available right now',
}

// ---- The API -----------------------------------------------------------------------------------

/** EconomyApi kept on this device for one account. `facts` returns the store's latest profile and hunts. */
export function deviceEconomy(accountId: string, facts: () => DeviceFacts): EconomyApi {
  // Each call reads, changes and writes the book synchronously, so two tabs can't interleave.
  const transact = (change?: (book: Book, now: number, f: DeviceFacts) => void): EconomyState => {
    const f = facts()
    const now = Date.now()
    const book = readBook(accountId, f)
    // Days and weeks follow this device's timezone.
    const tz = localTimezone()
    const tzChanged = book.timezone !== tz
    book.timezone = tz
    const issued = ensureAssignments(book, f, accountId, now)
    if (change) change(book, now, f)
    if (change || issued || tzChanged) saveBook(accountId, book)
    return toState(book, f, accountId, now)
  }

  return {
    load: async () => transact(),

    claim: async (id) =>
      transact((book, now, f) => {
        const a = book.assignments.find((x) => x.id === id)
        if (!a) throw new Error('Quest not found')
        const ref = `quest:${a.id}`
        // Already paid (repeat click, second tab): nothing changes.
        if (a.status === 'completed' || book.ledger.some((e) => e.ref === ref)) return
        const live = withProgress(a, factsOf(book, f, accountId), book.timezone, now)
        if (live.status === 'expired') throw new Error('That quest has expired')
        if (a.status !== 'active') throw new Error('That quest is no longer active')
        const def = questDef(a.defId)
        if (!def) throw new Error('Quest not found')
        if (!live.claimable) throw new Error('Quest not finished yet')
        a.status = 'completed'
        a.completedAt = new Date(now).toISOString()
        // The reward stored when it was handed out (from the catalogue), never a caller's number.
        book.ledger.push({ id: newEntryId(), amount: a.reward, kind: 'quest', ref, label: def.title, at: a.completedAt })
      }),

    refreshDaily: async (id) =>
      transact((book, now, f) => {
        const old = book.assignments.find((x) => x.id === id)
        const claimable = old ? withProgress(old, factsOf(book, f, accountId), book.timezone, now).claimable : false
        const result = refreshDailyAssignment(issueInput(book, f, accountId, now), id, { claimable })
        if (!result.ok) throw new Error(REFRESH_ERRORS[result.reason] ?? 'Couldn’t refresh that challenge')
        const replaced = book.assignments.find((x) => x.id === result.replace)
        if (replaced) replaced.status = 'replaced'
        if (!book.assignments.some((x) => x.id === result.issue.id)) book.assignments.push(stripProgress(result.issue))
      }),

    purchase: async (itemId) =>
      transact((book, now) => {
        const item = shopItem(itemId)
        if (!item) throw new Error('Item not found')
        const ref = `purchase:${item.id}`
        // Already owned (or already paid for): buying again changes nothing.
        if (book.owned.includes(item.id)) return
        if (book.ledger.some((e) => e.ref === ref)) {
          book.owned.push(item.id)
          return
        }
        if (item.retired) throw new Error('That item is no longer sold')
        if (balanceOf(book) < item.price) throw new Error('Not enough points')
        book.ledger.push({ id: newEntryId(), amount: -item.price, kind: 'purchase', ref, label: item.name, at: new Date(now).toISOString() })
        book.owned.push(item.id)
        // Not equipped: wearing it is a separate choice.
      }),

    equip: async (slot, itemId) =>
      transact((book) => {
        if (!SHOP_SLOTS_ALL.includes(slot)) throw new Error('Unknown slot')
        if (itemId === null) {
          delete book.equipped[slot]
          return
        }
        const item = shopItem(itemId)
        if (!item || !book.owned.includes(item.id)) throw new Error('You don’t own that item')
        if (item.slot !== slot) throw new Error('That item doesn’t go in that slot')
        book.equipped[slot] = item.id
      }),

    recordVisit: async (page) => {
      transact((book, now) => {
        const { day } = periodsAt(now, book.timezone)
        // One a day per page is all the quests need.
        if (book.visits.some((v) => v.page === page && v.at >= day.start && v.at < day.end)) return
        book.visits.push({ page, at: now })
      })
    },

    setTimezone: async () => {
      // The device economy always follows this device's own timezone (see transact).
    },
  }
}
