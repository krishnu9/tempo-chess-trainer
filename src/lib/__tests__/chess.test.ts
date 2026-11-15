import { describe, expect, it } from 'vitest'
import { parseSans, playSan, replay, START_FEN, uciPath } from '../chess'

describe('chess helpers', () => {
  it('parses PGN movetext', () => {
    expect(parseSans('1. e4 e5 2. Nf3 {clock} Nc6 1-0')).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
  })

  it('rejects illegal moves', () => {
    expect(playSan(START_FEN, 'e5')).toBeNull()
    expect(playSan(START_FEN, 'e4')?.san).toBe('e4')
  })

  it('replays a line to UCI moves', () => {
    const path = uciPath(['e4', 'c5', 'Nf3', 'd6', 'd4'])
    expect(path).toEqual(['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4'])
    expect(replay(['e4'])[0].fen.split(' ')[1]).toBe('b')
  })
})
