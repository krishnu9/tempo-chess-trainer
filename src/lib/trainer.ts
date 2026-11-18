import { START_FEN, epd, playSan, turn } from './chess'
import { identify } from './openings'
import { cardKey } from './srs'
import { myPositions, sanPath, type Lookup } from './tree'
import type { Card, Repertoire } from './types'

export type Task = {
  key: string
  repId: string
  fen: string
  path: string[]
  expected: { uci: string; san: string }[]
  name: string
}

function makeTask(rep: Repertoire, node: { fen: string; children: { uci: string; san: string }[] }, path: string[]): Task {
  const sans = sanPath(rep.root, path)
  return {
    key: cardKey(rep.id, epd(node.fen)),
    repId: rep.id,
    fen: node.fen,
    path: [...path],
    expected: node.children.map((c) => ({ uci: c.uci, san: c.san })),
    name: identify(sans) ?? rep.name,
  }
}

export function buildReviewTasks(
  reps: Repertoire[],
  cards: Record<string, Card>,
  now: number,
  newLimit: number,
  cap = 40,
): Task[] {
  const due: Task[] = []
  const fresh: Task[] = []
  for (const rep of reps) {
    for (const { node, path } of myPositions(rep.root, rep.side)) {
      const key = cardKey(rep.id, epd(node.fen))
      const card = cards[key]
      if (card && card.due > now) continue
      const task = makeTask(rep, node, path)
      if (card) due.push(task)
      else fresh.push(task)
    }
  }
  due.sort((x, y) => {
    const a = cards[x.key]?.due ?? 0
    const b = cards[y.key]?.due ?? 0
    return a - b
  })
  return [...due, ...fresh.slice(0, Math.max(0, newLimit))].slice(0, cap)
}

/** Cards with lapses or low ease, due or not. Weak drill is extra practice on purpose. */
export function buildWeakTasks(reps: Repertoire[], cards: Record<string, Card>, cap = 40): Task[] {
  const weak: Task[] = []
  for (const rep of reps) {
    for (const { node, path } of myPositions(rep.root, rep.side)) {
      const card = cards[cardKey(rep.id, epd(node.fen))]
      if (!card || (card.lapses === 0 && card.ease >= 2.5)) continue
      weak.push(makeTask(rep, node, path))
    }
  }
  weak.sort((x, y) => {
    const a = cards[x.key]
    const b = cards[y.key]
    return b.lapses - a.lapses || a.ease - b.ease || a.due - b.due
  })
  return weak.slice(0, cap)
}

export function buildLineTasks(
  repId: string,
  side: 'white' | 'black',
  sans: string[],
  label: string,
): Task[] {
  const tasks: Task[] = []
  let fen = START_FEN
  const path: string[] = []
  for (const san of sans) {
    const move = playSan(fen, san)
    if (!move) break
    if (turn(fen) === side) {
      tasks.push({
        key: cardKey(repId, epd(fen)),
        repId,
        fen,
        path: [...path],
        expected: [{ uci: move.uci, san: move.san }],
        name: label,
      })
    }
    path.push(move.uci)
    fen = move.fen
  }
  return tasks
}

function weightedChild(
  children: { uci: string }[],
  fen: string,
  lookup: Lookup,
  rand: () => number,
) {
  const stats = lookup(fen)
  const weights = children.map((c) => stats?.moves.find((m) => m.uci === c.uci)?.games ?? 0)
  const total = weights.reduce((a, b) => a + b, 0)
  if (!total) return children[Math.floor(rand() * children.length)]
  let roll = rand() * total
  for (let i = 0; i < children.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return children[i]
  }
  return children[children.length - 1]
}

/** Random line through the repertoire, weighted by how often each move is played. */
export function buildPlayoutTasks(
  rep: Repertoire,
  lookup: Lookup,
  rand: () => number = Math.random,
): Task[] {
  const tasks: Task[] = []
  let node = rep.root
  const path: string[] = []
  for (let ply = 0; ply < 24; ply++) {
    if (!node.children.length) break
    if (turn(node.fen) === rep.side) tasks.push(makeTask(rep, node, path))
    const child = weightedChild(node.children, node.fen, lookup, rand) as (typeof node.children)[number]
    path.push(child.uci)
    node = child
  }
  return tasks
}
