import { epd } from '../lib/chess'
import { uid } from '../lib/format'
import { identify } from '../lib/openings'
import { cardKey, DAY } from '../lib/srs'
import type { Attempt, Card, Repertoire } from '../lib/types'
import { addLine, emptyRoot, myPositions, sanPath } from '../lib/tree'

const WHITE_LINES = [
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3 d6 6. O-O',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O d6 6. c3',
  '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5',
  '1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 c5 5. c3 Nc6 6. Nbd2',
  '1. d4 d5 2. Bf4 e6 3. e3 Nf6 4. Nf3 Bd6 5. Bg3 O-O 6. Bd3',
  '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5',
  '1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6',
  '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6',
  '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 c6 6. Bc4',
]

const BLACK_LINES = [
  '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6',
  '1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 c5 6. Be3 Nc6',
  '1. e4 c6 2. Nc3 d5 3. Nf3 Bg4 4. h3 Bxf3 5. Qxf3 e6 6. d3',
  '1. e4 c6 2. d4 d5 3. exd5 cxd5 4. Bd3 Nc6 5. c3 Nf6 6. Bf4',
  '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6',
  '1. d4 d5 2. c4 e6 3. Nf3 Nf6 4. g3 Be7 5. Bg2 O-O 6. O-O',
  '1. Nf3 d5 2. g3 Nf6 3. Bg2 c6 4. O-O Bf5 5. d3 e6',
  '1. c4 e6 2. Nc3 d5 3. d4 Nf6 4. Nf3 Be7 5. Bf4 O-O',
  '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5',
  '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Nf3 Ngf6',
]

const parse = (line: string) =>
  line
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.$/.test(t))

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeed(now = Date.now()): {
  repertoires: Repertoire[]
  cards: Record<string, Card>
  attempts: Attempt[]
} {
  const rand = mulberry32(20261112)
  const repertoires: Repertoire[] = []

  const build = (name: string, side: 'white' | 'black', lines: string[]) => {
    let root = emptyRoot()
    for (const line of lines) root = addLine(root, parse(line)).root
    const rep: Repertoire = {
      id: uid(),
      name,
      side,
      root,
      createdAt: now - 45 * DAY,
      updatedAt: now - 2 * DAY,
    }
    repertoires.push(rep)
    return rep
  }

  build('White · Italian & London', 'white', WHITE_LINES)
  build('Black · Caro-Kann & QGD', 'black', BLACK_LINES)

  const cards: Record<string, Card> = {}
  const attempts: Attempt[] = []
  const pools: { rep: Repertoire; positions: ReturnType<typeof myPositions> }[] = []

  for (const rep of repertoires) {
    const positions = myPositions(rep.root, rep.side)
    pools.push({ rep, positions })
    positions.forEach(({ node }, i) => {
      if (rand() < 0.32) return
      const days = [1, 2, 4, 7, 12, 18, 26, 40][Math.floor(rand() * 8)]
      const bucket = rand()
      const due =
        bucket < 0.34
          ? now - Math.floor(rand() * 2 * DAY)
          : bucket < 0.6
            ? now + Math.floor(rand() * 2 * DAY)
            : now + Math.floor((2 + rand() * 30) * DAY)
      cards[cardKey(rep.id, epd(node.fen))] = {
        repId: rep.id,
        epd: epd(node.fen),
        due,
        interval: i % 7 === 0 ? 0 : days,
        ease: 2.2 + rand() * 0.45,
        reps: Math.floor(rand() * 7),
        lapses: rand() < 0.25 ? 1 + Math.floor(rand() * 2) : 0,
        lastReviewed: now - Math.floor((1 + rand() * 20) * DAY),
      }
    })
  }

  const all = pools.flatMap((p) => p.positions.map((pos) => ({ ...pos, rep: p.rep })))
  for (let d = 29; d >= 0; d--) {
    const dayStart = now - d * DAY
    const skip = d > 6 && rand() < 0.12
    const count = skip ? 0 : 5 + Math.floor(rand() * 12)
    for (let i = 0; i < count; i++) {
      const pick = all[Math.floor(rand() * all.length)]
      const correct = rand() < 0.87
      const san = sanPath(pick.rep.root, pick.path)
      attempts.push({
        ts: dayStart - Math.floor(rand() * 10 * 3600_000),
        repId: pick.rep.id,
        epd: epd(pick.node.fen),
        name: identify(san) ?? pick.rep.name,
        correct,
        ms: 2500 + Math.floor(rand() * 7000),
      })
    }
  }
  attempts.sort((a, b) => a.ts - b.ts)

  return { repertoires, cards, attempts }
}
