import { Check, Plus } from 'lucide-react'
import { compact, pct } from '@/lib/format'
import type { MoveStat } from '@/lib/stats'
import { WdlBar, cx } from '@/components/kit'

export function MoveStats({
  moves,
  covered,
  onPick,
  action = 'add',
}: {
  moves: MoveStat[]
  covered?: Set<string>
  onPick: (move: MoveStat) => void
  action?: 'add' | 'open'
}) {
  if (!moves.length) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No popularity data for this position.</p>
  }
  return (
    <div className="space-y-0.5">
      {moves.map((move) => {
        const isCovered = covered?.has(move.uci)
        return (
          <button
            key={move.uci}
            onClick={() => onPick(move)}
            className="group relative flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-panel2"
            title={`${move.san}: ${compact(move.games)} games · White ${pct(
              move.w / Math.max(1, move.games),
            )} · Draw ${pct(move.d / Math.max(1, move.games))} · Black ${pct(move.b / Math.max(1, move.games))}`}
          >
            <span
              className="absolute inset-y-0 left-0 bg-brand/10 transition-[width] duration-500"
              style={{ width: `${move.share * 100}%` }}
            />
            <span
              className={cx(
                'relative w-14 shrink-0 font-mono text-[12px] font-medium',
                isCovered ? 'text-brand' : 'text-ink',
              )}
            >
              {move.san}
            </span>
            <WdlBar w={move.w} d={move.d} b={move.b} className="relative w-12 shrink-0" />
            <span className="relative ml-auto w-10 text-right text-[11px] text-muted-foreground tabular">
              {pct(move.share)}
            </span>
            <span className="relative w-12 text-right text-[11px] text-muted-foreground tabular">{compact(move.games)}</span>
            <span className="relative ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-panel2 group-hover:text-ink">
              {isCovered ? <Check size={12} className="text-brand" /> : action === 'add' ? <Plus size={13} /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
