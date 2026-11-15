import type { Card } from './types'

export const DAY = 86_400_000
export const MINUTE = 60_000

export const cardKey = (repId: string, epd: string) => `${repId}:${epd}`

export function newCard(repId: string, epd: string, now = Date.now()): Card {
  return {
    repId,
    epd,
    due: now,
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    lastReviewed: 0,
  }
}

export function gradeCard(card: Card, correct: boolean, now = Date.now()): Card {
  if (!correct) {
    return {
      ...card,
      lapses: card.lapses + 1,
      interval: 0,
      ease: Math.max(1.3, card.ease - 0.2),
      due: now + 10 * MINUTE,
      lastReviewed: now,
    }
  }
  const interval = card.interval === 0 ? 1 : Math.max(1, Math.round(card.interval * card.ease))
  return {
    ...card,
    reps: card.reps + 1,
    interval,
    due: now + interval * DAY,
    lastReviewed: now,
  }
}

export const isDue = (card: Card | undefined, now: number) => !card || card.due <= now
export const isLearned = (card: Card | undefined) => !!card && card.interval >= 21
