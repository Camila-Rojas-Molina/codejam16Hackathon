// Where the map's overlays sit, shared by the live map and the list-only fallback.
//   details sheet   phones: bottom sheet over the map · laptops: a panel down the right side
//   list            phones: covers the map · laptops: a panel down the left side

export const SHEET_PANEL =
  'absolute inset-x-2 bottom-2 z-30 max-h-[78%] lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-[22rem]'

export const LIST_PANEL =
  'absolute inset-0 z-20 overflow-y-auto sheet-grain lg:inset-auto lg:top-3 lg:bottom-3 lg:left-3 lg:w-80 lg:border-2 lg:border-ink lg:shadow-block-sm'

/** Phones have a coarse pointer: greedy one-finger panning and no zoom buttons (pinch instead). */
export const isCoarsePointer = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches)
