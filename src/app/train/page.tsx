'use client'

import {
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  Flame,
  Play,
  RotateCcw,
  Target,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Board, type BoardMove } from '@/components/Board'
import { Badge, Button, Card, Panel, Progress, Ring, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger, cx } from '@/components/kit'
import { accuracy, dueCount, streakDays } from '@/lib/analytics'
import { playUci, START_FEN, turn } from '@/lib/chess'
import { compact, pct, seconds } from '@/lib/format'
import { DAY } from '@/lib/srs'
import { lookup, useStats } from '@/lib/stats'
import { buildLineTasks, buildPlayoutTasks, buildReviewTasks, type Task } from '@/lib/trainer'
import type { Repertoire, Side } from '@/lib/types'
import { myPositions, sanPath } from '@/lib/tree'
import { useStore } from '@/store/store'

type Mode = 'review' | 'playout'
type Result = { task: Task; correct: boolean; ms: number }

export default function TrainPage() {
  return (
    <Suspense fallback={null}>
      <Train />
    </Suspense>
  )
}

function Train() {
  const repertoires = useStore((s) => s.repertoires)
  const cards = useStore((s) => s.cards)
  const attempts = useStore((s) => s.attempts)
  const newPerDay = useStore((s) => s.settings.newPerDay)
  const recordResult = useStore((s) => s.recordResult)
  const { state: statsState } = useStats()
  const search = useSearchParams()
  const router = useRouter()

  const initialRep = search.get('rep') ?? 'all'
  const lineParam = search.get('line')
  const [mode, setMode] = useState<Mode>('review')
  const [repId, setRepId] = useState(initialRep)
  const [phase, setPhase] = useState<'setup' | 'session' | 'summary'>(lineParam ? 'session' : 'setup')
  const [tasks, setTasks] = useState<Task[]>([])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [fen, setFen] = useState(START_FEN)
  const [solved, setSolved] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [wrong, setWrong] = useState<string | null>(null)
  const [hint, setHint] = useState(false)
  const [lineLabel, setLineLabel] = useState<string | null>(null)
  const [lineMode, setLineMode] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [noTasks, setNoTasks] = useState(false)
  const t0 = useRef(performance.now())
  const lock = useRef(false)
  const autoStarted = useRef(false)
  const now = Date.now()

  const task = tasks[index]
  const orientation: Side = task ? turn(task.fen) : 'white'
  const rep = task ? repertoires.find((r) => r.id === task.repId) : undefined
  const lastUci = task && task.path.length ? task.path[task.path.length - 1] : null
  const lineSans = rep && task ? sanPath(rep.root, task.path) : []

  const start = (list: Task[], label?: string) => {
    if (!list.length) {
      setNoTasks(true)
      return
    }
    setNoTasks(false)
    setTasks(list)
    setResults([])
    setIndex(0)
    setPhase('session')
    setStartedAt(Date.now())
    setLineLabel(label ?? null)
    loadTask(list[0])
  }

  const loadTask = (next: Task) => {
    setFen(next.fen)
    setSolved(false)
    setAttempted(false)
    setWrong(null)
    setHint(false)
    lock.current = false
    t0.current = performance.now()
  }

  const beginReview = () => {
    setLineMode(false)
    const reps = repId === 'all' ? repertoires : repertoires.filter((r) => r.id === repId)
    start(buildReviewTasks(reps, cards, Date.now(), newPerDay), 'Repertoire review')
  }

  const beginPlayout = () => {
    setLineMode(false)
    const rep = repertoires.find((r) => r.id === repId)
    if (!rep) return
    start(buildPlayoutTasks(rep, lookup), 'Popular line playout')
  }

  useEffect(() => {
    if (!lineParam || autoStarted.current) return
    autoStarted.current = true
    const side: Side = search.get('side') === 'black' ? 'black' : 'white'
    const name = search.get('name') ?? 'Line drill'
    setLineMode(true)
    start(buildLineTasks(search.get('rep') ?? '', side, lineParam.split(','), name), `${name} · ${side}`)
    router.replace('/train')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = tasks[index]

  const record = (ok: boolean) => {
    if (!current) return
    const ms = Math.round(performance.now() - t0.current)
    recordResult({
      repId: current.repId,
      epd: current.fen.split(' ').slice(0, 4).join(' '),
      correct: ok,
      ms,
      name: current.name,
      grade: !lineMode,
    })
    setResults((r) => [...r, { task: current, correct: ok, ms }])
  }

  const advance = () => {
    if (lock.current) return
    lock.current = true
    if (index + 1 >= tasks.length) {
      setPhase('summary')
      return
    }
    setIndex(index + 1)
    loadTask(tasks[index + 1])
  }

  const onMove = (move: BoardMove) => {
    if (!current || solved) return
    if (current.expected.some((e) => e.uci === move.uci)) {
      const after = playUci(fen, move.uci)
      if (after) setFen(after.fen)
      setSolved(true)
      setWrong(null)
      if (!attempted) record(true)
    } else {
      setWrong(move.san)
      if (!attempted) {
        setAttempted(true)
        record(false)
      }
    }
  }

  const showHint = () => {
    if (!current || solved) return
    setHint(true)
  }

  useEffect(() => {
    if (!solved) return
    const id = setTimeout(advance, 900)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, index])

  useEffect(() => {
    if (phase !== 'session') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        showHint()
      }
      if (e.key === 'Enter' && solved) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, solved, index, tasks])

  const arrows = useMemo(() => {
    if (!current || solved) return []
    if (!wrong && !hint) return []
    return current.expected.map((e) => ({
      startSquare: e.uci.slice(0, 2),
      endSquare: e.uci.slice(2, 4),
      color: 'rgba(63,185,80,0.9)',
    }))
  }, [current, solved, wrong, hint])

  const today = attempts.filter((a) => a.ts >= now - DAY)
  const correction = accuracy(today)
  const due = dueCount(cards, now)
  const sessionCorrect = results.filter((r) => r.correct).length

  if (phase === 'summary') {
    const missed = results.filter((r) => !r.correct)
    const acc = results.length ? results.filter((r) => r.correct).length / results.length : 0
    const avg = results.length ? results.reduce((n, r) => n + r.ms, 0) / results.length : 0
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Session complete</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
            {acc >= 0.9 ? 'Sharp session.' : acc >= 0.7 ? 'Solid work.' : 'Good reps. Review the misses.'}
          </h2>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <Ring value={acc} size={92} stroke={8} label={pct(acc)} />
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Positions" value={String(results.length)} />
              <Stat label="Correct" value={String(results.filter((r) => r.correct).length)} />
              <Stat label="Missed" value={String(missed.length)} />
              <Stat label="Avg time" value={seconds(Math.round(avg))} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setLineMode(false)
                setResults([])
                setPhase('setup')
              }}
            >
              <RotateCcw size={14} />
              Train again
            </Button>
            <Link href="/">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
            <Link href="/progress">
              <Button variant="ghost">View progress</Button>
            </Link>
          </div>
        </Card>

        {missed.length > 0 && (
          <Panel title="Missed positions" subtitle="These cards return soon">
            <div className="divide-y divide-line">
              {missed.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <X size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.task.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.task.expected.map((e) => e.san).join(' or ')}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular">{seconds(r.ms)}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    )
  }

  if (phase === 'session' && current) {
    const total = tasks.length
    const accuracySoFar = results.length ? sessionCorrect / results.length : 0
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone="brand">{lineLabel ?? 'Review'}</Badge>
              <span className="text-[11px] text-muted-foreground">
                {index + 1} / {total}
              </span>
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold">{current.name}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="neutral">{turn(current.fen) === 'white' ? 'White to move' : 'Black to move'}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setPhase('setup')}>
              Exit
            </Button>
          </div>
        </div>
        <Progress value={(index + (solved ? 1 : 0)) / total} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,560px)_1fr]">
          <div className="space-y-3">
            <Board
              fen={fen}
              orientation={orientation}
              onMove={onMove}
              lastMove={lastUci ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) } : null}
              arrows={arrows}
              interactive={!solved}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {current.path.length ? `Decision at ply ${current.path.length + 1}` : 'First move'} ·{' '}
                {current.expected.length > 1
                  ? `${current.expected.length} accepted answers`
                  : 'one accepted answer'}
              </p>
              <Button variant="ghost" size="sm" onClick={showHint} disabled={solved || hint}>
                <CircleHelp size={13} />
                Hint <kbd className="rounded border border-line px-1 text-[10px]">space</kbd>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card
              className={cx(
                'p-4 transition-colors',
                solved ? 'border-brand/40 bg-brand-soft/40' : wrong ? 'border-danger/40 bg-danger/5' : '',
              )}
            >
              {solved ? (
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <Check size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Correct</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {attempted ? 'Recovered after a miss. This card is scheduled soon.' : 'Added to your schedule.'}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" className="ml-auto" onClick={advance}>
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              ) : wrong ? (
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                    <X size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Not in your repertoire</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      You played <span className="font-mono">{wrong}</span>. Expected{' '}
                      <span className="font-mono font-medium text-ink">
                        {current.expected.map((e) => e.san).join(' or ')}
                      </span>
                      .
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Play the expected move to continue.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your move</p>
                  <p className="mt-1 text-sm font-medium">
                    Play the move from your repertoire for this position.
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                    Drag a piece or click a square twice. No move is penalised until you commit.
                  </p>
                </div>
              )}
            </Card>

            <Panel title="Session" subtitle={`${sessionCorrect} correct of ${results.length} graded`}>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Accuracy</dt>
                  <dd className="mt-0.5 text-base font-semibold tabular">
                    {results.length ? pct(accuracySoFar) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Remaining</dt>
                  <dd className="mt-0.5 text-base font-semibold tabular">{total - index - 1}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Elapsed</dt>
                  <dd className="mt-0.5 text-base font-semibold tabular">
                    {Math.max(1, Math.round((now - startedAt) / 60000))}m
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due today</dt>
                  <dd className="mt-0.5 text-base font-semibold tabular">{due}</dd>
                </div>
              </dl>
              <div className="mt-3 border-t border-line pt-3 text-[11px] leading-5 text-muted-foreground">
                {hint && !solved && (
                  <p className="flex items-center gap-1.5 text-warn">
                    <Eye size={12} /> Hint shown. Make the move.
                  </p>
                )}
                {!hint && !solved && (
                  <p className="flex items-center gap-1.5">
                    <CircleHelp size={12} /> Wrong moves show the expected arrow.
                  </p>
                )}
                {solved && <p className="text-brand">Advancing automatically…</p>}
              </div>
            </Panel>

            {rep && lineSans.length > 0 && (
              <Panel title="Line so far" subtitle={rep.name} bodyClassName="p-3">
                <div className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono text-[11px]">
                  {lineSans.map((san, i) => (
                    <span key={i} className="text-muted-foreground">
                      {i % 2 === 0 && <span className="mr-0.5 text-[10px] text-muted-foreground/60">{i / 2 + 1}.</span>}
                      <span className="text-ink">{san}</span>
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {rep && (
              <Link href={`/repertoire/${rep.id}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  <BookOpen size={13} /> Open {rep.name}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const statsList = repId === 'all' ? repertoires : repertoires.filter((r) => r.id === repId)
  const dueSelected = Object.values(cards).filter(
    (c) => c.lastReviewed > 0 && c.due <= now && statsList.some((r) => r.id === c.repId),
  ).length
  const newSelected = statsList.reduce((n, r) => {
    const positions = myPositionsSafe(r)
    return n + positions.filter((p) => !cards[`${r.id}:${p}`]).length
  }, 0)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Trainer</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Answer with the moves you prepared. Missed positions return sooner.
          </p>
        </div>

        <Panel title="Session setup" subtitle="Review due cards or play out a popular line">
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="review">Review</TabsTrigger>
                <TabsTrigger value="playout">Play out</TabsTrigger>
              </TabsList>
            </Tabs>
            <div>
              <label htmlFor="train-rep" className="mb-1.5 block text-xs font-medium">
                Repertoire
              </label>
              <Select value={repId} onValueChange={setRepId}>
                <SelectTrigger id="train-rep" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All repertoires</SelectItem>
                  {repertoires.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.side}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {mode === 'review'
                  ? `${dueSelected} due · up to ${Math.min(newPerDay, newSelected)} new cards`
                  : 'One random line, weighted by how often each move is played.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={mode === 'review' ? beginReview : beginPlayout}
              disabled={!repertoires.length || (mode === 'playout' && repId === 'all')}
            >
              <Play size={15} />
              {mode === 'review' ? 'Start review' : 'Play a line'}
            </Button>
            {mode === 'playout' && repId === 'all' && (
              <p className="text-center text-[11px] text-warn">Pick one repertoire for commentated playout.</p>
            )}
            {noTasks && (
              <p className="rounded-lg border border-brand/30 bg-brand-soft/50 px-3 py-2 text-center text-[11px] text-brand">
                Nothing is due. New cards are capped at {newPerDay} per session — add more lines to keep going.
              </p>
            )}
            {!repertoires.length && (
              <p className="text-center text-[11px] text-muted-foreground">
                Create a repertoire first.{' '}
                <Link href="/repertoire" className="underline">
                  Open repertoires
                </Link>
              </p>
            )}
          </div>
        </Panel>

        <Panel title="How it works">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: <Target size={15} />, title: 'Your move', text: 'The board stops at each of your decision points.' },
              { icon: <Eye size={15} />, title: 'Feedback', text: 'A miss shows the expected move. You replay it.' },
              { icon: <Flame size={15} />, title: 'Scheduling', text: 'Correct cards move out. Misses come back in 10 minutes.' },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-line bg-panel2/40 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  {item.icon}
                </span>
                <p className="mt-2 text-xs font-medium">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Today" subtitle="Across all repertoires">
          <div className="flex items-center gap-4">
            <Ring value={today.length ? correction : 0} size={68} stroke={6} label={today.length ? pct(correction) : '—'} />
            <div className="text-xs">
              <p className="font-medium">
                {today.length} reviews
                <span className="ml-1 font-normal text-muted-foreground">today</span>
              </p>
              <p className="mt-1 text-muted-foreground">{due} cards due now</p>
              <p className="mt-0.5 text-muted-foreground">{streakDays(attempts, now)} day streak</p>
            </div>
          </div>
        </Panel>
        <Panel title="Data" subtitle="Snapshot in use">
          <p className="text-[11px] leading-5 text-muted-foreground">
            {statsState === 'ready'
              ? 'Popularity is loaded. New repertoires pull their coverage numbers from the bundled Lichess sample.'
              : statsState === 'error'
                ? 'The popularity file did not load. Building and training still work from your own tree.'
                : 'Loading popularity data…'}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px]">
            <span className="flex h-6 items-center rounded-md border border-line bg-panel2 px-2">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
              Lichess sample
            </span>
            <span className="text-muted-foreground">{compact(attempts.length)} reviews</span>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular">{value}</p>
    </div>
  )
}

function myPositionsSafe(rep: Repertoire) {
  return myPositions(rep.root, rep.side).map((p) => p.node.fen.split(' ').slice(0, 4).join(' '))
}
