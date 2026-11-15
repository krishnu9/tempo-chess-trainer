'use client'

import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  FlipVertical2,
  Pencil,
  RotateCcw,
  Target,
  Trash2,
  Zap,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Board, type BoardMove } from '@/components/Board'
import { MoveStats } from '@/components/MoveStats'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Panel,
  Progress,
  Ring,
  Skeleton,
  cx,
} from '@/components/kit'
import { compact, pct } from '@/lib/format'
import { other, turn } from '@/lib/chess'
import { identify } from '@/lib/openings'
import { getStats, useStats } from '@/lib/stats'
import { countMoves, countNodes, getNode, myPositions, nodeCoverage, sanPath } from '@/lib/tree'
import type { TreeNode } from '@/lib/types'
import { coverageOf, useStore } from '@/store/store'

function TreeRow({
  active,
  depth,
  ply,
  number,
  san,
  isMine,
  onSelect,
  onDelete,
}: {
  active: boolean
  depth: number
  ply: number
  number: number
  san: string
  isMine: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  return (
    <div
      ref={ref}
      className={cx(
        'group flex items-center gap-1 rounded-md pr-1 text-[12px] transition-colors',
        active ? 'bg-brand-soft text-ink' : 'hover:bg-panel2',
      )}
      style={{ paddingLeft: 6 + depth * 12 }}
    >
      <span className="w-7 shrink-0 text-right text-[10px] text-muted-foreground tabular">
        {ply % 2 === 1 ? `${number}.` : `${number}…`}
      </span>
      <button onClick={onSelect} className="flex flex-1 items-center gap-1.5 py-1 text-left">
        {isMine && <span className="h-1 w-1 rounded-full bg-brand" />}
        <span className={cx('font-mono', isMine ? 'font-semibold text-ink' : 'text-muted-foreground')}>{san}</span>
      </button>
      <button
        className="invisible flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger group-hover:visible"
        onClick={onDelete}
        aria-label={`Delete ${san} and its continuation`}
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

function TreeBranch({
  node,
  path,
  depth,
  mySide,
  selectedPath,
  onSelect,
  onDelete,
}: {
  node: TreeNode
  path: string[]
  depth: number
  mySide: 'white' | 'black'
  selectedPath: string[]
  onSelect: (path: string[]) => void
  onDelete: (path: string[], san: string) => void
}) {
  return (
    <>
      {node.children.map((child) => {
        const childPath = [...path, child.uci]
        const isMine = turn(child.fen) !== mySide
        const active = selectedPath.join(' ') === childPath.join(' ')
        const ply = childPath.length
        const number = Math.ceil(ply / 2)
        return (
          <Fragment key={child.uci}>
            <TreeRow
              active={active}
              depth={depth}
              ply={ply}
              number={number}
              san={child.san}
              isMine={isMine}
              onSelect={() => onSelect(childPath)}
              onDelete={() => onDelete(childPath, child.san)}
            />
            <TreeBranch
              node={child}
              path={childPath}
              depth={depth + 1}
              mySide={mySide}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          </Fragment>
        )
      })}
    </>
  )
}

export default function RepertoireDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const repertoires = useStore((s) => s.repertoires)
  const addMoveTo = useStore((s) => s.addMoveTo)
  const removeNodeAt = useStore((s) => s.removeNodeAt)
  const renameRepertoire = useStore((s) => s.renameRepertoire)
  const draft = useStore((s) => s.draft)
  const { state: statsState, error: statsError, retry } = useStats()

  const rep = repertoires.find((r) => r.id === id)
  const [path, setPath] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ path: string[]; san: string } | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [draftAdded, setDraftAdded] = useState<number | null>(null)

  useEffect(() => {
    setPath([])
    setFlipped(false)
  }, [id])

  const node = rep ? (getNode(rep.root, path) ?? rep.root) : null
  const sans = rep ? sanPath(rep.root, path) : []
  const name = identify(sans) ?? (rep ? rep.name : '')
  const coverage = useMemo(() => (rep ? coverageOf(rep) : null), [rep, statsState])
  const stats = node ? getStats(node.fen) : null
  const myTurn = rep && node ? turn(node.fen) === rep.side : false
  const covered = useMemo(() => new Set(node?.children.map((c) => c.uci) ?? []), [node])
  const nodeCov = rep && node ? nodeCoverage(node, rep.side, (fen) => {
    const s = getStats(fen)
    return s ? { total: s.total, moves: s.moves.map((m) => ({ uci: m.uci, games: m.games })) } : null
  }) : null
  const lastMove = path.length ? node?.uci : null

  if (!rep || !node) {
    return (
      <Card>
        <EmptyState
          icon={<Target size={20} />}
          title="Repertoire not found"
          description="It may have been deleted. Open the list and pick another one."
          action={
            <Link href="/repertoire">
              <Button variant="primary">Back to repertoires</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const move = (m: BoardMove) => {
    const next = addMoveTo(rep.id, path, m.san)
    if (next) setPath(next)
  }

  const pick = (uci: string) => {
    const child = node.children.find((c) => c.uci === uci)
    if (child) {
      setPath([...path, uci])
      return
    }
    const statsMove = stats?.moves.find((m) => m.uci === uci)
    if (!statsMove) return
    const next = addMoveTo(rep.id, path, statsMove.san)
    if (next) setPath(next)
  }

  const trainLine = () => {
    const query = new URLSearchParams({
      line: sans.join(','),
      side: rep.side,
      name: name || rep.name,
      rep: rep.id,
    })
    router.push(`/train?${query}`)
  }

  const doDraft = () => {
    const added = draft(rep.id)
    setDraftAdded(added)
    setDraftOpen(false)
    setPath([])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/repertoire">
          <Button variant="ghost" size="icon" aria-label="Back to repertoires">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-tight">{rep.name}</h2>
            <Badge tone={rep.side === 'white' ? 'neutral' : 'info'}>{rep.side}</Badge>
            {draftAdded !== null && <Badge tone="brand">+{draftAdded} positions drafted</Badge>}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {countNodes(rep.root) - 1} positions · {countMoves(rep.root)} moves ·{' '}
            {myPositions(rep.root, rep.side).length} decision points
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNameDraft(rep.name)
              setRenameOpen(true)
            }}
          >
            <Pencil size={13} />
            Rename
          </Button>
          <Link href={`/train?rep=${rep.id}`}>
            <Button variant="primary" size="sm">
              <Target size={14} />
              Train repertoire
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,520px)_minmax(260px,1fr)_350px]">
        <div className="order-1 space-y-3">
          <Board
            fen={node.fen}
            orientation={flipped ? other(rep.side) : rep.side}
            onMove={move}
            lastMove={lastMove ? { from: lastMove.slice(0, 2), to: lastMove.slice(2, 4) } : null}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="subtle" size="sm" onClick={() => setPath(path.slice(0, -1))} disabled={!path.length}>
              <ChevronLeft size={13} /> Back
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setPath([])} disabled={!path.length}>
              <RotateCcw size={13} /> Start
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setFlipped((f) => !f)}>
              <FlipVertical2 size={13} /> Flip
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={trainLine} disabled={!sans.length}>
              <Target size={13} />
              Train this line
            </Button>
          </div>
          <div className="rounded-lg border border-line bg-panel px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[12px]">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Line</span>
              {sans.length === 0 && <span className="text-muted-foreground">Starting position</span>}
              {sans.map((san, i) => (
                <button
                  key={i}
                  onClick={() => setPath(path.slice(0, i + 1))}
                  className={cx(
                    'rounded px-0.5 font-mono text-[12px] transition-colors hover:bg-panel2',
                    i === sans.length - 1 ? 'font-semibold text-ink' : 'text-muted-foreground',
                  )}
                >
                  {i % 2 === 0 && <span className="mr-0.5 text-[10px] text-muted-foreground/70">{i / 2 + 1}.</span>}
                  {san}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="order-3 flex max-h-[420px] flex-col overflow-hidden xl:order-2 xl:max-h-[calc(100vh-11rem)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <h3 className="text-[13px] font-semibold">Move tree</h3>
            <button className="text-[11px] text-muted-foreground hover:text-ink" onClick={() => setPath([])}>
              root
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {rep.root.children.length ? (
              <TreeBranch
                node={rep.root}
                path={[]}
                depth={0}
                mySide={rep.side}
                selectedPath={path}
                onSelect={setPath}
                onDelete={(p, san) => setDeleteTarget({ path: p, san })}
              />
            ) : (
              <p className="px-3 py-8 text-center text-[11px] leading-5 text-muted-foreground">
                Empty tree. Play a move on the board or import a line from the library.
              </p>
            )}
          </div>
        </Card>

        <div className="order-2 space-y-4 xl:order-3">
          {statsState === 'error' && (
            <Card className="border-danger/30 bg-danger/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
                <div className="text-[11px] leading-5">
                  <p className="font-medium text-ink">Popularity data unavailable</p>
                  <p className="text-muted-foreground">{statsError}</p>
                  <button className="mt-1 underline" onClick={retry}>
                    Try again
                  </button>
                </div>
              </div>
            </Card>
          )}

          <Panel
            title={myTurn ? 'Your candidates' : 'Opponent moves'}
            subtitle={myTurn ? 'Popular replies in this position' : 'Most common moves to cover'}
            action={
              stats ? (
                <Badge tone="neutral">{compact(stats.total)} games</Badge>
              ) : (
                <Skeleton className="h-5 w-16" />
              )
            }
            bodyClassName="p-2"
          >
            {statsState === 'loading' ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : stats ? (
              <MoveStats moves={stats.moves.slice(0, 10)} covered={covered} onPick={(m) => pick(m.uci)} action={myTurn ? 'add' : 'open'} />
            ) : (
              <p className="px-2 py-6 text-center text-[11px] leading-5 text-muted-foreground">
                No games reached this position in the snapshot. You can still add moves on the board.
              </p>
            )}
          </Panel>

          <Panel title="Coverage" subtitle={name || 'Starting position'}>
            <div className="flex items-center gap-4">
              <Ring value={coverage?.pct ?? 0} size={68} stroke={6} />
              <div className="min-w-0">
                <p className="text-sm font-medium">All opponent branches</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {coverage && coverage.total
                    ? 'Weighted across opponent branch points'
                    : 'Waiting for popularity data'}
                </p>
                <Progress className="mt-2" value={coverage?.pct ?? 0} />
              </div>
            </div>
            {!myTurn && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-panel2/40 px-3 py-2">
                <div>
                  <p className="text-[11px] font-medium">This position</p>
                  <p className="text-[10px] text-muted-foreground">
                    {nodeCov ? `${pct(nodeCov.pct)} of games answered` : 'No data'}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular">
                  {nodeCov ? pct(nodeCov.pct) : '—'}
                </span>
              </div>
            )}
            {myTurn && (
              <div className="mt-3 rounded-lg border border-line bg-panel2/40 px-3 py-2">
                <p className="text-[11px] font-medium">Your move</p>
                <p className="text-[10px] text-muted-foreground">
                  {node.children.length
                    ? `${node.children.length} prepared ${node.children.length === 1 ? 'reply' : 'replies'}`
                    : 'No reply yet. Pick a candidate or play a move.'}
                </p>
              </div>
            )}
            <Button variant="primary" size="sm" className="mt-3 w-full" onClick={() => setDraftOpen(true)}>
              <Zap size={13} />
              Draft popular lines
            </Button>
            <p className="mt-1.5 text-center text-[10px] leading-4 text-muted-foreground">
              Adds the top opponent moves to 85% and the most popular reply
            </p>
          </Panel>
        </div>
      </div>

      <Modal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        title="Draft from popular moves"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraftOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={doDraft}>
              <Zap size={14} />
              Draft lines
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tempo will extend <span className="font-medium text-ink">{rep.name}</span> along the most common opponent
            moves until each branch covers 85% of games.
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            <li>Depth limit: 8 plies</li>
            <li>Replies: the most popular move in the position</li>
            <li>Cap: about 600 new positions</li>
          </ul>
          <p className="text-xs">
            These are popular moves, not engine-best moves. Review and prune the tree afterwards.
          </p>
        </div>
      </Modal>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename repertoire"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (nameDraft.trim()) renameRepertoire(rep.id, nameDraft.trim())
                setRenameOpen(false)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nameDraft.trim()) {
              renameRepertoire(rep.id, nameDraft.trim())
              setRenameOpen(false)
            }
          }}
        />
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete move"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTarget) {
                  removeNodeAt(rep.id, deleteTarget.path)
                  setPath(deleteTarget.path.slice(0, -1))
                }
                setDeleteTarget(null)
              }}
            >
              Delete branch
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-mono font-medium text-ink">{deleteTarget?.san}</span> and every move after it?
          The branch is removed from this repertoire.
        </p>
      </Modal>
    </div>
  )
}
