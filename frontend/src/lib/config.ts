// Central place for environment variables and branding. Vite exposes only VITE_* keys.

/** The app name is not final. Change it here only; never hard-code it anywhere else. */
export const APP_NAME = 'MIGO'

export const TAGLINE = 'Find the place. Find your people.'

// Values set on the host at runtime (served as /env.js by server.js) win over build-time ones.
const runtimeEnv: Record<string, string | undefined> =
  (typeof window !== 'undefined' && (window as { __ENV__?: Record<string, string> }).__ENV__) || {}
const env = (key: 'VITE_GOOGLE_MAPS_API_KEY' | 'VITE_GOOGLE_MAPS_MAP_ID' | 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string =>
  runtimeEnv[key] || import.meta.env[key] || ''

export const config = {
  googleMapsApiKey: env('VITE_GOOGLE_MAPS_API_KEY'),
  /** Map ID for vector maps / Advanced Markers (Cloud Console → Map Management). Google's demo ID if unset. */
  googleMapsMapId: env('VITE_GOOGLE_MAPS_MAP_ID') || 'DEMO_MAP_ID',
  /** Supabase backend. Leave empty to run on mock data. */
  supabaseUrl: env('VITE_SUPABASE_URL').replace(/\/$/, ''),
  supabaseAnonKey: env('VITE_SUPABASE_ANON_KEY'),
}
