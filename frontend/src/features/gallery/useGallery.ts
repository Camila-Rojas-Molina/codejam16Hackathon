// Loads, adds and deletes the signed-in person's photos (lib/backend.ts → 006_gallery.sql).
// Photos need an online account: in device mode (no Supabase) or when signed out, nothing is
// fetched and `availability` says why, so the page can explain instead of faking an upload.
import { useCallback, useEffect, useState } from 'react'
import { deletePhoto, isBackendConfigured, listPhotos, uploadPhoto } from '../../lib/backend'
import { useStore } from '../../store/useStore'
import type { Photo, PhotoMeta } from './types'

export type GalleryAvailability = 'device' | 'signed-out' | 'online'

export function useGallery() {
  const { account, authEnabled, session } = useStore()
  const availability: GalleryAvailability = !isBackendConfigured() || !authEnabled ? 'device' : !session || !account ? 'signed-out' : 'online'
  const profileId = availability === 'online' ? (account?.id ?? null) : null

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
    photos: current?.photos ?? [],
    status,
    error: current?.error ?? null,
    reload,
    add,
    remove,
  }
}
