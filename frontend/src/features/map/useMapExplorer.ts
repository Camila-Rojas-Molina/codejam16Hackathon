// Everything the map screen knows that doesn't depend on the map engine (Google or MapLibre): the
// landmarks for the settled viewport, the selection and its details, filters, the list toggle,
// the clustered items to draw and the toolbar's summary. Each engine reports its camera through
// onViewChange and draws `items`; MapFrame draws the rest.
import { useCallback, useMemo, useState } from 'react'
import type { Bounds, LandmarkCategory, LandmarkSummary } from '../explore/types'
import { clusterLandmarks, type MapItem, type Projector } from './cluster'
import { inBounds, padBounds } from './geo'
import { NO_FILTERS, byProminence, matchesFilters, type MapFilters } from './landmarkMeta'
import { useLandmarks } from './useLandmarks'
import { useRefreshOnReturn } from './useRefreshOnReturn'
import { useSelection } from './useSelection'

export type MapView = {
  bounds: Bounds
  zoom: number
  /** Screen projection at this camera (tilted maps); flat Mercator when omitted. */
  project?: Projector
}

export function useMapExplorer() {
  const { landmarks, status, error, load, retry, refresh } = useLandmarks()
  const selection = useSelection()
  const { selected, selectedId, detail, select } = selection
  const [view, setView] = useState<MapView | null>(null)
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS)
  const [listOpen, setListOpen] = useState(false)
  const [fromList, setFromList] = useState(false)

  useRefreshOnReturn(() => {
    refresh()
    detail.reload()
  })

  /** The engine's camera has settled: remember it and load that area. */
  const onViewChange = useCallback(
    (v: MapView) => {
      setView(v)
      void load(v.bounds)
    },
    [load],
  )

  const inView = useMemo(() => (view ? landmarks.filter((l) => inBounds(l, view.bounds)) : []), [landmarks, view])
  const shownInView = useMemo(() => inView.filter((l) => matchesFilters(l, filters)).sort(byProminence), [inView, filters])
  const categories = useMemo(() => [...new Set(landmarks.map((l) => l.category))].sort() as LandmarkCategory[], [landmarks])

  // Pins just past the edges too, so a small pan doesn't show empty space before the next settle.
  const items: MapItem[] = useMemo(() => {
    if (!view) return []
    const area = padBounds(view.bounds, 0.15)
    const points = landmarks.filter((l) => l.id !== selectedId && inBounds(l, area) && matchesFilters(l, filters))
    return clusterLandmarks(points, view.zoom, view.project)
  }, [landmarks, view, filters, selectedId])

  const ready = detail.state?.status === 'ready' ? detail.state.detail : null
  const selectedSummary: LandmarkSummary | undefined = landmarks.find((l) => l.id === selectedId) ?? ready ?? undefined

  const openFromMap = useCallback(
    (l: LandmarkSummary) => {
      setFromList(false)
      select(l.id)
    },
    [select],
  )
  /** The engine also moves its camera to the landmark (see MapFrame's onOpenFromList). */
  const openFromList = useCallback(
    (l: LandmarkSummary) => {
      setFromList(true)
      select(l.id)
    },
    [select],
  )

  const summary =
    status === 'unconfigured'
      ? 'Catalogue offline'
      : status === 'idle' || (status === 'loading' && landmarks.length === 0)
        ? 'Loading landmarks…'
        : shownInView.length === inView.length
          ? `${inView.length} ${inView.length === 1 ? 'place' : 'places'} in view`
          : `${shownInView.length} of ${inView.length} places in view`

  return {
    landmarks,
    status,
    error,
    retry,
    ...selection,
    view,
    onViewChange,
    filters,
    setFilters,
    listOpen,
    setListOpen,
    fromList,
    inView,
    shownInView,
    categories,
    items,
    ready,
    selectedSummary,
    openFromMap,
    openFromList,
    summary,
    sheetOpen: Boolean(selected && detail.state),
  }
}

export type MapExplorer = ReturnType<typeof useMapExplorer>
