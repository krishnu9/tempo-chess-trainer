import { identify } from '../lib/openings'
import { epd } from '../lib/chess'
import { sanPath, walk } from '../lib/tree'
import type { Attempt, Card, Repertoire } from '../lib/types'
import { DAY, isLearned } from '../lib/srs'
import { startOfDay } from '../lib/format'

export const endOfToday = (now = Date.now()) => startOfDay(now) + DAY

export function dueCount(cards: Record<string, Card>, now = Date.now()) {
  return Object.values(cards).filter((c) => c.lastReviewed > 0 && c.due <= now).length
}

export function learnedCount(cards: Record<string, Card>) {
  return Object.values(cards).filter(isLearned).length
}

export function accuracy(list: Attempt[]) {
  if (!list.length) return 0
  return list.filter((a) => a.correct).length / list.length
}

export function streakDays(attempts: Attempt[], now = Date.now()) {
  const days = new Set(attempts.map((a) => startOfDay(a.ts)))
  let cursor = startOfDay(now)
  if (!days.has(cursor)) cursor -= DAY
  let n = 0
  while (days.has(cursor)) {
    n++
    cursor -= DAY
  }
  return n
}

export type DayActivity = { day: number; label: string; correct: number; wrong: number; total: number }

export function activity(attempts: Attempt[], now = Date.now(), count = 30): DayActivity[] {
  const today = startOfDay(now)
  const map = new Map<number, { correct: number; wrong: number }>()
  for (const a of attempts) {
    const day = startOfDay(a.ts)
    const entry = map.get(day) ?? { correct: 0, wrong: 0 }
    if (a.correct) entry.correct++
    else entry.wrong++
    map.set(day, entry)
  }
  return Array.from({ length: count }, (_, i) => {
    const day = today - (count - 1 - i) * DAY
    const entry = map.get(day) ?? { correct: 0, wrong: 0 }
    return {
      day,
      label: new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      correct: entry.correct,
      wrong: entry.wrong,
      total: entry.correct + entry.wrong,
    }
  })
}

export function positionName(rep: Repertoire, target: string): string | null {
  let found: string | null = null
  walk(rep.root, (node, path) => {
    if (found) return
    if (epd(node.fen) === target) found = identify(sanPath(rep.root, path)) ?? rep.name
  })
  return found
}

export function weakPositions(
  cards: Record<string, Card>,
  reps: Repertoire[],
  now = Date.now(),
  limit = 5,
) {
  const byId = new Map(reps.map((r) => [r.id, r]))
  return Object.values(cards)
    .filter((c) => c.reps > 0)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease || (a.due < now ? -1 : 1))
    .slice(0, limit)
    .map((card) => ({
      card,
      rep: byId.get(card.repId),
      name: byId.get(card.repId) ? positionName(byId.get(card.repId)!, card.epd) : null,
    }))
    .filter((x) => x.rep)
}
