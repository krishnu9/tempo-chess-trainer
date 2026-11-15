// Builds public/opening-stats.json.gz from a sample of the Lichess game database.
// Usage: node --max-old-space-size=6144 scripts/build-opening-stats.mjs [--games 500000] [--min 20]
// Run with Node. Bun crashed on large shards during development.
import { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'
import { Chess } from 'chess.js'
import { gzipSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]])
    return acc
  }, []),
)
const GAMES = Number(args.games ?? 500000)
const DEPTH = Number(args.depth ?? 12)
const MIN_GAMES = Number(args.min ?? 20)
const OUT = args.out ?? 'public/opening-stats.json.gz'
const URL =
  args.url ??
  'https://huggingface.co/datasets/Lichess/standard-chess-games/resolve/main/data/year=2025/month=01/train-00000-of-00072.parquet'

const epd = (fen) => fen.split(' ').slice(0, 4).join(' ')
const isResult = (t) => t === '1-0' || t === '0-1' || t === '1/2-1/2' || t === '*'
const sanTokens = (movetext) =>
  movetext
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !isResult(t) && !/\d/.test(t[0]) && !t.includes('.'))
const seconds = (tc) => {
  const base = tc?.split('+')[0]
  if (!base || !/^\d+$/.test(base)) return null
  return Number(base)
}

console.log('reading parquet metadata…')
const file = await asyncBufferFromUrl({ url: URL })
const meta = await parquetMetadataAsync(file)
const total = Number(meta.num_rows)
console.log(`shard rows: ${total}, sample: ${GAMES}`)

const positions = new Map()
let games = 0
let skipped = 0
const CHUNK = 25000

for (let row = 0; row < GAMES; row += CHUNK) {
  const end = Math.min(row + CHUNK, GAMES)
  const rows = await parquetReadObjects({
    file,
    columns: ['WhiteElo', 'BlackElo', 'Result', 'TimeControl', 'movetext'],
    rowStart: row,
    rowEnd: end,
    compressors,
  })
  for (const g of rows) {
    const tc = seconds(g.TimeControl)
    if (tc === null || tc < 180 || tc > 1800) {
      skipped++
      continue
    }
    const result = g.Result === '1-0' ? 'w' : g.Result === '0-1' ? 'b' : g.Result === '1/2-1/2' ? 'd' : null
    if (!result) {
      skipped++
      continue
    }
    const chess = new Chess()
    let ok = true
    const moves = []
    for (const san of sanTokens(g.movetext).slice(0, DEPTH)) {
      try {
        const m = chess.move(san)
        moves.push({ uci: m.from + m.to + (m.promotion ?? ''), san: m.san })
      } catch {
        ok = false
        break
      }
    }
    if (!ok || !moves.length) {
      skipped++
      continue
    }
    const replay = new Chess()
    for (let i = 0; i < moves.length; i++) {
      const key = epd(replay.fen())
      let pos = positions.get(key)
      if (!pos) {
        pos = { n: 0, w: 0, d: 0, b: 0, m: new Map() }
        positions.set(key, pos)
      }
      pos.n++
      pos[result]++
      const mv = moves[i]
      let entry = pos.m.get(mv.uci)
      if (!entry) {
        entry = { san: mv.san, n: 0, w: 0, d: 0, b: 0 }
        pos.m.set(mv.uci, entry)
      }
      entry.n++
      entry[result]++
      replay.move(mv.san)
    }
    games++
  }
  console.log(`  ${end}/${GAMES} rows, ${positions.size} positions`)
}

const out = {}
for (const [key, pos] of positions) {
  if (pos.n < MIN_GAMES) continue
  const m = [...pos.m.entries()]
    .filter(([, v]) => v.n >= 2)
    .sort((x, y) => y[1].n - x[1].n)
    .slice(0, 12)
    .map(([uci, v]) => [uci, v.san, v.n, v.w, v.d, v.b])
  if (!m.length) continue
  out[key] = [pos.n, pos.w, pos.d, pos.b, m]
}

const payload = {
  meta: {
    source: 'Lichess standard-chess-games, 2025-01 shard sample',
    url: URL,
    games,
    skipped,
    depth: DEPTH,
    minGames: MIN_GAMES,
    timeControls: '180-1800 seconds',
    generated: new Date().toISOString(),
    positions: Object.keys(out).length,
  },
  positions: out,
}
const json = JSON.stringify(payload)
const gz = gzipSync(json, { level: 9 })
mkdirSync('public', { recursive: true })
writeFileSync(OUT, gz)
console.log(`games used: ${games}, skipped: ${skipped}`)
console.log(`positions: ${Object.keys(out).length}`)
console.log(`json: ${(json.length / 1e6).toFixed(1)} MB, gzip: ${(gz.length / 1e6).toFixed(2)} MB -> ${OUT}`)
