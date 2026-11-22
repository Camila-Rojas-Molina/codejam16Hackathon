// Device-only economy: the same rules as the server (007_economy.sql), kept in this browser's
// localStorage. Used when Supabase isn't configured (development, offline demos). Which quests a
// person gets and how far along they are comes from the shared quest engine
// (features/quests/engine.ts), the same rules the server runs in SQL.
//
// NOT TAMPER-PROOF. Anyone can edit their own localStorage, so balances here prove nothing; the
// state says `source: 'device'` so screens can label it. What it does guarantee, like the server:
//   * every points change is one ledger row with a unique ref ('quest:<assignment id>',
//     'purchase:<item id>', 'legacy:<old ref>'), so a reward or purchase never applies twice;
//   * one daily refresh per day; the balance never goes below zero; buying never auto-equips;
//   * rewards and prices come from the catalogues, never from the caller.
// Days and weeks use this device's local timezone (the server uses the saved one instead).
//
// The first load for an account carries over the old device ledger, owned and equipped items from
// its profile record (record.rewards), so existing balances, wardrobes and claims survive.
import {
  DAILY_REFRESHES,
  QUEST_SLOTS,
  type EconomyApi,
  type EconomyState,
  type LedgerEntry,
  type QuestAssignment,
  type QuestCategory,
  type QuestDef,
  type ShopSlot,
} from '../../features/economy/types'
import type { Account, ProfileRecord } from '../../features/profile/types'
import { questDef, questDefsIn } from '../../features/quests/catalog'
import { evaluateProgress, issueAssignments, type ProgressFacts, type VisitPage } from '../../features/quests/engine'
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
  /** Local day ('2026-11-23') → daily refreshes used. */
  refreshes: Record<string, number>
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
  return { v: 1, ledger, owned, equipped, assignments: [], visits: [], refreshes: {}, timezone: localTimezone(), migratedAt: new Date().toISOString() }
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
      refreshes: saved.refreshes && typeof saved.refreshes === 'object' ? saved.refreshes : {},
    }
  }
  // First time: carry over the record's rewards (the store's copy if it's this account's, else storage).
  const record = facts.profile?.accountId === accountId ? facts.profile : db.getRecord(accountId)
  const book = migrate(record)
  saveBook(accountId, book)
  return book
}

// ---- Local time periods ------------------------------------------------------------------------
// The device's own clock and timezone (Date's local-time methods). The server uses the saved one.

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** Monday 00:00 of d's week. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))

/** ISO week, e.g. "2026-W48". */
function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY_MS + 1) / 7)
  return `${t.getUTCFullYear()}-W${pad(week)}`
}

type Window = { from: number; to: number }
const ALL_TIME: Window = { from: -Infinity, to: Infinity }
const inWindow = (ms: number, w: Window) => ms >= w.from && ms < w.to

type Periods = { today: string; week: string; day: Window; weekWindow: Window }

function periodsAt(now: Date): Periods {
  const day = startOfDay(now)
  const monday = startOfWeek(now)
  return {
    today: dayKey(now),
    week: isoWeek(now),
    day: { from: day.getTime(), to: addDays(day, 1).getTime() },
    weekWindow: { from: monday.getTime(), to: addDays(monday, 7).getTime() },
  }
}

/** The window an assignment counts in: its own period (from its expiry), all time for starters. */
function windowOf(a: StoredAssignment): Window {
  if (a.category === 'starter' || !a.expiresAt) return ALL_TIME
  const to = new Date(a.expiresAt)
  return { from: addDays(to, a.category === 'daily' ? -1 : -7).getTime(), to: to.getTime() }
}

// ---- Facts for the engine ----------------------------------------------------------------------

const balanceOf = (book: Book) => book.ledger.reduce((n, e) => n + e.amount, 0)
const isPurchase = (e: LedgerEntry) => e.amount < 0 && (e.kind === 'purchase' || e.ref.startsWith('legacy:item:'))

/** Everything evaluateProgress() counts, limited to one window. */
function factsIn(book: Book, f: DeviceFacts, accountId: string, w: Window): ProgressFacts {
  const profile = f.profile?.accountId === accountId ? f.profile : null
  const visits: ProgressFacts['visits'] = {}
  for (const v of book.visits) if (inWindow(v.at, w)) visits[v.page] = (visits[v.page] ?? 0) + 1
  return {
    profile,
    account: f.account?.id === accountId ? f.account : null,
    // Device hunts only exist with a team of two (the store needs a team to finish one).
    hunts: f.huntResults.filter((r) => inWindow(r.completedAt, w)).map((r) => ({ huntId: r.huntId, at: r.completedAt, withPartner: true })),
    // Gallery photos need the server: there is nothing to count on this device.
    photos: [],
    newCities: (profile?.universal?.citiesDiscovered ?? [])
      .filter((c) => c.placeId && c.lat !== null && inWindow(c.addedAt, w))
      .map((c) => ({ placeId: c.placeId as string, at: c.addedAt })),
    visits,
    questsCompleted: book.assignments
      .filter((a) => a.status === 'completed' && a.completedAt && inWindow(Date.parse(a.completedAt), w))
      .map((a) => ({ category: a.category, at: Date.parse(a.completedAt as string) })),
    purchases: book.ledger.filter((e) => isPurchase(e) && inWindow(Date.parse(e.at) || 0, w)).length,
    equipped: Object.values(book.equipped).filter(Boolean).length,
  }
}

function withProgress(a: StoredAssignment, book: Book, f: DeviceFacts, accountId: string, nowMs: number): QuestAssignment {
  const def = questDef(a.defId)
  const { progress, target } = def ? evaluateProgress(def, factsIn(book, f, accountId, windowOf(a))) : { progress: 0, target: 1 }
  const live = a.status === 'active' && (!a.expiresAt || Date.parse(a.expiresAt) > nowMs)
  const status = a.status === 'active' && !live ? 'expired' : a.status
  return { ...a, status, progress: status === 'completed' ? target : progress, target, claimable: live && !!def && progress >= target }
}

// ---- Assignments -------------------------------------------------------------------------------

type PeriodCategory = Exclude<QuestCategory, 'starter'>

/** How far back a quest counts as recently offered (avoided while anything else fits). */
const RECENT_DAYS: Record<PeriodCategory, number> = { daily: 3, weekly: 28, adventure: 14 }

function newAssignment(def: QuestDef, periodKey: string, now: Date, expiresAt: Date | null): StoredAssignment {
  return {
    id: `${periodKey}:${def.id}`,
    defId: def.id,
    category: def.category,
    periodKey,
    status: 'active',
    target: 1,
    assignedAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    completedAt: null,
    // The catalogue's reward when it was handed out: what a claim pays.
    reward: def.reward,
  }
}

/** A claim under the first challenge system ('challenge:<id>:<period>') counts as completed. */
function legacyClaim(book: Book, defId: string, period: string): LedgerEntry | undefined {
  return book.ledger.find((e) => e.ref === `legacy:challenge:${defId}:${period}`)
}

/** Def ids picking must skip: everything active, plus everything already handed out in `periodPrefix`. */
function excludedIds(book: Book, periodPrefix: string, nowMs: number): string[] {
  return [
    ...new Set(
      book.assignments
        .filter((a) => (a.status === 'active' && (!a.expiresAt || Date.parse(a.expiresAt) > nowMs)) || a.periodKey.startsWith(periodPrefix))
        .map((a) => a.defId),
    ),
  ]
}

function recentIds(book: Book, category: PeriodCategory, nowMs: number): string[] {
  const since = nowMs - RECENT_DAYS[category] * DAY_MS
  return book.assignments.filter((a) => a.category === category && Date.parse(a.assignedAt) >= since).map((a) => a.defId)
}

function pickFor(book: Book, f: DeviceFacts, accountId: string, category: PeriodCategory, periodKey: string, periodPrefix: string, nowMs: number, salt = '') {
  return issueAssignments({
    category,
    count: 1,
    profile: f.profile?.accountId === accountId ? f.profile : null,
    exclude: excludedIds(book, periodPrefix, nowMs),
    recent: recentIds(book, category, nowMs),
    seed: `${accountId}:${periodKey}${salt}`,
    person: { hasTeamedUp: f.huntResults.length > 0 },
  })[0]
}

/**
 * This period's quests: every starter quest (once), one weekly, three daily slots and three
 * adventures. Active ones past their period become expired. Returns true when the book changed.
 */
function ensureAssignments(book: Book, f: DeviceFacts, accountId: string, now: Date): boolean {
  const nowMs = now.getTime()
  const p = periodsAt(now)
  let changed = false

  for (const a of book.assignments) {
    if (a.status === 'active' && a.expiresAt && Date.parse(a.expiresAt) <= nowMs) {
      a.status = 'expired'
      changed = true
    }
  }

  // Starter quests: one each, never expire (quests added to the catalogue later appear too).
  for (const def of questDefsIn('starter')) {
    if (book.assignments.some((a) => a.category === 'starter' && a.defId === def.id)) continue
    const a = newAssignment(def, 'starter', now, null)
    const old = legacyClaim(book, def.id, 'once')
    if (old) Object.assign(a, { status: 'completed', completedAt: old.at })
    book.assignments.push(a)
    changed = true
  }

  const fill = (category: PeriodCategory, periodPrefix: string, keys: string[], expires: Date) => {
    for (const periodKey of keys) {
      // A slot is filled by its live quest; a replaced one has its successor in the same slot.
      if (book.assignments.some((a) => a.periodKey === periodKey && a.status !== 'replaced')) continue
      const def = pickFor(book, f, accountId, category, periodKey, periodPrefix, nowMs)
      if (!def) continue
      const a = newAssignment(def, periodKey, now, expires)
      // The first version's "Hunt of the day" claimed today still counts as done.
      const old = category === 'daily' ? legacyClaim(book, def.id, p.today) : undefined
      if (old) Object.assign(a, { status: 'completed', completedAt: old.at })
      book.assignments.push(a)
      changed = true
    }
  }
  const slots = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`)
  const weekEnd = new Date(p.weekWindow.to)
  fill('weekly', `w:${p.week}`, [`w:${p.week}`], weekEnd)
  fill('daily', `d:${p.today}:`, slots(`d:${p.today}:`, QUEST_SLOTS.daily), new Date(p.day.to))
  fill('adventure', `a:${p.week}:`, slots(`a:${p.week}:`, QUEST_SLOTS.adventure), weekEnd)

  // Keep the book small: expired/replaced quests and old visits go after five weeks (completed stay).
  const cutoff = nowMs - 35 * DAY_MS
  const before = book.assignments.length + book.visits.length + Object.keys(book.refreshes).length
  book.assignments = book.assignments.filter((a) => a.status === 'completed' || a.status === 'active' || Date.parse(a.assignedAt) > cutoff)
  book.visits = book.visits.filter((v) => v.at > cutoff)
  book.refreshes = p.today in book.refreshes ? { [p.today]: book.refreshes[p.today] } : {}
  if (book.assignments.length + book.visits.length + Object.keys(book.refreshes).length !== before) changed = true
  return changed
}

// ---- State -------------------------------------------------------------------------------------

function toState(book: Book, f: DeviceFacts, accountId: string, now: Date): EconomyState {
  const nowMs = now.getTime()
  const p = periodsAt(now)
  const all = book.assignments.map((a) => withProgress(a, book, f, accountId, nowMs))
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
    dailyRefreshAvailable: (book.refreshes[p.today] ?? 0) < DAILY_REFRESHES,
    nextDailyReset: new Date(p.day.to).toISOString(),
    nextWeeklyReset: new Date(p.weekWindow.to).toISOString(),
    timezone: book.timezone,
    source: 'device',
  }
}

const newEntryId = () => `pts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// ---- The API -----------------------------------------------------------------------------------

/** EconomyApi kept on this device for one account. `facts` returns the store's latest profile and hunts. */
export function deviceEconomy(accountId: string, facts: () => DeviceFacts): EconomyApi {
  // Each call reads, changes and writes the book synchronously, so two tabs can't interleave.
  const transact = (change?: (book: Book, now: Date, f: DeviceFacts) => void): EconomyState => {
    const f = facts()
    const now = new Date()
    const book = readBook(accountId, f)
    // Days and weeks follow this device's clock and timezone.
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
        if (a.status === 'expired') throw new Error('That quest has expired')
        if (a.status !== 'active') throw new Error('That quest is no longer active')
        const def = questDef(a.defId)
        if (!def) throw new Error('Quest not found')
        if (!withProgress(a, book, f, accountId, now.getTime()).claimable) throw new Error('Quest not finished yet')
        a.status = 'completed'
        a.completedAt = now.toISOString()
        // The reward stored when it was handed out (from the catalogue), never a caller's number.
        book.ledger.push({ id: newEntryId(), amount: a.reward, kind: 'quest', ref, label: def.title, at: a.completedAt })
      }),

    refreshDaily: async (id) =>
      transact((book, now, f) => {
        const a = book.assignments.find((x) => x.id === id)
        const p = periodsAt(now)
        if (!a || a.category !== 'daily') throw new Error('Quest not found')
        if (!a.periodKey.startsWith(`d:${p.today}:`)) throw new Error('That challenge is from another day')
        if (a.status !== 'active') throw new Error('That quest is no longer active')
        if ((book.refreshes[p.today] ?? 0) >= DAILY_REFRESHES) throw new Error('Daily refresh already used')
        // Swapping a finished challenge would throw its reward away.
        if (withProgress(a, book, f, accountId, now.getTime()).claimable) throw new Error('That challenge is finished: claim it instead')
        // Everything handed out today is excluded (the one being replaced too), so the swap is new.
        const next = pickFor(book, f, accountId, 'daily', a.periodKey, `d:${p.today}:`, now.getTime(), ':refresh')
        if (!next) throw new Error('No other daily challenge is available right now')
        a.status = 'replaced'
        book.refreshes[p.today] = (book.refreshes[p.today] ?? 0) + 1
        book.assignments.push(newAssignment(next, a.periodKey, now, new Date(p.day.to)))
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
        book.ledger.push({ id: newEntryId(), amount: -item.price, kind: 'purchase', ref, label: item.name, at: now.toISOString() })
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
        const { day } = periodsAt(now)
        // One a day per page is all the quests need.
        if (book.visits.some((v) => v.page === page && inWindow(v.at, day))) return
        book.visits.push({ page, at: now.getTime() })
      })
    },

    setTimezone: async () => {
      // The device economy always follows this device's own timezone (see transact).
    },
  }
}
