// Central place for environment variables and branding. Vite exposes only VITE_* keys.

/** The app name is not final. Change it here only; never hard-code it anywhere else. */
export const APP_NAME = 'MIGO'

export const TAGLINE = 'Find the place. Find your people.'

export const config = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  /** Supabase backend. Leave empty to run on mock data. */
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, ''),
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
}
