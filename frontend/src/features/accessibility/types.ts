export type AccessibilityNeed = 'mobility' | 'visual' | 'hearing' | 'cognitive'

export type AccessiblePlace = {
  id: string
  name: string
  needs: AccessibilityNeed[]
  location: { lat: number; lng: number }
}
