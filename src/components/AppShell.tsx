import { BookOpen, Library, LayoutDashboard, Menu, Moon, Sun, Target, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStats } from '../lib/stats'
import { STORAGE_KEY, useStore } from '../store/store'
import { Badge, Button, cx } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/repertoire', label: 'Repertoires', icon: Library },
  { to: '/openings', label: 'Openings', icon: BookOpen },
  { to: '/train', label: 'Trainer', icon: Target },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/repertoire': 'Repertoires',
  '/openings': 'Opening library',
  '/train': 'Trainer',
  '/progress': 'Progress',
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Tempo home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold text-bg">T</span>
      <span>
        <span className="block text-[15px] font-semibold leading-4 tracking-tight">Tempo</span>
        <span className="block text-[11px] text-muted">Opening trainer</span>
      </span>
    </Link>
  )
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              isActive ? 'bg-brand-soft text-ink' : 'text-muted hover:bg-panel2 hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" />}
              <Icon size={16} className={isActive ? 'text-brand' : ''} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)
  const cards = useStore((s) => s.cards)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { state: statsState } = useStats()

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // Persist the demo seed on the first visit so ids survive reloads.
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      useStore.setState((s) => ({ attempts: [...s.attempts] }))
    }
  }, [])

  useEffect(() => setMenuOpen(false), [location.pathname])

  const now = Date.now()
  const due = Object.values(cards).filter((c) => c.lastReviewed > 0 && c.due <= now).length
  const title = TITLES[location.pathname] ?? (location.pathname.startsWith('/repertoire') ? 'Repertoire' : 'Tempo')

  return (
    <div className="min-h-full">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-panel px-4 py-5 lg:flex">
        <Logo />
        <div className="mt-8 flex-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Study</p>
          <Nav />
        </div>
        <div className="rounded-xl border border-line bg-panel2/60 p-3">
          <div className="flex items-center gap-2">
            <span
              className={cx(
                'h-1.5 w-1.5 rounded-full',
                statsState === 'ready' ? 'bg-brand' : statsState === 'error' ? 'bg-danger' : 'bg-accent',
              )}
            />
            <span className="text-[11px] font-medium">
              {statsState === 'ready' ? 'Popularity data ready' : statsState === 'error' ? 'Data unavailable' : 'Loading data'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted">Lichess games · offline snapshot</p>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] animate-[pop-in_180ms_ease-out] border-r border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={16} />
              </Button>
            </div>
            <div className="mt-8">
              <Nav onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </Button>
          <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight">{title}</h1>
          <div className="flex-1" />
          <Link to="/train" className="hidden sm:block">
            <Badge tone={due ? 'brand' : 'neutral'}>
              <span className={cx('h-1.5 w-1.5 rounded-full', due ? 'bg-brand' : 'bg-muted')} />
              {due} due
            </Badge>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Link to="/train">
            <Button variant="primary" size="sm" className="h-9 px-4">
              <Target size={14} />
              Train
            </Button>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
