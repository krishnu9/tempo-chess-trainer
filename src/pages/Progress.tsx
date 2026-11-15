import { Database, Download, Flame, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, Modal, Panel, Progress as ProgressBar, Select, cx } from '../components/ui'
import { accuracy, activity, learnedCount, streakDays } from '../lib/analytics'
import { compact, dateShort, pct, startOfDay, timeAgo } from '../lib/format'
import { DAY } from '../lib/srs'
import { statsMeta, useStats } from '../lib/stats'
import { useStore } from '../store/store'

export default function Progress() {
  const attempts = useStore((s) => s.attempts)
  const cards = useStore((s) => s.cards)
  const repertoires = useStore((s) => s.repertoires)
  const settings = useStore((s) => s.settings)
  const setTheme = useStore((s) => s.setTheme)
  const setBoardTheme = useStore((s) => s.setBoardTheme)
  const setNewPerDay = useStore((s) => s.setNewPerDay)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetDemo = useStore((s) => s.resetDemo)
  const { state: statsState } = useStats()
  const now = Date.now()
  const [resetOpen, setResetOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const week = attempts.filter((a) => a.ts >= now - 7 * DAY)
  const days = useMemo(() => activity(attempts, now, 84), [attempts, now])
  const maxDay = Math.max(1, ...days.map((d) => d.total))
  const learned = learnedCount(cards)
  const streak = streakDays(attempts, now)

  const byOpening = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; last: number }>()
    for (const a of attempts) {
      const entry = map.get(a.name) ?? { total: 0, correct: 0, last: 0 }
      entry.total++
      if (a.correct) entry.correct++
      entry.last = Math.max(entry.last, a.ts)
      map.set(a.name, entry)
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, acc: v.correct / Math.max(1, v.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 14)
  }, [attempts])

  const backup = useMemo(() => exportData(), [exportData, cards, attempts, repertoires, settings])
  const sizeKb = Math.round(new Blob([backup]).size / 1024)
  const meta = statsState === 'ready' ? statsMeta() : null

  const download = () => {
    const blob = new Blob([backup], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tempo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const readFile = async (file: File) => {
    setImportError(null)
    try {
      importData(await file.text())
    } catch (e) {
      setImportError((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight">Progress</h2>
        <p className="mt-1 text-xs text-muted">Everything stored on this device. Export a backup when it matters.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Reviews', value: String(attempts.length), sub: `${week.length} this week` },
          { label: 'Accuracy', value: attempts.length ? pct(accuracy(attempts)) : '—', sub: 'all time' },
          { label: 'Learned', value: String(learned), sub: 'positions held 21+ days' },
          { label: 'Streak', value: `${streak}d`, sub: 'consecutive review days' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular">{kpi.value}</p>
            <p className="mt-1 text-[11px] text-muted">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      <Panel
        title="Review heatmap"
        subtitle="Last 12 weeks"
        action={
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            less
            {[0, 0.2, 0.4, 0.65, 1].map((v) => (
              <span
                key={v}
                className="h-2.5 w-2.5 rounded-[2px] border border-line"
                style={{ backgroundColor: v === 0 ? 'var(--panel2)' : `color-mix(in srgb, var(--brand) ${v * 100}%, transparent)` }}
              />
            ))}
            more
          </div>
        }
      >
        <div className="overflow-x-auto">
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {days.map((day) => {
              const level = day.total === 0 ? 0 : Math.max(0.15, Math.min(1, day.total / Math.min(28, maxDay * 0.8)))
              return (
                <div
                  key={day.day}
                  title={`${dateShort(day.day)} · ${day.total} reviews · ${day.correct} correct`}
                  className="h-3 w-3 rounded-[2px] border border-line/60"
                  style={{
                    backgroundColor:
                      level === 0 ? 'var(--panel2)' : `color-mix(in srgb, var(--brand) ${Math.round(level * 100)}%, transparent)`,
                  }}
                />
              )
            })}
          </div>
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-muted">
          <span>{dateShort(startOfDay(now) - 83 * DAY)}</span>
          <span>today</span>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Accuracy by opening" subtitle="Top lines by review volume">
          {byOpening.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                    <th className="pb-2 font-medium">Opening</th>
                    <th className="pb-2 text-right font-medium">Reviews</th>
                    <th className="pb-2 pl-4 font-medium">Accuracy</th>
                    <th className="pb-2 text-right font-medium">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {byOpening.map((row) => (
                    <tr key={row.name} className="border-b border-line/60 last:border-0">
                      <td className="max-w-[280px] truncate py-2 pr-3">{row.name}</td>
                      <td className="py-2 text-right tabular text-muted">{row.total}</td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={row.acc}
                            className="w-20"
                            tone={row.acc >= 0.85 ? 'brand' : row.acc >= 0.7 ? 'accent' : 'danger'}
                          />
                          <span className="w-9 tabular text-muted">{pct(row.acc)}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right text-muted">{timeAgo(row.last, now)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted">No reviews yet. Start a session.</p>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Settings" subtitle="Study preferences">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium">Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cx(
                        'rounded-lg border px-3 py-2 text-xs capitalize transition-colors',
                        settings.theme === t ? 'border-brand bg-brand-soft font-medium' : 'border-line text-muted hover:text-ink',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="set-board" className="mb-1.5 block text-xs font-medium">
                  Board colours
                </label>
                <Select id="set-board" value={settings.boardTheme} onChange={(e) => setBoardTheme(e.target.value as 'green' | 'blue')} className="w-full">
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                </Select>
              </div>
              <div>
                <label htmlFor="set-new" className="mb-1.5 block text-xs font-medium">
                  New cards per session
                </label>
                <Select
                  id="set-new"
                  value={settings.newPerDay}
                  onChange={(e) => setNewPerDay(Number(e.target.value))}
                  className="w-full"
                >
                  {[5, 10, 20, 30, 40].map((n) => (
                    <option key={n} value={n}>
                      {n} cards
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Panel>

          <Panel title="Data" subtitle="Local backup">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-panel2/40 p-3">
              <Database size={16} className="text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{sizeKb} KB stored</p>
                <p className="text-[10px] text-muted">{repertoires.length} repertoires · {Object.keys(cards).length} cards</p>
              </div>
              <Badge tone={sizeKb > 4000 ? 'danger' : 'neutral'}>{sizeKb > 4000 ? 'large' : 'healthy'}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={download}>
                <Download size={13} /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={13} /> Import
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
                e.target.value = ''
              }}
            />
            {importError && <p className="mt-2 text-[11px] text-danger">{importError}</p>}
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Demo data</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Replace everything with the sample White and Black repertoires and 30 days of review history.
              </p>
              <Button variant="danger" size="sm" className="mt-2 w-full" onClick={() => setResetOpen(true)}>
                <RotateCcw size={13} /> Reset to demo data
              </Button>
            </div>
          </Panel>

          <Panel title="Popularity snapshot" subtitle="Bundled, offline">
            {meta ? (
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted">Games</dt>
                  <dd className="mt-0.5 font-medium tabular">{compact(meta.games)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Positions</dt>
                  <dd className="mt-0.5 font-medium tabular">{compact(meta.positions)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Depth</dt>
                  <dd className="mt-0.5 font-medium tabular">{meta.depth} plies</dd>
                </div>
                <div>
                  <dt className="text-muted">Time controls</dt>
                  <dd className="mt-0.5 font-medium">{meta.timeControls}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-muted">Snapshot not loaded.</p>
            )}
            <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[11px] text-muted">
              <Flame size={12} /> {compact(attempts.length)} reviews stored on this device.
            </p>
          </Panel>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset to demo data"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemo()
                setResetOpen(false)
              }}
            >
              <Trash2 size={14} /> Reset everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This deletes your repertoires, cards, and review history. It then loads the demo content again. Export a
          backup first if you want to keep your data.
        </p>
      </Modal>
    </div>
  )
}
