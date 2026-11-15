'use client'

import { BookOpen, Plus, Search, Swords, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Board } from '@/components/Board'
import { Badge, Button, Card, Input, Modal, Panel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cx } from '@/components/kit'
import { playSan, START_FEN } from '@/lib/chess'
import { ECO_LETTERS, OPENINGS, searchOpenings, type Opening } from '@/lib/openings'
import type { Side } from '@/lib/types'
import { useStore } from '@/store/store'

const keyOf = (o: Opening) => `${o.eco}|${o.sans.join(' ')}`

const DEFAULT =
  OPENINGS.find((o) => o.name === 'Sicilian Defense: Najdorf Variation') ??
  OPENINGS.find((o) => o.name === 'Italian Game') ??
  OPENINGS[0]

export default function Openings() {
  const router = useRouter()
  const repertoires = useStore((s) => s.repertoires)
  const addLineTo = useStore((s) => s.addLineTo)
  const addLinesTo = useStore((s) => s.addLinesTo)

  const [query, setQuery] = useState('')
  const [letter, setLetter] = useState<string>('All')
  const [selected, setSelected] = useState<Opening>(DEFAULT)
  const [ply, setPly] = useState(DEFAULT.sans.length)
  const [visible, setVisible] = useState(80)
  const [addOpen, setAddOpen] = useState(false)
  const [target, setTarget] = useState(repertoires[0]?.id ?? '')
  const [added, setAdded] = useState<{ name: string; count: number } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState(false)

  const results = useMemo(() => {
    const base = searchOpenings(query, null)
    return letter === 'All' ? base : base.filter((o) => o.eco.startsWith(letter))
  }, [query, letter])

  const byKey = useMemo(() => new Map(OPENINGS.map((o) => [keyOf(o), o])), [])
  const pickedLines = useMemo(
    () => [...picked].map((key) => byKey.get(key)?.sans).filter((sans): sans is string[] => !!sans),
    [picked, byKey],
  )

  const togglePick = (key: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const positions = useMemo(() => {
    let fen = START_FEN
    const out = [{ fen, last: null as { from: string; to: string } | null, sans: [] as string[] }]
    for (const san of selected.sans) {
      const move = playSan(fen, san)
      if (!move) break
      fen = move.fen
      out.push({
        fen,
        last: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
        sans: out[out.length - 1].sans.concat(san),
      })
    }
    return out
  }, [selected])

  const current = positions[Math.min(ply, positions.length - 1)]

  const choose = (opening: Opening) => {
    setSelected(opening)
    setPly(opening.sans.length)
    setAdded(null)
  }

  const practice = (side: Side) => {
    const query = new URLSearchParams({ line: selected.sans.join(','), side, name: selected.name })
    router.push(`/train?${query}`)
  }

  const startAdd = (all = false) => {
    setTarget(repertoires[0]?.id ?? '')
    setAdded(null)
    setBulk(all)
    setAddOpen(true)
  }

  const confirmAdd = () => {
    if (!target) return
    const name = repertoires.find((r) => r.id === target)?.name ?? 'repertoire'
    if (bulk && pickedLines.length) {
      const count = addLinesTo(target, pickedLines)
      setAdded({ name, count })
      setPicked(new Set())
    } else {
      addLineTo(target, selected.sans)
      setAdded({ name, count: 1 })
    }
    setAddOpen(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden">
        <div className="space-y-3 border-b border-line p-4">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setVisible(80)
                setPicked(new Set())
              }}
              placeholder="Search openings, ECO codes…"
              className="pl-9"
              aria-label="Search openings"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {['All', ...ECO_LETTERS].map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLetter(l)
                  setVisible(80)
                  setPicked(new Set())
                }}
                className={cx(
                  'h-7 min-w-8 rounded-md px-2 text-[11px] font-medium transition-colors',
                  letter === l ? 'bg-brand-soft text-brand' : 'text-muted-foreground hover:bg-panel2 hover:text-ink',
                )}
              >
                {l}
              </button>
            ))}
            <span className="ml-auto self-center text-[11px] text-muted-foreground">{results.length} lines</span>
          </div>
        </div>
        {picked.size > 0 && (
          <div className="flex items-center gap-2 border-b border-line bg-brand-soft/50 px-4 py-2">
            <span className="text-[11px] font-medium">{picked.size} selected</span>
            <button
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-ink"
              onClick={() => setPicked(new Set())}
            >
              <X size={11} /> clear
            </button>
            <Button variant="primary" size="sm" className="ml-auto" onClick={() => startAdd(true)}>
              Add lines
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {results.slice(0, visible).map((opening) => {
            const active = keyOf(opening) === keyOf(selected)
            const key = keyOf(opening)
            return (
              <div
                key={key}
                className={cx(
                  'flex items-start gap-2.5 border-b border-line/60 px-4 py-2.5 transition-colors',
                  active ? 'bg-brand-soft/60' : 'hover:bg-panel2',
                )}
              >
                <input
                  type="checkbox"
                  checked={picked.has(key)}
                  onChange={() => togglePick(key)}
                  aria-label={`Select ${opening.name}`}
                  className="mt-1.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--brand)]"
                />
                <button onClick={() => choose(opening)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
                  <Badge tone={active ? 'brand' : 'neutral'} className="mt-0.5 shrink-0">
                    {opening.eco}
                  </Badge>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{opening.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {opening.sans.slice(0, 8).join(' ')}
                      {opening.sans.length > 8 ? '…' : ''}
                    </span>
                  </span>
                </button>
              </div>
            )
          })}
          {visible < results.length && (
            <div className="p-3">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setVisible((v) => v + 120)}>
                Load more · {results.length - visible} left
              </Button>
            </div>
          )}
          {!results.length && (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">No lines match “{query}”.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Board
            fen={current.fen}
            orientation="white"
            lastMove={current.last}
            interactive={false}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Button variant="subtle" size="sm" onClick={() => setPly(0)}>
                Start
              </Button>
              <Button variant="subtle" size="sm" onClick={() => setPly(Math.max(0, ply - 1))}>
                ←
              </Button>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setPly(Math.min(positions.length - 1, ply + 1))}
              >
                →
              </Button>
              <Button variant="subtle" size="sm" onClick={() => setPly(positions.length - 1)}>
                End
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">
              ply {ply}/{selected.sans.length}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{selected.eco}</Badge>
                  <span className="text-[11px] text-muted-foreground">{selected.family}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold leading-6">{selected.name}</h2>
              </div>
              <Swords size={18} className="mt-1 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Line</p>
              <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-1 gap-y-0.5 text-[13px]">
                {Array.from({ length: Math.ceil(selected.sans.length / 2) }, (_, i) => (
                  <div key={i} className="contents">
                    <span className="py-0.5 text-right text-[11px] text-muted-foreground tabular">{i + 1}.</span>
                    {[0, 1].map((offset) => {
                      const index = i * 2 + offset
                      const san = selected.sans[index]
                      if (!san) return <span key={offset} />
                      return (
                        <button
                          key={offset}
                          onClick={() => setPly(index + 1)}
                          className={cx(
                            'rounded px-1.5 py-0.5 text-left font-mono text-[12px] transition-colors hover:bg-panel2',
                            ply === index + 1 ? 'bg-brand-soft text-brand' : 'text-ink',
                          )}
                        >
                          {san}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => practice('white')}>
                Practise as White
              </Button>
              <Button variant="outline" size="sm" onClick={() => practice('black')}>
                Practise as Black
              </Button>
            </div>
            <Button variant="primary" className="mt-2 w-full" onClick={() => startAdd(false)}>
              <Plus size={14} />
              Add to repertoire
            </Button>
            {added && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand">
                <BookOpen size={12} /> Added {added.count} {added.count === 1 ? 'line' : 'lines'} to {added.name}.
                <Link href="/repertoire" className="underline">
                  Open
                </Link>
              </p>
            )}
          </Card>

          <Panel title="About this line" subtitle="Opening tree snapshot">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">ECO code</dt>
                <dd className="mt-0.5 font-medium tabular">{selected.eco}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Family</dt>
                <dd className="mt-0.5 font-medium">{selected.family}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Moves</dt>
                <dd className="mt-0.5 font-medium tabular">{selected.sans.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="mt-0.5 font-medium">Lichess openings</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-5 text-muted-foreground">
              Import this line into a repertoire to train it. Tempo treats your side's moves as the answers and the
              opponent's moves as the branches to cover.
            </p>
          </Panel>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={bulk ? `Add ${pickedLines.length} lines` : 'Add line to repertoire'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmAdd} disabled={!target}>
              {bulk ? `Add ${pickedLines.length} lines` : `Add ${selected.sans.length} moves`}
            </Button>
          </>
        }
      >
        {repertoires.length ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="rep-target" className="mb-1.5 block text-xs font-medium">
                Repertoire
              </label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="rep-target" className="w-full">
                  <SelectValue placeholder="Choose a repertoire" />
                </SelectTrigger>
                <SelectContent>
                  {repertoires.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.side}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">
              {bulk
                ? `${pickedLines.length} filtered lines are merged into the tree. Existing moves stay. Large imports can take a moment to save.`
                : 'The line is merged into the tree. Existing moves stay. You can switch sides inside the builder at any time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Create a repertoire first.</p>
            <Link href="/repertoire">
              <Button variant="primary">Go to repertoires</Button>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
