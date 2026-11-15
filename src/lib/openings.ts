import a from '../data/openings/a.tsv?raw'
import b from '../data/openings/b.tsv?raw'
import c from '../data/openings/c.tsv?raw'
import d from '../data/openings/d.tsv?raw'
import e from '../data/openings/e.tsv?raw'
import { parseSans } from './chess'

export type Opening = {
  eco: string
  name: string
  family: string
  sans: string[]
}

function parse(raw: string): Opening[] {
  return raw
    .split('\n')
    .filter((line) => line && !line.startsWith('eco\t'))
    .map((line) => {
      const [eco, name, pgn] = line.split('\t')
      return { eco, name, family: name.split(':')[0], sans: parseSans(pgn ?? '') }
    })
    .filter((o) => o.sans.length > 0)
}

export const OPENINGS: Opening[] = [a, b, c, d, e]
  .flatMap(parse)
  .sort((x, y) => x.eco.localeCompare(y.eco) || x.name.localeCompare(y.name))

export const FAMILIES = [...new Set(OPENINGS.map((o) => o.family))].sort()

type NameNode = { name?: string; kids: Map<string, NameNode> }

const trie: NameNode = { kids: new Map() }

for (const opening of OPENINGS) {
  let node = trie
  for (const san of opening.sans) {
    let next = node.kids.get(san)
    if (!next) {
      next = { kids: new Map() }
      node.kids.set(san, next)
    }
    node = next
  }
  if (!node.name) node.name = opening.name
}

export function identify(sans: string[]): string | null {
  let node = trie
  let name: string | null = null
  for (const san of sans) {
    const next = node.kids.get(san)
    if (!next) break
    node = next
    if (node.name) name = node.name
  }
  return name
}

export function findOpening(sans: string[]): Opening | undefined {
  const key = sans.join(' ')
  return OPENINGS.find((o) => o.sans.join(' ') === key)
}

export function searchOpenings(query: string, family: string | null): Opening[] {
  const q = query.trim().toLowerCase()
  return OPENINGS.filter((o) => {
    if (family && o.family !== family) return false
    if (!q) return true
    return o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q)
  })
}

export const ECO_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const
