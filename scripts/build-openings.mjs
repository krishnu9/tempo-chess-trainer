import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = new URL('../src/data/openings/', import.meta.url)
const out = fileURLToPath(new URL('../src/data/openings.json', import.meta.url))

const rows = []
for (const letter of ['a', 'b', 'c', 'd', 'e']) {
  const text = readFileSync(fileURLToPath(new URL(`${letter}.tsv`, dir)), 'utf8')
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('eco\t')) continue
    const [eco, name, pgn] = line.split('\t')
    if (!eco || !name || !pgn) continue
    rows.push([eco, name, pgn])
  }
}

writeFileSync(out, JSON.stringify(rows))
console.log(`openings: ${rows.length} rows -> src/data/openings.json`)
