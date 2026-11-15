import { describe, expect, it } from 'vitest'
import { identify, OPENINGS, searchOpenings } from '../openings'

describe('opening index', () => {
  it('loads the full ECO set', () => {
    expect(OPENINGS.length).toBeGreaterThan(3000)
  })

  it('identifies the deepest named line', () => {
    const name = identify(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'])
    expect(name).toContain('Najdorf')
    expect(identify(['e4', 'e5'])).toContain('King')
  })

  it('searches by name and ECO', () => {
    expect(searchOpenings('sicilian', null).length).toBeGreaterThan(50)
    expect(searchOpenings('', 'E').every((o) => o.eco.startsWith('E'))).toBe(true)
  })
})
