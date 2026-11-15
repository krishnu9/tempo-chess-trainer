'use client'

import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { countMoves, countNodes, myPositions } from '@/lib/tree'
import { coverageOf, useStore } from '@/store/store'
import type { Repertoire, Side } from '@/lib/types'
import { Badge, Button, Card, EmptyState, Input, Modal, Progress, Ring, cx } from '@/components/kit'
import { useStats } from '@/lib/stats'
import { pct } from '@/lib/format'

export default function Repertoires() {
  const repertoires = useStore((s) => s.repertoires)
  const cards = useStore((s) => s.cards)
  const createRepertoire = useStore((s) => s.createRepertoire)
  const deleteRepertoire = useStore((s) => s.deleteRepertoire)
  const { state: statsState } = useStats()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [side, setSide] = useState<Side>('white')
  const [toDelete, setToDelete] = useState<Repertoire | null>(null)

  const coverages = useMemo(
    () => Object.fromEntries(repertoires.map((r) => [r.id, coverageOf(r)])),
    [repertoires, statsState],
  )

  const submit = () => {
    const finalName = name.trim() || (side === 'white' ? 'White repertoire' : 'Black repertoire')
    const id = createRepertoire(finalName, side)
    setOpen(false)
    setName('')
    router.push(`/repertoire/${id}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Repertoires</h2>
          <p className="mt-1 text-xs text-muted-foreground">One tree per side. Cover the moves you actually face.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/openings">
            <Button variant="outline">
              <BookOpen size={14} />
              Browse openings
            </Button>
          </Link>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={15} />
            New repertoire
          </Button>
        </div>
      </div>

      {!repertoires.length ? (
        <Card>
          <EmptyState
            icon={<BookOpen size={20} />}
            title="No repertoires yet"
            description="Create a White or Black repertoire. Then import lines from the library or build them on the board."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                Create a repertoire
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {repertoires.map((rep) => {
            const coverage = coverages[rep.id]
            const mine = myPositions(rep.root, rep.side).length
            const due = Object.values(cards).filter(
              (c) => c.repId === rep.id && c.lastReviewed > 0 && c.due <= Date.now(),
            ).length
            const tracked = Object.values(cards).filter((c) => c.repId === rep.id).length
            return (
              <Card key={rep.id} className="group overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-line p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          'h-2 w-2 rounded-full',
                          rep.side === 'white' ? 'bg-ink' : 'border border-muted bg-transparent',
                        )}
                      />
                      <Badge tone={rep.side === 'white' ? 'neutral' : 'info'}>
                        {rep.side === 'white' ? 'White' : 'Black'}
                      </Badge>
                      {due > 0 && <Badge tone="brand">{due} due</Badge>}
                    </div>
                    <h3 className="mt-2 truncate text-[15px] font-semibold">{rep.name}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {countNodes(rep.root) - 1} positions · {countMoves(rep.root)} moves · {mine} decision points
                    </p>
                  </div>
                  <Ring
                    value={statsState === 'ready' ? coverage.pct : 0}
                    size={62}
                    stroke={5}
                    label={statsState === 'ready' ? undefined : '…'}
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Popularity coverage</span>
                      <span className="tabular">
                        {statsState === 'ready' ? pct(coverage.pct) : <span className="inline-block h-2 w-8 skeleton rounded" />}
                      </span>
                    </div>
                    <Progress value={statsState === 'ready' ? coverage.pct : 0} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{tracked} tracked cards</span>
                    <button
                      className="invisible flex items-center gap-1 text-danger transition-opacity hover:underline group-hover:visible"
                      onClick={() => setToDelete(rep)}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/repertoire/${rep.id}`}>
                      <Button variant="subtle" size="sm" className="w-full">
                        Open builder
                      </Button>
                    </Link>
                    <Link href={`/train?rep=${rep.id}`}>
                      <Button variant="primary" size="sm" className="w-full">
                        Train
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New repertoire"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="rep-name" className="mb-1.5 block text-xs font-medium">
              Name
            </label>
            <Input
              id="rep-name"
              autoFocus
              placeholder={side === 'white' ? 'White repertoire' : 'Black repertoire'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium">You play</p>
            <div className="grid grid-cols-2 gap-2">
              {(['white', 'black'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={cx(
                    'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm capitalize transition-colors',
                    side === s
                      ? 'border-brand bg-brand-soft font-medium text-ink'
                      : 'border-line text-muted-foreground hover:border-muted-foreground/40 hover:text-ink',
                  )}
                >
                  <span className={cx('h-2.5 w-2.5 rounded-full', s === 'white' ? 'bg-ink' : 'border border-muted')} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete repertoire"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (toDelete) deleteRepertoire(toDelete.id)
                setToDelete(null)
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-medium text-ink">{toDelete?.name}</span>? This removes its tree, cards, and
          review history. You cannot undo this action.
        </p>
      </Modal>
    </div>
  )
}
