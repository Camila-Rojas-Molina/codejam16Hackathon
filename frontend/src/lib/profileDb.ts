// Device-local storage for accounts, profiles and message threads. Used when the Supabase backend
// isn't configured (see profileRepo.ts). Only the data layer (api.ts, profileRepo.ts) imports this.
//
// Shape: { accounts: { [id]: Account }, profiles: { [accountId]: ProfileRecord } }.
// Records are keyed by account id, so one person has exactly one profile whatever mode they use.
import { normalizeRecord } from '../features/profile/model'
import { resolveAvatar } from './avatars'
import type { Account, ProfileRecord } from '../features/profile/types'
import { readJSON, writeJSON } from './storage'

const DB_KEY = 'migo:db:v1'

type Db = {
  accounts: Record<string, Account>
  profiles: Record<string, unknown>
  /** accountId → personId → { person, messages }. */
  threads: Record<string, Record<string, unknown>>
}

function load(): Db {
  const raw = readJSON<Partial<Db>>(DB_KEY)
  return {
    accounts: raw && typeof raw.accounts === 'object' && raw.accounts ? raw.accounts : {},
    profiles: raw && typeof raw.profiles === 'object' && raw.profiles ? raw.profiles : {},
    threads: raw && typeof raw.threads === 'object' && raw.threads ? raw.threads : {},
  }
}

export function getAccount(id: string): Account | null {
  const account = load().accounts[id]
  // Accounts saved with an old emoji avatar get mapped to an image avatar.
  return account ? { ...account, avatar: resolveAvatar(account.avatar) } : null
}

export function putAccount(account: Account) {
  const db = load()
  db.accounts[account.id] = account
  writeJSON(DB_KEY, db)
}

export function getRecord(accountId: string): ProfileRecord {
  return normalizeRecord(load().profiles[accountId], accountId)
}

export function putRecord(record: ProfileRecord) {
  const db = load()
  db.profiles[record.accountId] = record
  writeJSON(DB_KEY, db)
}

export function deleteAccountData(accountId: string) {
  const db = load()
  delete db.accounts[accountId]
  delete db.profiles[accountId]
  delete db.threads[accountId]
  writeJSON(DB_KEY, db)
}

export function getThreads(accountId: string): Record<string, unknown> {
  return load().threads[accountId] ?? {}
}

export function putThread(accountId: string, personId: string, thread: unknown) {
  const db = load()
  db.threads[accountId] = { ...(db.threads[accountId] ?? {}), [personId]: thread }
  writeJSON(DB_KEY, db)
}
