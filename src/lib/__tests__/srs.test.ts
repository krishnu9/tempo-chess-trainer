import { describe, expect, it } from 'vitest'
import { DAY, gradeCard, isDue, newCard } from '../srs'

describe('spaced repetition', () => {
  const now = 1_700_000_000_000

  it('promotes correct answers', () => {
    let card = newCard('rep', 'fen', now)
    expect(isDue(card, now)).toBe(true)
    card = gradeCard(card, true, now)
    expect(card.interval).toBe(1)
    expect(card.due).toBe(now + DAY)
    card = gradeCard(card, true, now)
    expect(card.interval).toBe(3)
    expect(card.reps).toBe(2)
  })

  it('lapses reset the interval and lower ease', () => {
    let card = newCard('rep', 'fen', now)
    card = { ...card, interval: 20, ease: 2.5, reps: 4 }
    card = gradeCard(card, false, now)
    expect(card.interval).toBe(0)
    expect(card.lapses).toBe(1)
    expect(card.ease).toBe(2.3)
    expect(card.due).toBe(now + 10 * 60_000)
  })
})
