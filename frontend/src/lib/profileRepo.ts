// Where accounts and profile records are stored. api.ts picks one:
//   * Supabase (backend/supabase/migrations/004_migo_profiles.sql) when VITE_SUPABASE_URL and
//     VITE_SUPABASE_ANON_KEY are set;
//   * this device's localStorage (profileDb.ts) otherwise, so the app still works offline / in dev.
// Both store the same ProfileRecord shape, keyed by account id.
import { normalizeRecord } from '../features/profile/model'
import type { Account, ProfileRecord } from '../features/profile/types'
import * as backend from './backend'
import * as db from './profileDb'

export type ProfileRepo = {
  kind: 'supabase' | 'device'
  createAccount(input: { name: string; avatar: string }): Promise<Account>
  getAccount(id: string): Promise<Account | null>
  saveAccount(account: Account): Promise<void>
  getRecord(accountId: string): Promise<ProfileRecord>
  saveRecord(record: ProfileRecord): Promise<void>
  deleteAccount(accountId: string): Promise<void>
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const deviceRepo: ProfileRepo = {
  kind: 'device',
  async createAccount({ name, avatar }) {
    const account: Account = { id: newId('acct'), name, avatar, createdAt: Date.now() }
    db.putAccount(account)
    return account
  },
  async getAccount(id) {
    return db.getAccount(id)
  },
  async saveAccount(account) {
    db.putAccount(account)
  },
  async getRecord(accountId) {
    return db.getRecord(accountId)
  },
  async saveRecord(record) {
    db.putRecord(record)
  },
  async deleteAccount(accountId) {
    db.deleteAccountData(accountId)
  },
}

const supabaseRepo: ProfileRepo = {
  kind: 'supabase',
  createAccount: (input) => backend.createMigoAccount(input),
  async getAccount(id) {
    return (await backend.getMigoProfile(id))?.account ?? null
  },
  saveAccount: (account) => backend.updateMigoAccount(account),
  async getRecord(accountId) {
    return normalizeRecord((await backend.getMigoProfile(accountId))?.record, accountId)
  },
  saveRecord: (record) => backend.saveMigoRecord(record),
  deleteAccount: (accountId) => backend.deleteMigoAccount(accountId),
}

export const profileRepo = (): ProfileRepo => (backend.isBackendConfigured() ? supabaseRepo : deviceRepo)
