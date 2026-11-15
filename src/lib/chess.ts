import { Chess } from 'chess.js'
import type { Side } from './types'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const epd = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

export const turn = (fen: string): Side => (fen.split(' ')[1] === 'w' ? 'white' : 'black')

export const other = (side: Side): Side => (side === 'white' ? 'black' : 'white')

export function parseSans(text: string): string[] {
  return text
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter(
      (t) =>
        t &&
        !/^\d+\.+$/.test(t) &&
        !t.startsWith('$') &&
        !['1-0', '0-1', '1/2-1/2', '*'].includes(t),
    )
}

export type MoveResult = { san: string; uci: string; fen: string }

export function playSan(fen: string, san: string): MoveResult | null {
  try {
    const chess = new Chess(fen)
    const m = chess.move(san)
    return { san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: chess.fen() }
  } catch {
    return null
  }
}

export function playUci(fen: string, uci: string): MoveResult | null {
  try {
    const chess = new Chess(fen)
    const m = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || undefined,
    })
    return { san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: chess.fen() }
  } catch {
    return null
  }
}

export function legalMoves(fen: string) {
  try {
    return new Chess(fen).moves({ verbose: true })
  } catch {
    return []
  }
}

export function replay(sans: string[]): MoveResult[] {
  const out: MoveResult[] = []
  let fen = START_FEN
  for (const san of sans) {
    const move = playSan(fen, san)
    if (!move) break
    out.push(move)
    fen = move.fen
  }
  return out
}

export function uciPath(sans: string[]): string[] {
  return replay(sans).map((m) => m.uci)
}
