// How compatible two people look, as a short human label (always shown with a number too).
import type { BadgeTone } from '../../components/ui/Badge'

export function matchLabel(total: number | null): { text: string; tone: BadgeTone } {
  if (total === null) return { text: 'New face', tone: 'outline' }
  if (total >= 0.6) return { text: 'Great match', tone: 'saffron' }
  if (total >= 0.3) return { text: 'Good match', tone: 'teal' }
  return { text: 'Different vibes', tone: 'sandy' }
}
