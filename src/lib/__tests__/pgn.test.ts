import { describe, expect, it } from 'vitest'
import { parsePgn, toPgn } from '../pgn'
import { addLine, emptyRoot } from '../tree'

const TWO_GAMES = `[Event "One"]
[Result "*"]

1. e4 e5 2. Nf3 *

[Event "Two"]
[Result "*"]

1. d4 d5 *`

describe('PGN import', () => {
  it('reads the mainline of each game', () => {
    const { lines, skipped } = parsePgn(TWO_GAMES)
    expect(lines).toEqual([
      ['e4', 'e5', 'Nf3'],
      ['d4', 'd5'],
    ])
    expect(skipped).toBe(0)
  })

  it('skips a game with an illegal move', () => {
    const { lines, skipped } = parsePgn(`1. e4 e5 2. Zz9 *`)
    expect(lines).toEqual([])
    expect(skipped).toBe(1)
  })

  it('reads bare movetext', () => {
    expect(parsePgn('1. c4 e6 2. Nc3 *').lines).toEqual([['c4', 'e6', 'Nc3']])
  })

  it('skips games from a custom start position', () => {
    const custom = `[Event "Endgame"]
[FEN "8/8/8/8/8/8/4k3/4K3 w - - 0 1"]
[Result "*"]

1. Kd2 *`
    expect(parsePgn(custom)).toEqual({ lines: [], skipped: 1 })
  })
})

describe('PGN export', () => {
  it('writes one game per line and reads it back', () => {
    let root = emptyRoot()
    root = addLine(root, ['e4', 'e5', 'Nf3', 'Nc6']).root
    root = addLine(root, ['e4', 'e5', 'Bc4']).root

    const pgn = toPgn(root, 'Test "rep"')
    expect(pgn).toContain('[Event "Test \'rep\'"]')

    const { lines, skipped } = parsePgn(pgn)
    expect(skipped).toBe(0)
    expect(lines).toHaveLength(2)
    expect(lines).toContainEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(lines).toContainEqual(['e4', 'e5', 'Bc4'])
  })

  it('returns an empty string for an empty tree', () => {
    expect(toPgn(emptyRoot(), 'Empty')).toBe('')
  })
})
