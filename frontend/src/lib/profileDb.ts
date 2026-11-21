// Device-local stand-in for the accounts/profiles tables. Only src/lib/api.ts may import this file,
// so swapping it for Supabase (or any backend) only touches api.ts.
//
// Shape: { accounts: { [id]: Account }, profiles: { [accountId]: ProfileRecord } }.
// Records are keyed by account id, so one person has exactly one profile whatever mode they use.
import { normalizeRecord } from '../features/profile/model'
import type { Account, ProfileRecord } from '../features/profile/types'
import { readJSON, writeJSON } from './storage'

const DB_KEY = 'migo:db:v1'

type Db = {
  accounts: Record<string, Account>
  profiles: Record<string, unknown>
}

function load(): Db {
  const raw = readJSON<Partial<Db>>(DB_KEY)
  return {
    accounts: raw && typeof raw.accounts === 'object' && raw.accounts ? raw.accounts : {},
    profiles: raw && typeof raw.profiles === 'object' && raw.profiles ? raw.profiles : {},
  }
}

export function getAccount(id: string): Account | null {
  return load().accounts[id] ?? null
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
  writeJSON(DB_KEY, db)
}
