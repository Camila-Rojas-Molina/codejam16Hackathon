// Day / Night appearance. Three choices: follow the device (default), always Day, always Night.
//
// The resolved theme lives on <html data-theme="light|dark">; styles/index.css swaps the colour
// tokens from it. index.html runs a tiny copy of resolve() before first paint so there is no
// flash; keep the two in sync (same storage key, same colours).
import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'migo:theme'

/** Browser chrome colour per theme: the page paper (--day-paper / --night-paper in index.css). */
const THEME_COLOR: Record<Theme, string> = { light: '#f3ebd5', dark: '#132428' }

const DARK_QUERY = '(prefers-color-scheme: dark)'

function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark'
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return isPreference(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

function writePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    // Storage blocked (private mode, quota): the choice still applies for this visit.
  }
}

function media(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
}

function systemTheme(): Theme {
  return media()?.matches ? 'dark' : 'light'
}

export function resolveTheme(pref: ThemePreference): Theme {
  return pref === 'system' ? systemTheme() : pref
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

// --- store -------------------------------------------------------------------------------------

type Snapshot = { preference: ThemePreference; theme: Theme }

let snapshot: Snapshot | null = null
const listeners = new Set<() => void>()

function current(): Snapshot {
  if (!snapshot) {
    const preference = readPreference()
    snapshot = { preference, theme: resolveTheme(preference) }
  }
  return snapshot
}

function update(preference: ThemePreference) {
  const theme = resolveTheme(preference)
  const prev = current()
  apply(theme)
  if (prev.preference === preference && prev.theme === theme) return
  snapshot = { preference, theme }
  listeners.forEach((l) => l())
}

/** Choose Day, Night or System. Persists across visits; System clears the stored choice. */
export function setThemePreference(pref: ThemePreference) {
  writePreference(pref)
  update(pref)
}

let started = false

/**
 * Call once at startup. Applies the stored choice (index.html already did, this keeps them in
 * step), follows the OS live while on System, and picks up a choice made in another tab.
 */
export function initTheme() {
  if (started || typeof window === 'undefined') return
  started = true
  update(readPreference())
  media()?.addEventListener('change', () => {
    if (current().preference === 'system') update('system')
  })
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) update(readPreference())
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const serverSnapshot: Snapshot = { preference: 'system', theme: 'light' }

/** The current choice and the theme it resolves to; re-renders when either changes. */
export function useTheme() {
  const { preference, theme } = useSyncExternalStore(subscribe, current, () => serverSnapshot)
  return { preference, theme, setPreference: setThemePreference }
}
