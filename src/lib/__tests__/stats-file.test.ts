import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

const file = new URL('../../../public/opening-stats.json.gz', import.meta.url)

describe('bundled popularity snapshot', () => {
  it('contains games and a sane root position', () => {
    const data = JSON.parse(gunzipSync(readFileSync(file)).toString())
    expect(data.meta.games).toBeGreaterThan(100000)
    const start = data.positions['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -']
    expect(start[0]).toBeGreaterThan(100000)
    const moves = start[4].map((m: unknown[]) => m[1])
    expect(moves).toContain('e4')
    expect(moves).toContain('d4')
    expect(moves[0]).toBe('e4')
  })
})
