// Loads, adds and deletes the signed-in person's photos (lib/backend.ts → 006_gallery.sql, 007).
// Photos need an online account: in device mode (no Supabase) or when signed out, nothing is
// fetched and `availability` says why, so the page can explain instead of faking an upload.
// The bucket is private: image URLs are signed for an hour and replaced before they expire
// (on a timer, and when the page comes back to the foreground after the phone slept).
import { useCallback, useEffect, useState } from 'react'
import { deletePhoto, isBackendConfigured, listPhotos, refreshPhotoUrls, SIGNED_URL_REFRESH_MARGIN_MS, uploadPhoto } from '../../lib/backend'
import { useStore } from '../../store/useStore'
import type { Photo, PhotoMeta } from './types'

export type GalleryAvailability = 'device' | 'signed-out' | 'online'

/** Whether photos can be saved here, and for which profile. Shared by the gallery and the camera. */
export function useGalleryAvailability(): { availability: GalleryAvailability; profileId: string | null } {
  const { account, authEnabled, session } = useStore()
  const availability: GalleryAvailability = !isBackendConfigured() || !authEnabled ? 'device' : !session || !account ? 'signed-out' : 'online'
  return { availability, profileId: availability === 'online' ? (account?.id ?? null) : null }
}

/** Never retry signing more often than this (e.g. when the storage service is down). */
const MIN_REFRESH_DELAY_MS = 30_000

const byNewest = (a: Photo, b: Photo) => b.takenAt - a.takenAt || b.createdAt - a.createdAt

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
  const photos = current?.photos

  // Keep the signed URLs fresh while the gallery is open.
  useEffect(() => {
    if (!photos?.length || !key) return
    let cancelled = false
    const refresh = () => {
      refreshPhotoUrls(photos)
        .then((next) => {
          if (!cancelled && next !== photos) setLoaded((l) => (l && l.key === key ? { ...l, photos: next } : l))
        })
        .catch(() => undefined) // Try again on the next timer or when the page is shown again.
    }
    const soonest = Math.min(...photos.map((p) => p.urlExpiresAt))
    const delay = Math.max(MIN_REFRESH_DELAY_MS, soonest - SIGNED_URL_REFRESH_MARGIN_MS - Date.now())
    const timer = window.setTimeout(refresh, delay)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && soonest - SIGNED_URL_REFRESH_MARGIN_MS <= Date.now()) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [photos, key])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const add = useCallback(
    async (file: Blob, meta: PhotoMeta) => {
      if (!profileId) throw new Error('Sign in to save photos.')
      const photo = await uploadPhoto(profileId, file, meta)
      setLoaded((l) => l && { ...l, photos: [photo, ...l.photos].sort(byNewest) })
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
