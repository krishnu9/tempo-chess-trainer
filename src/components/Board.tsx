import { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow } from 'react-chessboard'
import { legalMoves } from '@/lib/chess'
import type { Side } from '@/lib/types'

export type BoardMove = {
  from: string
  to: string
  san: string
  uci: string
  promotion?: string
}

const themes = {
  green: { light: '#ebecd0', dark: '#739552' },
  blue: { light: '#dee3e6', dark: '#8ca2b1' },
} as const

export function Board({
  fen,
  orientation,
  onMove,
  lastMove,
  arrows,
  interactive = true,
  boardTheme = 'green',
}: {
  fen: string
  orientation: Side
  onMove?: (move: BoardMove) => void
  lastMove?: { from: string; to: string } | null
  arrows?: Arrow[]
  interactive?: boolean
  boardTheme?: keyof typeof themes
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const moves = useMemo(() => legalMoves(fen), [fen])
  useEffect(() => setSelected(null), [fen])

  const targets = selected ? moves.filter((m) => m.from === selected) : []

  const tryMove = (from: string, to: string) => {
    const candidates = moves.filter((m) => m.from === from && m.to === to)
    const move = candidates.find((m) => m.promotion === 'q') ?? candidates[0]
    if (!move) return false
    onMove?.({
      from,
      to,
      san: move.san,
      uci: from + to + (move.promotion ?? ''),
      promotion: move.promotion,
    })
    setSelected(null)
    return true
  }

  const squareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'rgba(246, 246, 105, 0.32)' }
    squareStyles[lastMove.to] = { backgroundColor: 'rgba(246, 246, 105, 0.42)' }
  }
  if (selected) {
    squareStyles[selected] = {
      backgroundColor: 'rgba(63, 185, 80, 0.35)',
      boxShadow: 'inset 0 0 0 2px var(--brand)',
    }
  }
  for (const target of targets) {
    squareStyles[target.to] = {
      ...squareStyles[target.to],
      backgroundImage: target.captured
        ? 'radial-gradient(circle, transparent 55%, rgba(0,0,0,0.25) 56%, rgba(0,0,0,0.25) 62%, transparent 63%)'
        : 'radial-gradient(circle, rgba(0,0,0,0.22) 17%, transparent 18%)',
    }
  }

  return (
    <div className="board-frame aspect-square w-full select-none">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: interactive,
          allowDrawingArrows: false,
          arrows: arrows ?? [],
          animationDurationInMs: 180,
          showNotation: true,
          darkSquareStyle: { backgroundColor: themes[boardTheme].dark },
          lightSquareStyle: { backgroundColor: themes[boardTheme].light },
          darkSquareNotationStyle: { color: themes[boardTheme].light, opacity: 0.7, fontSize: 9 },
          lightSquareNotationStyle: { color: themes[boardTheme].dark, opacity: 0.8, fontSize: 9 },
          squareStyles,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            interactive && targetSquare ? tryMove(sourceSquare, targetSquare) : false,
          onSquareClick: ({ square, piece }) => {
            if (!interactive) return
            if (selected) {
              if (tryMove(selected, square)) return
            }
            const own = piece && moves.some((m) => m.from === square)
            setSelected(own ? square : null)
          },
        }}
      />
    </div>
  )
}
