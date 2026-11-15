import { describe, expect, it } from 'vitest'
import { START_FEN } from '../chess'
import {
  addLine,
  countNodes,
  coverage,
  draftFromPopular,
  emptyRoot,
  getNode,
  myPositions,
  removeAt,
  sanPath,
} from '../tree'

describe('repertoire tree', () => {
  it('merges lines without duplicate nodes', () => {
    let root = emptyRoot()
    root = addLine(root, ['e4', 'e5', 'Nf3']).root
    const before = countNodes(root)
    root = addLine(root, ['e4', 'e5', 'Nf3', 'Nc6']).root
    expect(countNodes(root)).toBe(before + 1)
    root = addLine(root, ['e4', 'e5', 'Nf3']).root
    expect(countNodes(root)).toBe(before + 1)
  })

  it('finds nodes by UCI path', () => {
    const { root, path } = addLine(emptyRoot(), ['d4', 'd5', 'c4'])
    const node = getNode(root, path)
    expect(node?.san).toBe('c4')
    expect(sanPath(root, path)).toEqual(['d4', 'd5', 'c4'])
    expect(getNode(root, ['e2e4'])).toBeNull()
  })

  it('lists only decision points for a side', () => {
    const { root } = addLine(emptyRoot(), ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
    expect(myPositions(root, 'white')).toHaveLength(3)
    expect(myPositions(root, 'black')).toHaveLength(2)
  })

  it('removes a branch', () => {
    const { root, path } = addLine(emptyRoot(), ['e4', 'e5', 'Nf3'])
    const trimmed = removeAt(root, path)
    expect(getNode(trimmed, path)).toBeNull()
    expect(getNode(trimmed, path.slice(0, -1))?.san).toBe('e5')
  })

  it('computes weighted coverage on opponent nodes', () => {
    const { root } = addLine(emptyRoot(), ['e4', 'e5', 'Nf3'])
    const stats = (fen: string) => {
      if (fen === START_FEN) return { total: 100, moves: [{ uci: 'e2e4', games: 100 }] }
      if (fen === 'e4pos') return { total: 100, moves: [{ uci: 'e7e5', games: 50 }, { uci: 'c7c5', games: 50 }] }
      return null
    }
    const withStats = (fen: string) => (fen.split(' ')[0].includes('4P3') ? stats('e4pos') : stats(fen))
    const result = coverage(root, 'white', withStats)
    expect(result.total).toBe(100)
    expect(result.covered).toBe(50)
    expect(result.pct).toBe(0.5)
  })

  it('drafts popular moves from an empty tree', () => {
    const root = emptyRoot()
    const lookup = (fen: string) => {
      if (fen === START_FEN) return { total: 100, moves: [{ uci: 'e2e4', games: 60 }, { uci: 'd2d4', games: 40 }] }
      return null
    }
    const drafted = draftFromPopular(root, 'white', lookup, 0.85, 8)
    expect(drafted.children.map((c) => c.san)).toEqual(['e4'])
    expect(countNodes(drafted)).toBe(2)
  })
})
