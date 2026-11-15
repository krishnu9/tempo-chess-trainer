import { START_FEN, playSan, playUci, turn } from './chess'
import type { Side, TreeNode } from './types'

export const emptyRoot = (): TreeNode => ({ san: '', uci: '', fen: START_FEN, children: [] })

export const clone = <T,>(value: T): T => structuredClone(value)

export function getNode(root: TreeNode, path: string[]): TreeNode | null {
  let node = root
  for (const uci of path) {
    const next = node.children.find((c) => c.uci === uci)
    if (!next) return null
    node = next
  }
  return node
}

export function addMove(
  root: TreeNode,
  parentPath: string[],
  san: string,
): { root: TreeNode; path: string[] } | null {
  const next = clone(root)
  const parent = getNode(next, parentPath)
  if (!parent) return null
  const move = playSan(parent.fen, san)
  if (!move) return null
  const existing = parent.children.find((c) => c.uci === move.uci)
  if (!existing) {
    parent.children.push({ san: move.san, uci: move.uci, fen: move.fen, children: [] })
  }
  return { root: next, path: [...parentPath, move.uci] }
}

export function addLine(
  root: TreeNode,
  sans: string[],
): { root: TreeNode; path: string[] } {
  let next = clone(root)
  let path: string[] = []
  let fen = START_FEN
  for (const san of sans) {
    const move = playSan(fen, san)
    if (!move) break
    const parent = getNode(next, path)
    if (!parent) break
    if (!parent.children.some((c) => c.uci === move.uci)) {
      parent.children.push({ san: move.san, uci: move.uci, fen: move.fen, children: [] })
    }
    path = [...path, move.uci]
    fen = move.fen
  }
  return { root: next, path }
}

export function sanPath(root: TreeNode, path: string[]): string[] {
  const out: string[] = []
  let node = root
  for (const uci of path) {
    const child = node.children.find((c) => c.uci === uci)
    if (!child) break
    out.push(child.san)
    node = child
  }
  return out
}

export function removeAt(root: TreeNode, path: string[]): TreeNode {
  if (!path.length) return root
  const next = clone(root)
  const parent = getNode(next, path.slice(0, -1))
  if (!parent) return next
  const last = path[path.length - 1]
  parent.children = parent.children.filter((c) => c.uci !== last)
  return next
}

export function walk(
  root: TreeNode,
  fn: (node: TreeNode, path: string[], parent: TreeNode | null) => void,
  path: string[] = [],
  parent: TreeNode | null = null,
) {
  fn(root, path, parent)
  for (const child of root.children) {
    walk(child, fn, [...path, child.uci], root)
  }
}

export function countNodes(root: TreeNode): number {
  let n = 0
  walk(root, () => n++)
  return n
}

export function countMoves(root: TreeNode): number {
  let n = 0
  walk(root, (node) => {
    n += node.children.length
  })
  return n
}

export type Position = { node: TreeNode; path: string[] }

export function myPositions(root: TreeNode, side: Side): Position[] {
  const out: Position[] = []
  walk(root, (node, path) => {
    if (turn(node.fen) === side && node.children.length > 0) out.push({ node, path })
  })
  return out
}

export type Lookup = (fen: string) => {
  total: number
  moves: { uci: string; games: number }[]
} | null

export function coverage(root: TreeNode, side: Side, lookup: Lookup) {
  let covered = 0
  let total = 0
  walk(root, (node) => {
    if (turn(node.fen) === side) return
    if (!node.children.length) return
    const stats = lookup(node.fen)
    if (!stats || !stats.total) return
    total += stats.total
    for (const child of node.children) {
      const played = stats.moves.find((m) => m.uci === child.uci)
      if (played) covered += played.games
    }
  })
  return { pct: total ? covered / total : 0, covered, total }
}

export function nodeCoverage(node: TreeNode, side: Side, lookup: Lookup) {
  if (turn(node.fen) === side) return null
  const stats = lookup(node.fen)
  if (!stats || !stats.total) return null
  let covered = 0
  for (const child of node.children) {
    const played = stats.moves.find((m) => m.uci === child.uci)
    if (played) covered += played.games
  }
  return { pct: covered / stats.total, covered, total: stats.total }
}

/**
 * Extends the tree along the most popular opponent moves until the target
 * game share is covered. Replies are the most popular move in the position.
 */
export function draftFromPopular(
  root: TreeNode,
  side: Side,
  lookup: Lookup,
  target = 0.85,
  maxPly = 8,
  limit = 600,
): TreeNode {
  const next = clone(root)
  let added = 0

  const ensureChild = (node: TreeNode, uci: string) => {
    const existing = node.children.find((c) => c.uci === uci)
    if (existing) return existing
    const move = playUci(node.fen, uci)
    if (!move) return null
    const child: TreeNode = { san: move.san, uci: move.uci, fen: move.fen, children: [] }
    node.children.push(child)
    added++
    return child
  }

  const visit = (node: TreeNode, ply: number) => {
    if (ply >= maxPly || added >= limit) return
    if (turn(node.fen) === side) {
      if (!node.children.length) {
        const stats = lookup(node.fen)
        const top = stats?.moves.slice().sort((a, b) => b.games - a.games)[0]
        if (top) ensureChild(node, top.uci)
      }
      for (const child of node.children) visit(child, ply + 1)
      return
    }
    const stats = lookup(node.fen)
    if (!stats || !stats.total) return
    const sorted = [...stats.moves].sort((a, b) => b.games - a.games)
    let cum = 0
    for (const move of sorted) {
      if (cum / stats.total >= target || added >= limit) break
      cum += move.games
      const child = ensureChild(node, move.uci)
      if (!child) continue
      if (!child.children.length) {
        const replyStats = lookup(child.fen)
        const reply = replyStats?.moves.slice().sort((a, b) => b.games - a.games)[0]
        if (reply) ensureChild(child, reply.uci)
      }
      for (const reply of child.children) visit(reply, ply + 2)
    }
  }

  visit(next, 0)
  return next
}
