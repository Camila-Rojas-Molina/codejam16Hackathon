// Which icons get MIGO's night treatment (see "Night icons" in styles/index.css).
import type { IconAccent } from './Icon'
import type { IconName } from './iconPaths'

/** Bright fills. At night these icons keep their day colours, with a thin cream rim. */
export const BRIGHT_ACCENTS: ReadonlySet<IconAccent> = new Set<IconAccent>(['saffron', 'teal', 'sienna', 'sandy'])

/**
 * Icons drawn in line only, with no accent fill. They stay in plain ink at night (cream), since
 * there's no bright fill for their lines to sit on. Keep in sync when adding an icon without {...A}.
 */
export const LINE_ONLY_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  'arrow-left',
  'arrow-right',
  'arrow-up-right',
  'arrow-up',
  'arrow-down',
  'chevron-down',
  'undo',
  'check',
  'close',
  'plus',
  'minus',
  'grip',
  'heart-outline',
  'no',
  'shuffle',
  'wave',
  'bike',
  'wheelchair',
])
