import { describe, expect, it } from 'vitest'
import { buildLineTasks, buildPlayoutTasks, buildReviewTasks } from '../trainer'
import { START_FEN, playUci } from '../chess'
import { addLine, emptyRoot } from '../tree'
import type { Repertoire } from '../types'

const makeRep = (lines: string[][]): Repertoire => {
  let root = emptyRoot()
  for (const line of lines) root = addLine(root, line).root
  return { id: 'r1', name: 'Test', side: 'white', root, createdAt: 0, updatedAt: 0 }
}

describe('trainer sessions', () => {
  it('builds one task per decision point', () => {
    const rep = makeRep([['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']])
    const tasks = buildReviewTasks([rep], {}, Date.now(), 20)
    expect(tasks.map((t) => t.expected[0].san)).toEqual(['e4', 'Nf3', 'Bb5'])
  })

  it('respects the daily new card cap', () => {
    const rep = makeRep([['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']])
    expect(buildReviewTasks([rep], {}, Date.now(), 2)).toHaveLength(2)
  })

  it('builds a line drill for one side', () => {
    const tasks = buildLineTasks('r1', 'black', ['e4', 'e5', 'Nf3', 'Nc6'], 'Test line')
    expect(tasks.map((t) => t.expected[0].san)).toEqual(['e5', 'Nc6'])
    expect(tasks[1].path).toHaveLength(3)
  })

  it('plays out a line through the tree', () => {
    const rep = makeRep([['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']])
    const tasks = buildPlayoutTasks(rep, () => null, () => 0.1)
    expect(tasks.length).toBeGreaterThanOrEqual(3)
    for (const task of tasks) {
      expect(task.fen.split(' ')[1]).toBe('w')
      let fen = START_FEN
      for (const uci of task.path) {
        const played = playUci(fen, uci)
        if (!played) throw new Error('bad path')
        fen = played.fen
      }
      expect(fen).toBe(task.fen)
    }
  })
})
