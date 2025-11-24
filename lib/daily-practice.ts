const DAY_MS = 24 * 60 * 60 * 1000

export const DAILY_PRACTICE_REWARDS = [5, 10, 15, 20, 25, 30, 50]

export function getDateKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function differenceInDays(later: Date, earlier: Date): number {
  const utcLater = toUTCDate(later)
  const utcEarlier = toUTCDate(earlier)
  return Math.round((utcLater.getTime() - utcEarlier.getTime()) / DAY_MS)
}

export function getRewardForStreak(streak: number): number {
  if (streak <= 0) return DAILY_PRACTICE_REWARDS[0]
  const index = (streak - 1) % DAILY_PRACTICE_REWARDS.length
  return DAILY_PRACTICE_REWARDS[index]
}

export function getNextRewardPreview(streak: number): number {
  return getRewardForStreak(streak + 1)
}
