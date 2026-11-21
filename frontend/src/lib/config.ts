// Central place for environment variables and branding. Vite exposes only VITE_* keys.

/** The app name is not final. Change it here only; never hard-code it anywhere else. */
export const APP_NAME = 'MIGO'

export const TAGLINE = 'Find the place. Find your people.'

export const config = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
}
