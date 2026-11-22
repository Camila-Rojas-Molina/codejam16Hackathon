// Loads, adds and deletes the signed-in person's photos (lib/backend.ts → 006_gallery.sql).
// Photos need an online account: in device mode (no Supabase) or when signed out, nothing is
// fetched and `availability` says why, so the page can explain instead of faking an upload.
// The bucket is private: images are shown through signed URLs, re-signed before they expire.
import { useCallback, useEffect, useState } from 'react'
import { deletePhoto, isBackendConfigured, listPhotos, resignPhotos, uploadPhoto } from '../../lib/backend'
import { useStore } from '../../store/useStore'
import type { Photo, PhotoMeta } from './types'

export type GalleryAvailability = 'device' | 'signed-out' | 'online'

/** Re-sign this long before the URLs run out. */
const RESIGN_MARGIN_MS = 10 * 60_000

/** Whether photos can be saved here, and for which profile. Shared with the camera. */
export function useGalleryAvailability() {
  const { account, authEnabled, session } = useStore()
  const availability: GalleryAvailability = !isBackendConfigured() || !authEnabled ? 'device' : !session || !account ? 'signed-out' : 'online'
  return { availability, profileId: availability === 'online' ? (account?.id ?? null) : null }
}

export function useGallery() {
  const { availability, profileId } = useGalleryAvailability()

  // The last load, tagged with what it was for, so a stale one never shows as current.
  const [reloadKey, setReloadKey] = useState(0)
  const key = profileId ? `${profileId}:${reloadKey}` : null
  const [loaded, setLoaded] = useState<{ key: string; photos: Photo[]; error: string | null } | null>(null)

  useEffect(() => {
    if (!profileId || !key) return
    let cancelled = false
    listPhotos(profileId)
      .then((list) => !cancelled && setLoaded({ key, photos: list, error: null }))
      .catch((e: unknown) => {
        if (!cancelled) setLoaded({ key, photos: [], error: e instanceof Error ? e.message : 'Couldn’t load your photos.' })
      })
    return () => {
      cancelled = true
    }
  }, [profileId, key])

  const current = loaded && loaded.key === key ? loaded : null
  const status: 'idle' | 'loading' | 'ready' | 'error' = !key ? 'idle' : !current ? 'loading' : current.error ? 'error' : 'ready'

  // Fresh signed URLs before the oldest ones expire, and right away when the tab comes back after
  // they did (timers don't run while a phone sleeps). The list itself isn't reloaded.
  const photos = current?.photos
  const oldest = photos?.length ? Math.min(...photos.map((p) => p.urlExpiresAt)) : null
  useEffect(() => {
    if (!photos || oldest === null || !key) return
    let cancelled = false
    const resign = () => {
      resignPhotos(photos)
        .then((next) => !cancelled && setLoaded((l) => (l && l.key === key ? { ...l, photos: mergeUrls(l.photos, next) } : l)))
        .catch(() => undefined)
    }
    const due = oldest - RESIGN_MARGIN_MS - Date.now()
    // A failed signing (expiresAt 0) retries after a minute rather than in a tight loop.
    const timer = window.setTimeout(resign, Math.max(due, oldest === 0 ? 60_000 : 0))
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() > oldest - RESIGN_MARGIN_MS) resign()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [photos, oldest, key])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const add = useCallback(
    async (file: Blob, meta: PhotoMeta) => {
      if (!profileId) throw new Error('Sign in to save photos.')
      const photo = await uploadPhoto(profileId, file, meta)
      setLoaded((l) => l && { ...l, photos: [photo, ...l.photos].sort((a, b) => b.takenAt - a.takenAt || b.createdAt - a.createdAt) })
      return photo
    },
    [profileId],
  )

  const remove = useCallback(
    async (photoId: string) => {
      if (!profileId) throw new Error('Sign in to manage photos.')
      await deletePhoto(profileId, photoId)
      setLoaded((l) => l && { ...l, photos: l.photos.filter((p) => p.id !== photoId) })
    },
    [profileId],
  )

  return {
    availability,
    photos: photos ?? [],
    status,
    error: current?.error ?? null,
    reload,
    add,
    remove,
  }
}

// Take the new URLs for photos still in the list (one may have been deleted meanwhile).
function mergeUrls(currentPhotos: Photo[], signed: Photo[]): Photo[] {
  const byId = new Map(signed.map((p) => [p.id, p]))
  return currentPhotos.map((p) => {
    const s = byId.get(p.id)
    return s ? { ...p, url: s.url, urlExpiresAt: s.urlExpiresAt } : p
  })
}
