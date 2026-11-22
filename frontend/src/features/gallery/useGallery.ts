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

  const [photos, setPhotos] = useState<Photo[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!profileId) return
    let cancelled = false
    setStatus('loading')
    setError(null)
    listPhotos(profileId)
      .then((list) => {
        if (cancelled) return
        setPhotos(list)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Couldn’t load your photos.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [profileId, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const add = useCallback(
    async (file: Blob, meta: PhotoMeta) => {
      if (!profileId) throw new Error('Sign in to save photos.')
      const photo = await uploadPhoto(profileId, file, meta)
      setPhotos((list) => [photo, ...list].sort((a, b) => b.takenAt - a.takenAt || b.createdAt - a.createdAt))
      return photo
    },
    [profileId],
  )

  const remove = useCallback(
    async (photoId: string) => {
      if (!profileId) throw new Error('Sign in to manage photos.')
      await deletePhoto(profileId, photoId)
      setPhotos((list) => list.filter((p) => p.id !== photoId))
    },
    [profileId],
  )

  return {
    availability,
    photos: profileId ? photos : [],
    status: profileId ? status : 'idle',
    error,
    reload,
    add,
    remove,
  }
}
