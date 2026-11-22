// Device-only economy: the same rules as the server (007_economy.sql), kept in this browser's
// localStorage. Used when Supabase isn't configured (development, offline demos).
//
// NOT TAMPER-PROOF. Anyone can edit their own localStorage, so balances here prove nothing; the
// state says `source: 'device'` so screens can label it. What it does guarantee, like the server:
//   * every points change is one ledger row with a unique ref ('quest:<assignment id>',
//     'purchase:<item id>', 'legacy:<old ref>'), so a reward or purchase never applies twice;
//   * one daily refresh per day; the balance never goes below zero; buying never auto-equips;
//   * rewards and prices come from the catalogues, never from the caller.
// Days and weeks use this device's local time (the server uses the saved timezone instead).
//
// The first load for an account carries over the old device ledger, owned and equipped items from
// its profile record (record.rewards), so existing balances, wardrobes and starter claims survive.
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
import { evaluateProgress, issueAssignments, type ProgressFacts } from '../../features/quests/engine'
import { shopItem } from '../../features/rewards/shop'
import * as db from '../profileDb'
import { readJSON, writeJSON } from '../storage'
import type { HuntResult } from '../types'
import { SHOP_SLOTS_ALL } from './normalize'

/** What the device economy reads to measure progress (the store passes its latest copy). */
export type DeviceFacts = {
  profile: ProfileRecord | null
  account?: Account | null
  /** Completed hunts across every exploring context. */
  huntResults: HuntResult[]
}

type Page = Parameters<EconomyApi['recordVisit']>[0]

/** A quest given for one period, as stored on the device (progress is computed on every read). */
type StoredAssignment = {
  id: string
  defId: string
  category: QuestCategory
  periodKey: string
  status: 'active' | 'completed' | 'expired' | 'replaced'
  assignedAt: string
  expiresAt: string | null
  completedAt: string | null
  /** Reward from the catalogue when it was assigned. */
  reward: number
}

type Book = {
  v: 1
  /** Every points change, oldest first. */
  ledger: LedgerEntry[]
  owned: string[]
  equipped: Partial<Record<ShopSlot, string>>
  assignments: StoredAssignment[]
  /** Local day → refreshes used. */
  refreshes: Record<string, number>
  /** Page → ISO times it was opened (most recent last, a few kept). */
  visits: Partial<Record<Page, string[]>>
  timezone: string
  /** When record.rewards was carried over (once). */
  migratedAt: string
}

const KEY = 'migo:economy:v1'
const HISTORY_LIMIT = 50
const RECENT_LIMIT = 50

// ---- Storage ---------------------------------------------------------------------------------

function loadAll(): Record<string, Book> {
  const all = readJSON<Record<string, Book>>(KEY)
  return all && typeof all === 'object' ? all : {}
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

const localTimezone = () => {
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
    ledger.push({ id: `legacy-${e.id}`, amount: e.amount, kind: 'legacy', ref, label: e.label || (e.amount < 0 ? 'Shop purchase' : 'Challenge reward'), at: new Date(e.at || 0).toISOString() })
  }
  ledger.sort((a, b) => a.at.localeCompare(b.at))
  const owned = [...new Set(rewards?.owned ?? [])]
  const equipped: Book['equipped'] = {}
  for (const slot of SHOP_SLOTS_ALL) {
    const id = rewards?.equipped[slot]
    // Kept only if still owned and (when the item is known) worn in its own slot.
    if (id && owned.includes(id) && (shopItem(id)?.slot ?? slot) === slot) equipped[slot] = id
  }
  return { v: 1, ledger, owned, equipped, assignments: [], refreshes: {}, visits: {}, timezone: localTimezone(), migratedAt: new Date().toISOString() }
}

function readBook(accountId: string, facts: DeviceFacts): Book {
  const saved = loadAll()[accountId]
  if (saved && saved.v === 1 && Array.isArray(saved.ledger)) {
    return {
      ...saved,
      owned: Array.isArray(saved.owned) ? saved.owned : [],
      equipped: saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {},
      assignments: Array.isArray(saved.assignments) ? saved.assignments : [],
      refreshes: saved.refreshes && typeof saved.refreshes === 'object' ? saved.refreshes : {},
      visits: saved.visits && typeof saved.visits === 'object' ? saved.visits : {},
    }
  }
  // First time: carry over the record's rewards (the store's copy if it's this account's, else storage).
  const record = facts.profile?.accountId === accountId ? facts.profile : db.getRecord(accountId)
  const book = migrate(record)
  saveBook(accountId, book)
  return book
}

// ---- Local time periods ------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** Monday 00:00 local of d's week. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))

/** ISO week, e.g. "2026-W48". */
function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${pad(week)}`
}

type Period = { from: number; to: number }

function periodOf(category: QuestCategory, now: Date): Period {
  if (category === 'daily') return { from: startOfDay(now).getTime(), to: addDays(startOfDay(now), 1).getTime() }
  if (category === 'starter') return { from: 0, to: Infinity }
  const monday = startOfWeek(now)
  return { from: monday.getTime(), to: addDays(monday, 7).getTime() }
}

/** The period an assignment belongs to (from its own dates, so last week's quests stay last week's). */
function assignmentPeriod(a: StoredAssignment): Period {
  if (a.category === 'starter' || !a.expiresAt) return { from: 0, to: Infinity }
  const to = Date.parse(a.expiresAt)
  const days = a.category === 'daily' ? 1 : 7
  return { from: addDays(new Date(to), -days).getTime(), to }
}

// ---- Facts & progress --------------------------------------------------------------------------

const inPeriod = (ms: number, p: Period) => ms >= p.from && ms < p.to

/** Everything evaluateProgress() may count, restricted to one period. */
function factsFor(book: Book, facts: DeviceFacts, period: Period, accountId: string): ProgressFacts {
  const profile = facts.profile?.accountId === accountId ? facts.profile : null
  const hunts = facts.huntResults.filter((r) => inPeriod(r.completedAt, period))
  const cities = (profile?.universal?.citiesDiscovered ?? []).filter((c) => c.placeId && c.lat !== null && inPeriod(c.addedAt, period))
  const visits = Object.fromEntries(
    Object.entries(book.visits).map(([page, times]) => [page, (times ?? []).filter((t) => inPeriod(Date.parse(t), period)).length]),
  ) as Partial<Record<Page, number>>
  const completed = book.assignments.filter((a) => a.status === 'completed' && a.completedAt && inPeriod(Date.parse(a.completedAt), period))
  const purchases = book.ledger.filter((e) => e.amount < 0 && (e.kind === 'purchase' || e.ref.startsWith('legacy:item:')) && inPeriod(Date.parse(e.at), period))
  return {
    profile,
    account: facts.account ?? null,
    // Device hunts only exist with a team of two (the store requires a team to finish one).
    hunts: hunts.map((r) => ({ huntId: r.huntId, at: r.completedAt, withPartner: true })),
    // The gallery needs the server: no photos can be counted on this device.
    photos: [],
    newCities: cities.map((c) => ({ placeId: c.placeId as string, at: c.addedAt })),
    visits,
    questsCompleted: completed.map((a) => ({ category: a.category, at: Date.parse(a.completedAt as string) })),
    purchases: purchases.length,
    equipped: Object.values(book.equipped).filter(Boolean).length,
  }
}

function toAssignment(a: StoredAssignment, book: Book, facts: DeviceFacts, accountId: string, now: number): QuestAssignment {
  const def = questDef(a.defId)
  const live = a.status === 'active' && (!a.expiresAt || Date.parse(a.expiresAt) > now)
  const status = a.status === 'active' && !live ? 'expired' : a.status
  const { progress, target } = def ? evaluateProgress(def, factsFor(book, facts, assignmentPeriod(a), accountId)) : { progress: 0, target: 1 }
  const done = status === 'completed'
  return {
    id: a.id,
    defId: a.defId,
    category: a.category,
    periodKey: a.periodKey,
    status,
    progress: done ? target : Math.min(progress, target),
    target,
    claimable: status === 'active' && !!def && progress >= target,
    assignedAt: a.assignedAt,
    expiresAt: a.expiresAt,
    completedAt: a.completedAt,
    reward: a.reward,
  }
}

// ---- Assignments -------------------------------------------------------------------------------

const assignmentId = (periodKey: string, defId: string) => `dev:${periodKey}:${defId}`

function newAssignment(def: QuestDef, periodKey: string, now: Date, expiresAt: Date | null): StoredAssignment {
  return {
    id: assignmentId(periodKey, def.id),
    defId: def.id,
    category: def.category,
    periodKey,
    status: 'active',
    assignedAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    completedAt: null,
    reward: def.reward,
  }
}

/** A claim under the old challenge system (`legacy:challenge:<id>:<period>`) counts as completed. */
function legacyClaim(book: Book, defId: string, oldPeriod: string): LedgerEntry | undefined {
  return book.ledger.find((e) => e.ref === `legacy:challenge:${defId}:${oldPeriod}`)
}

/**
 * Makes sure this period's quests exist: every starter quest, one weekly, three daily slots and
 * three adventures. Old active ones past their period become expired. Returns true when it changed the book.
 */
function ensureAssignments(book: Book, facts: DeviceFacts, accountId: string, now: Date): boolean {
  let changed = false
  const nowMs = now.getTime()
  for (const a of book.assignments) {
    if (a.status === 'active' && a.expiresAt && Date.parse(a.expiresAt) <= nowMs) {
      a.status = 'expired'
      changed = true
    }
  }
  const has = (periodKey: string) => book.assignments.filter((a) => a.periodKey === periodKey)
  const today = dayKey(now)
  const week = weekKey(now)
  const tomorrow = addDays(startOfDay(now), 1)
  const nextMonday = addDays(startOfWeek(now), 7)

  // Starter quests: all of them, once (new ones added to the catalogue appear too).
  for (const def of questDefsIn('starter')) {
    if (book.assignments.some((a) => a.category === 'starter' && a.defId === def.id)) continue
    const a = newAssignment(def, 'starter', now, null)
    const old = legacyClaim(book, def.id, 'once')
    if (old) Object.assign(a, { status: 'completed', completedAt: old.at })
    book.assignments.push(a)
    changed = true
  }

  // What the engine needs to pick (personalised) quests that aren't already active.
  const avoid = new Set(book.assignments.filter((a) => a.status === 'active' || a.periodKey.includes(today) || a.periodKey.includes(week)).map((a) => a.defId))
  const pick = (category: Exclude<QuestCategory, 'starter'>, count: number, salt: string) =>
    count <= 0 ? [] : issueAssignments({ category, count, profile: facts.profile, exclude: [...avoid], seed: `${accountId}:${salt}` })

  const fill = (category: Exclude<QuestCategory, 'starter'>, prefix: string, periodSalt: string, slots: number, expires: Date) => {
    for (let slot = 1; slot <= slots; slot++) {
      const periodKey = category === 'weekly' ? `${prefix}:${periodSalt}` : `${prefix}:${periodSalt}:${slot}`
      if (has(periodKey).some((a) => a.status !== 'replaced')) continue
      const [def] = pick(category, 1, periodKey)
      if (!def) continue
      const a = newAssignment(def, periodKey, now, expires)
      // The first version's "Hunt of the day" claim for today still counts.
      if (category === 'daily') {
        const old = legacyClaim(book, def.id, today)
        if (old) Object.assign(a, { status: 'completed', completedAt: old.at })
      }
      book.assignments.push(a)
      avoid.add(def.id)
      changed = true
    }
  }
  fill('weekly', 'w', week, QUEST_SLOTS.weekly, nextMonday)
  fill('daily', 'd', today, QUEST_SLOTS.daily, tomorrow)
  fill('adventure', 'a', week, QUEST_SLOTS.adventure, nextMonday)

  // Keep the book small: drop expired/replaced quests older than two weeks (completed ones stay as history).
  const cutoff = nowMs - 14 * 86_400_000
  const before = book.assignments.length
  book.assignments = book.assignments.filter((a) => a.status === 'completed' || a.status === 'active' || Date.parse(a.assignedAt) > cutoff)
  if (book.assignments.length !== before) changed = true
  return changed
}

// ---- State -------------------------------------------------------------------------------------

function toState(book: Book, facts: DeviceFacts, accountId: string, now: Date): EconomyState {
  const nowMs = now.getTime()
  const all = book.assignments.map((a) => toAssignment(a, book, facts, accountId, nowMs))
  const balance = book.ledger.reduce((n, e) => n + e.amount, 0)
  return {
    balance,
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
    dailyRefreshAvailable: (book.refreshes[dayKey(now)] ?? 0) < DAILY_REFRESHES,
    nextDailyReset: addDays(startOfDay(now), 1).toISOString(),
    nextWeeklyReset: addDays(startOfWeek(now), 7).toISOString(),
    timezone: book.timezone,
    source: 'device',
  }
}

const newEntryId = () => `pts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** EconomyApi kept on this device for one account. `facts` returns the store's latest profile and hunts. */
export function deviceEconomy(accountId: string, facts: () => DeviceFacts): EconomyApi {
  // Every operation reads, changes and writes the book synchronously, so two tabs can't interleave.
  const transact = (change?: (book: Book, now: Date, f: DeviceFacts) => void): EconomyState => {
    const f = facts()
    const now = new Date()
    const book = readBook(accountId, f)
    const changedAssignments = ensureAssignments(book, f, accountId, now)
    if (change) change(book, now, f)
    if (change || changedAssignments) saveBook(accountId, book)
    return toState(book, f, accountId, now)
  }

  const findActive = (book: Book, id: string, now: Date) => {
    const a = book.assignments.find((x) => x.id === id)
    if (!a) throw new Error('Quest not found')
    if (a.status === 'active' && a.expiresAt && Date.parse(a.expiresAt) <= now.getTime()) throw new Error('That quest has expired')
    return a
  }

  return {
    load: async () => transact(),

    claim: async (id) =>
      transact((book, now, f) => {
        const a = findActive(book, id, now)
        const ref = `quest:${a.id}`
        // Already paid (repeat click, second tab): nothing changes.
        if (a.status === 'completed' || book.ledger.some((e) => e.ref === ref)) return
        if (a.status !== 'active') throw new Error('That quest is no longer active')
        const def = questDef(a.defId)
        if (!def) throw new Error('Quest not found')
        const { progress, target } = evaluateProgress(def, factsFor(book, f, assignmentPeriod(a), accountId))
        if (progress < target) throw new Error('Quest not finished yet')
        a.status = 'completed'
        a.completedAt = now.toISOString()
        book.ledger.push({ id: newEntryId(), amount: a.reward, kind: 'quest', ref, label: def.title, at: a.completedAt })
      }),

    refreshDaily: async (id) =>
      transact((book, now, f) => {
        const a = findActive(book, id, now)
        if (a.category !== 'daily') throw new Error('Only daily challenges can be refreshed')
        if (a.status !== 'active') throw new Error('That quest is no longer active')
        const today = dayKey(now)
        if ((book.refreshes[today] ?? 0) >= DAILY_REFRESHES) throw new Error('Daily refresh already used')
        const def = questDef(a.defId)
        const done = def ? evaluateProgress(def, factsFor(book, f, assignmentPeriod(a), accountId)) : null
        // Swapping a finished quest would throw its reward away.
        if (done && done.progress >= done.target) throw new Error('Claim this one first: it’s already finished')
        // Anything handed out today (or active now) is excluded, so the swap is really new.
        const exclude = book.assignments.filter((x) => x.status === 'active' || x.periodKey.includes(today)).map((x) => x.defId)
        const [next] = issueAssignments({ category: 'daily', count: 1, profile: f.profile, exclude, seed: `${accountId}:${a.periodKey}:refresh` })
        if (!next) throw new Error('No other daily challenge is available right now')
        a.status = 'replaced'
        book.refreshes = { [today]: (book.refreshes[today] ?? 0) + 1 }
        book.assignments.push(newAssignment(next, a.periodKey, now, a.expiresAt ? new Date(a.expiresAt) : addDays(startOfDay(now), 1)))
      }),

    purchase: async (itemId) =>
      transact((book, now) => {
        const item = shopItem(itemId)
        if (!item) throw new Error('Item not found')
        const ref = `purchase:${item.id}`
        // Already owned (or already paid for): buying again does nothing.
        if (book.owned.includes(item.id) || book.ledger.some((e) => e.ref === ref)) {
          if (!book.owned.includes(item.id)) book.owned.push(item.id)
          return
        }
        if (item.retired) throw new Error('That item is no longer sold')
        const balance = book.ledger.reduce((n, e) => n + e.amount, 0)
        if (balance < item.price) throw new Error('Not enough points')
        book.ledger.push({ id: newEntryId(), amount: -item.price, kind: 'purchase', ref, label: item.name, at: now.toISOString() })
        book.owned.push(item.id)
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
        if (item.slot !== slot) throw new Error('That item doesn’t go there')
        book.equipped[slot] = item.id
      }),

    recordVisit: async (page) => {
      transact((book, now) => {
        const times = book.visits[page] ?? []
        // One per day is all the quests need.
        if (times.some((t) => dayKey(new Date(t)) === dayKey(now))) return
        book.visits[page] = [...times, now.toISOString()].slice(-14)
      })
    },

    setTimezone: async (tz) => {
      transact((book) => {
        book.timezone = tz
      })
    },
  }
}
