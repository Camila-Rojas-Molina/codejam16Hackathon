// Email + password login through Supabase Auth (GoTrue REST). Plain fetch, no supabase-js.
// The session lives in localStorage so it survives reloads; backend.ts sends its access token
// so the database knows which login is calling (backend/supabase/migrations/005_auth.sql).
import { config } from './config'
import { readJSON, removeKey, writeJSON } from './storage'

export type Session = {
  accessToken: string
  refreshToken: string
  /** When the access token expires, in ms since epoch. */
  expiresAt: number
  user: { id: string; email: string }
}

/** Auth failure with a message that can be shown to the user as is. */
export class AuthError extends Error {
  /** True when the server rejected the credentials/token (not a network or server hiccup). */
  readonly rejected: boolean
  constructor(message: string, rejected = true) {
    super(message)
    this.name = 'AuthError'
    this.rejected = rejected
  }
}

const STORAGE_KEY = 'migo:auth:v1'
/** Refresh when the token has less than this left. */
const REFRESH_MARGIN_MS = 60_000

/** True when Supabase is configured: then a login is required. (Same test as isBackendConfigured.) */
export function authEnabled(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey)
}

// ---- Session storage & listeners ---------------------------------------------------

type Listener = (s: Session | null) => void
const listeners = new Set<Listener>()

const isSession = (v: unknown): v is Session => {
  const s = v as Session | null
  return Boolean(
    s &&
      typeof s.accessToken === 'string' &&
      typeof s.refreshToken === 'string' &&
      typeof s.expiresAt === 'number' &&
      s.user &&
      typeof s.user.id === 'string',
  )
}

let current: Session | null = (() => {
  if (typeof window === 'undefined') return null
  const saved = readJSON<unknown>(STORAGE_KEY)
  return isSession(saved) ? saved : null
})()

function emit() {
  for (const l of [...listeners]) {
    try {
      l(current)
    } catch {
      // A broken listener must not stop the others.
    }
  }
}

function setSession(next: Session | null) {
  const changed = (current?.accessToken ?? null) !== (next?.accessToken ?? null)
  current = next
  if (next) writeJSON(STORAGE_KEY, next)
  else removeKey(STORAGE_KEY)
  if (changed) emit()
}

// Another tab logged in, refreshed or logged out.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return
    const saved = readJSON<unknown>(STORAGE_KEY)
    const next = isSession(saved) ? saved : null
    const changedUser = (current?.user.id ?? null) !== (next?.user.id ?? null)
    current = next
    // Token refreshes in another tab only update our copy; a login change is announced.
    if (changedUser) emit()
  })
}

export function getSession(): Session | null {
  return current
}

/** Called with the new session (or null) whenever this device logs in or out. Returns unsubscribe. */
export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// ---- HTTP ------------------------------------------------------------------------------

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  user?: { id?: string; email?: string }
  id?: string
  email?: string
}

type ErrorBody = { error_code?: string; code?: string | number; error?: string; msg?: string; error_description?: string; message?: string }

function friendlyError(status: number, body: ErrorBody | null): AuthError {
  const code = String(body?.error_code ?? (typeof body?.code === 'string' ? body.code : body?.error) ?? '')
  const text = String(body?.msg ?? body?.error_description ?? body?.message ?? '')
  const lower = `${code} ${body?.error ?? ''} ${text}`.toLowerCase()
  if (code === 'invalid_credentials' || lower.includes('invalid login credentials') || (body?.error === 'invalid_grant' && !lower.includes('refresh')))
    return new AuthError('Wrong email or password.')
  if (code === 'user_already_exists' || code === 'email_exists' || lower.includes('already registered'))
    return new AuthError('That email already has an account. Log in instead.')
  if (code === 'weak_password' || lower.includes('password should be'))
    return new AuthError('Password is too weak (use at least 6 characters).')
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed'))
    return new AuthError('Confirm your email first (check your inbox), then log in.')
  if (/^over_.*rate_limit$/.test(code) || status === 429) return new AuthError('Too many tries. Wait a minute and try again.', false)
  if (code === 'validation_failed' && lower.includes('email')) return new AuthError('Enter a valid email address.')
  if (status >= 500) return new AuthError('The server had a problem. Try again in a moment.', false)
  return new AuthError(text || `Login failed (${status}).`, status === 400 || status === 401 || status === 403)
}

async function authFetch(path: string, init: { body?: unknown; token?: string } = {}): Promise<TokenResponse | null> {
  if (!authEnabled()) throw new AuthError('Login is not set up: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', false)
  let res: Response
  try {
    res = await fetch(`${config.supabaseUrl}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new AuthError("Can't reach the server. Check your connection.", false)
  }
  const text = await res.text().catch(() => '')
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) throw friendlyError(res.status, body as ErrorBody | null)
  return body as TokenResponse | null
}

function toSession(r: TokenResponse | null, fallbackEmail = ''): Session | null {
  if (!r?.access_token || !r.refresh_token) return null
  const expiresAt = r.expires_at ? r.expires_at * 1000 : Date.now() + (r.expires_in ?? 3600) * 1000
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt,
    user: { id: r.user?.id ?? '', email: (r.user?.email ?? fallbackEmail).toLowerCase() },
  }
}

const cleanEmail = (email: string) => email.trim().toLowerCase()

function checkInput(email: string, password: string) {
  if (!email) throw new AuthError('Enter your email.')
  if (!password) throw new AuthError('Enter your password.')
}

// ---- Public API ------------------------------------------------------------------------

/** Creates a login. With email confirmation on, no session comes back: the user clicks the link, then logs in. */
export async function signUp(email: string, password: string): Promise<{ session: Session | null; needsConfirmation: boolean }> {
  const e = cleanEmail(email)
  checkInput(e, password)
  const r = await authFetch('signup', { body: { email: e, password } })
  const session = toSession(r, e)
  if (session) setSession(session)
  return { session, needsConfirmation: !session }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const e = cleanEmail(email)
  checkInput(e, password)
  const session = toSession(await authFetch('token?grant_type=password', { body: { email: e, password } }), e)
  if (!session) throw new AuthError('Login failed. Try again.', false)
  setSession(session)
  return session
}

/** Best-effort logout on the server; always forgets the session on this device. */
export async function signOut(): Promise<void> {
  const token = current?.accessToken
  setSession(null)
  if (!token || !authEnabled()) return
  try {
    await authFetch('logout', { token })
  } catch {
    // Already logged out locally; the token simply expires on its own.
  }
}

let refreshing: Promise<Session | null> | null = null

async function refresh(session: Session): Promise<Session | null> {
  try {
    const next = toSession(await authFetch('token?grant_type=refresh_token', { body: { refresh_token: session.refreshToken } }), session.user.email)
    if (!next) throw new AuthError('Session expired. Log in again.')
    // Ignore the result if the user logged out (or someone else logged in) meanwhile.
    if (current?.refreshToken !== session.refreshToken) return current
    setSession(next)
    return next
  } catch (err) {
    if (err instanceof AuthError && err.rejected) {
      if (current?.refreshToken === session.refreshToken) setSession(null)
      return null
    }
    // Network or server trouble: keep the session and let the request try with the old token.
    return current
  }
}

/** A valid access token for the signed-in login, refreshing it first when it is about to expire. */
export async function getAccessToken(): Promise<string | null> {
  const session = current
  if (!session) return null
  if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.accessToken
  if (!refreshing) {
    refreshing = refresh(session).finally(() => {
      refreshing = null
    })
  }
  return (await refreshing)?.accessToken ?? null
}
