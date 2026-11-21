// How compatible two people look, as a short human label (always shown with a number too).
export function matchLabel(total: number | null): { text: string; tone: 'sun' | 'bubble' | 'bubble-light' } {
  if (total === null) return { text: 'New face', tone: 'bubble-light' }
  if (total >= 0.6) return { text: 'Great match', tone: 'sun' }
  if (total >= 0.3) return { text: 'Good match', tone: 'bubble' }
  return { text: 'Different vibes', tone: 'bubble-light' }
}
