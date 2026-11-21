// Formats seconds as mm:ss (e.g. 125 -> "02:05"). Negative values clamp to 00:00.
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
