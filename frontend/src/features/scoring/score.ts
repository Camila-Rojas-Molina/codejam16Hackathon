// Points for finding a quest location. The first team earns the most,
// and each later finder earns less, down to a floor.
export const SCORING = {
  firstFinderPoints: 100,
  pointsLostPerFinder: 10,
  minimumPoints: 10,
} as const

export function pointsForFinder(finderNumber: number): number {
  const points =
    SCORING.firstFinderPoints - (finderNumber - 1) * SCORING.pointsLostPerFinder
  return Math.max(points, SCORING.minimumPoints)
}
