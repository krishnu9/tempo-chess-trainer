import { Chess } from 'chess.js'
import type { TreeNode } from './types'

export type PgnImport = { lines: string[][]; skipped: number }

/**
 * Reads the mainline of every game in a PGN file. Variations are ignored.
 * Splits on [Event] tags so a multi-game file loads one game at a time.
 */
export function parsePgn(text: string): PgnImport {
  const chunks = /^\s*\[Event\s/m.test(text) ? text.split(/(?=^\s*\[Event\s)/m) : [text]
  const lines: string[][] = []
  let skipped = 0
  for (const chunk of chunks) {
    if (!chunk.trim()) continue
    try {
      const game = new Chess()
      game.loadPgn(chunk)
      if (game.getHeaders().FEN) {
        skipped++
        continue
      }
      const history = game.history()
      if (history.length) lines.push(history)
      else skipped++
    } catch {
      skipped++
    }
  }
  return { lines, skipped }
}

/** One game per leaf path. Opening trees with shared moves repeat the shared prefix. */
export function toPgn(root: TreeNode, name: string, date = new Date()): string {
  const games: string[][] = []
  const collect = (node: TreeNode, sans: string[]) => {
    if (!node.children.length) {
      if (sans.length) games.push(sans)
      return
    }
    for (const child of node.children) collect(child, [...sans, child.san])
  }
  collect(root, [])
  if (!games.length) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  const dateTag = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
  const event = name.replace(/"/g, "'")

  return `${games
    .map((sans) => {
      const headers = [
        `[Event "${event}"]`,
        '[Site "Tempo"]',
        `[Date "${dateTag}"]`,
        '[Round "-"]',
        '[White "?"]',
        '[Black "?"]',
        '[Result "*"]',
      ].join('\n')
      const moves = sans.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' ')
      return `${headers}\n\n${moves} *`
    })
    .join('\n\n')}\n`
}
