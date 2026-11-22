// A maplibregl.Marker whose DOM content is React (rendered through a portal), so the 3D map uses
// the same pins and cluster bubbles as the Google map. Markers stand upright on a tilted map
// (viewport pitch/rotation alignment). Clickable markers are focusable buttons named by `title`.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { LatLng } from './types'

type Props = {
  map: MapLibreMap
  position: LatLng
  anchor?: 'bottom' | 'center'
  title: string
  zIndex?: number
  onClick?: () => void
  children: ReactNode
}

/** Stacking, role and accessible name of the marker element. */
function describe(el: HTMLElement, title: string, zIndex: number, clickable: boolean) {
  el.style.zIndex = String(zIndex)
  el.style.cursor = clickable ? 'pointer' : ''
  el.setAttribute('role', clickable ? 'button' : 'img')
  if (clickable) el.setAttribute('tabindex', '0')
  else el.removeAttribute('tabindex')
  el.setAttribute('aria-label', title)
  el.setAttribute('title', title)
}

export default function MapLibreMarker({ map, position, anchor = 'bottom', title, zIndex = 1, onClick, children }: Props) {
  const [el] = useState(() => document.createElement('div'))
  const marker = useRef<Marker | null>(null)
  const click = useRef(onClick)
  const start = useRef(position)

  useEffect(() => {
    click.current = onClick
  }, [onClick])

  useEffect(() => {
    // With 3D terrain, MapLibre fades markers it thinks the ground hides (opacityWhenCovered). Its
    // check misfires on the exaggerated terrain and greys out every pin, so keep pins fully opaque.
    const m = new Marker({ element: el, anchor, pitchAlignment: 'viewport', rotationAlignment: 'viewport', opacity: '1', opacityWhenCovered: '1' })
      .setLngLat([start.current.lng, start.current.lat])
      .addTo(map)
    marker.current = m
    const activate = (e: Event) => {
      if (!click.current) return
      e.stopPropagation()
      click.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activate(e)
      }
    }
    el.addEventListener('click', activate)
    el.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('click', activate)
      el.removeEventListener('keydown', onKey)
      m.remove()
      marker.current = null
    }
  }, [map, el, anchor])

  useEffect(() => {
    marker.current?.setLngLat([position.lng, position.lat])
  }, [position.lat, position.lng])

  useEffect(() => describe(el, title, zIndex, Boolean(onClick)), [el, zIndex, title, onClick])

  return createPortal(children, el)
}
