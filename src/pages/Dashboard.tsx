import { ArrowRight, BookOpen, CalendarCheck, Flame, Target, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { accuracy, activity, dueCount, learnedCount, streakDays, weakPositions } from '../lib/analytics'
import { compact, pct, timeAgo } from '../lib/format'
import { DAY } from '../lib/srs'
import { useStats } from '../lib/stats'
import { coverageOf, useStore } from '../store/store'
import { Badge, Button, Card, EmptyState, Panel, Progress, Ring, cx } from '../components/ui'

function Kpi({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  tone?: 'brand' | 'accent' | 'info' | 'danger'
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    accent: 'bg-accent/10 text-accent',
    info: 'bg-info/10 text-info',
    danger: 'bg-danger/10 text-danger',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
        <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg', tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tabular">{value}</p>
      <p className="mt-1.5 text-xs text-muted">{sub}</p>
    </Card>
  )
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-muted">
        {data.total} reviews · {data.correct} correct · {data.wrong} wrong
      </p>
    </div>
  )
}

export default function Dashboard() {
  const repertoires = useStore((s) => s.repertoires)
  const cards = useStore((s) => s.cards)
  const attempts = useStore((s) => s.attempts)
  const { state: statsState } = useStats()
  const now = Date.now()

  const due = dueCount(cards, now)
  const learned = learnedCount(cards)
  const last7 = attempts.filter((a) => a.ts >= now - 7 * DAY)
  const prev7 = attempts.filter((a) => a.ts >= now - 14 * DAY && a.ts < now - 7 * DAY)
  const acc = accuracy(last7)
  const prevAcc = accuracy(prev7)
  const streak = streakDays(attempts, now)
  const days = useMemo(() => activity(attempts, now, 30), [attempts, now])
  const todayCount = days[days.length - 1]?.total ?? 0
  const weekTotal = last7.length
  const weak = useMemo(() => weakPositions(cards, repertoires, now, 5), [cards, repertoires, now])

  const coverages = useMemo(
    () =>
      repertoires.map((rep) => ({
        rep,
        coverage: coverageOf(rep),
      })),
    [repertoires, statsState],
  )

  const recent = attempts.slice(-6).reverse()

  if (!repertoires.length) {
    return (
      <Card>
        <EmptyState
          icon={<BookOpen size={20} />}
          title="Start your repertoire"
          description="Create a White or Black repertoire, or import lines from the opening library."
          action={
            <Link to="/repertoire">
              <Button variant="primary">Create a repertoire</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            {new Date(now).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Your training</h2>
        </div>
        <Link to="/train">
          <Button variant="primary" size="lg">
            <Target size={15} />
            Start session
            <ArrowRight size={14} />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Due now"
          value={String(due)}
          sub={due ? 'positions ready to review' : 'all caught up'}
          icon={<Target size={14} />}
          tone={due ? 'brand' : 'info'}
        />
        <Kpi
          label="Learned"
          value={String(learned)}
          sub="positions held 21+ days"
          icon={<CalendarCheck size={14} />}
          tone="info"
        />
        <Kpi
          label="Accuracy · 7d"
          value={last7.length ? pct(acc) : '—'}
          sub={
            prev7.length
              ? `${acc >= prevAcc ? '+' : ''}${Math.round((acc - prevAcc) * 100)}% vs prior week`
              : `${last7.length} reviews this week`
          }
          icon={<TrendingUp size={14} />}
          tone={acc >= 0.8 ? 'brand' : 'accent'}
        />
        <Kpi
          label="Streak"
          value={`${streak}d`}
          sub={todayCount ? `${todayCount} reviews today` : 'review today to keep it'}
          icon={<Flame size={14} />}
          tone={streak > 2 ? 'accent' : 'info'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Review activity"
          subtitle={`${compact(weekTotal)} reviews in the last 7 days · ${compact(attempts.length)} all time`}
          action={
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-brand" /> correct
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-danger" /> wrong
              </span>
            </div>
          }
        >
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--muted)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={26}
                  padding={{ left: 10, right: 10 }}
                />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--panel2)', opacity: 0.6 }} />
                <Bar dataKey="correct" stackId="a" fill="var(--brand)" radius={[2, 2, 0, 0]} maxBarSize={14} />
                <Bar dataKey="wrong" stackId="a" fill="var(--danger)" radius={[2, 2, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
            <div>
              <p className="text-[11px] text-muted">Today</p>
              <p className="text-sm font-semibold tabular">{todayCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">7-day accuracy</p>
              <p className="text-sm font-semibold tabular">{last7.length ? pct(acc, 1) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Avg / day</p>
              <p className="text-sm font-semibold tabular">{Math.round(weekTotal / 7)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Repertoire coverage" subtitle="Share of opponent games you have an answer for">
          <div className="space-y-3">
            {coverages.map(({ rep, coverage }) => (
              <Link
                key={rep.id}
                to={`/repertoire/${rep.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-panel2/40 p-3 transition-colors hover:border-muted/40"
              >
                <Ring value={statsState === 'ready' ? coverage.pct : 0} size={56} stroke={5} label={statsState === 'ready' ? undefined : '…'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{rep.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {statsState === 'ready' ? (
                      <>{pct(coverage.pct)} weighted coverage</>
                    ) : (
                      <span className="mt-1 inline-block h-2.5 w-24 skeleton rounded" />
                    )}
                  </p>
                  <Progress className="mt-2" value={statsState === 'ready' ? coverage.pct : 0} />
                </div>
                <Badge tone={rep.side === 'white' ? 'neutral' : 'info'}>
                  {rep.side === 'white' ? 'White' : 'Black'}
                </Badge>
              </Link>
            ))}
            <div className="rounded-lg border border-line bg-panel2/40 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium">{due} positions due now</p>
                  <p className="text-[10px] text-muted">across {repertoires.length} repertoires</p>
                </div>
                <Link to="/train">
                  <Button variant="primary" size="sm">
                    Review
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/repertoire">
                <Button variant="outline" size="sm" className="w-full">
                  Manage
                </Button>
              </Link>
              <Link to="/openings">
                <Button variant="subtle" size="sm" className="w-full">
                  Add lines
                </Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Weak positions"
          subtitle="Most lapses and lowest ease, across both sides"
          action={
            <Badge tone="accent">
              <Flame size={11} /> {weak.reduce((n, w) => n + w.card.lapses, 0)} lapses
            </Badge>
          }
        >
          {weak.length ? (
            <div className="divide-y divide-line">
              {weak.map(({ card, rep, name }) => (
                <div key={`${card.repId}-${card.epd}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel2 text-[11px] text-muted">
                    {card.lapses}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{name ?? rep?.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {rep?.side === 'white' ? 'White' : 'Black'} · ease {card.ease.toFixed(2)} ·{' '}
                      {card.due <= now ? 'due now' : `in ${Math.ceil((card.due - now) / DAY)}d`}
                    </p>
                  </div>
                  <Link to={rep ? `/repertoire/${rep.id}` : '/repertoire'}>
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted">No lapses recorded yet.</p>
          )}
        </Panel>

        <Panel
          title="Recent reviews"
          subtitle="Latest graded positions"
          action={
            <Link to="/progress">
              <Button variant="ghost" size="sm">
                All activity
              </Button>
            </Link>
          }
        >
          {recent.length ? (
            <div className="divide-y divide-line">
              {recent.map((a, i) => (
                <div key={`${a.ts}-${i}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={cx(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      a.correct ? 'bg-brand' : 'bg-danger',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{a.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{timeAgo(a.ts, now)}</p>
                  </div>
                  <span className={cx('text-[11px] font-medium', a.correct ? 'text-brand' : 'text-danger')}>
                    {a.correct ? 'correct' : 'missed'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted">No reviews yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Side balance" subtitle="Positions prepared for each side">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['white', 'black'] as const).map((side) => {
              const reps = repertoires.filter((r) => r.side === side)
              const total = reps.reduce((n, r) => n + Object.values(cards).filter((c) => c.repId === r.id).length, 0)
              return (
                <div key={side} className="rounded-xl border border-line bg-panel2/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium capitalize">{side}</span>
                    <Badge tone={side === 'white' ? 'neutral' : 'info'}>{reps.length} reps</Badge>
                  </div>
                  <p className="mt-2 text-xl font-semibold tabular">{total}</p>
                  <p className="text-[11px] text-muted">tracked positions</p>
                </div>
              )
            })}
          </div>
        </Panel>
        <Panel title="Focus" subtitle="What this week looks like">
          <div className="flex items-center gap-4">
            <div className="relative h-[96px] w-[96px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'correct', value: last7.filter((a) => a.correct).length },
                      { name: 'wrong', value: last7.filter((a) => !a.correct).length },
                    ]}
                    dataKey="value"
                    innerRadius={30}
                    outerRadius={44}
                    paddingAngle={2}
                    stroke="none"
                  >
                    <Cell fill="var(--brand)" />
                    <Cell fill="var(--danger)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold tabular">{last7.length ? pct(acc) : '—'}</span>
                <span className="text-[9px] uppercase tracking-wide text-muted">7 days</span>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-muted">
                <span className="font-medium text-ink">{last7.filter((a) => a.correct).length}</span> correct
              </p>
              <p className="text-muted">
                <span className="font-medium text-ink">{last7.filter((a) => !a.correct).length}</span> missed
              </p>
              <p className="text-muted">
                <span className="font-medium text-ink">{learned}</span> positions learned
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
