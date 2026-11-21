// Central place for environment variables. Vite exposes only VITE_* keys.
export const config = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
}
