import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSeed } from '../data/seed'
import { uid } from '../lib/format'
import { cardKey, gradeCard, newCard } from '../lib/srs'
import { getStats } from '../lib/stats'
import type { AppState, Attempt, Card, Repertoire, Settings, Side, TreeNode } from '../lib/types'
import { addLine, addMove, coverage, countNodes, draftFromPopular, removeAt } from '../lib/tree'

export const STORAGE_KEY = 'tempo-state'

const defaultSettings: Settings = {
  theme: 'dark',
  boardTheme: 'green',
  newPerDay: 20,
  seeded: true,
}

const seeded = createSeed()

type Data = Pick<AppState, 'schemaVersion' | 'settings' | 'repertoires' | 'cards' | 'attempts'>

export type Result = {
  repId: string
  epd: string
  correct: boolean
  ms: number
  name: string
  grade: boolean
}

type Store = Data & {
  setTheme: (theme: Settings['theme']) => void
  setBoardTheme: (theme: Settings['boardTheme']) => void
  setNewPerDay: (n: number) => void
  createRepertoire: (name: string, side: Side) => string
  renameRepertoire: (id: string, name: string) => void
  deleteRepertoire: (id: string) => void
  addLineTo: (id: string, sans: string[]) => string[] | null
  addLinesTo: (id: string, lines: string[][]) => number
  addMoveTo: (id: string, parentPath: string[], san: string) => string[] | null
  removeNodeAt: (id: string, path: string[]) => void
  draft: (id: string) => number
  recordResult: (result: Result) => void
  resetDemo: () => void
  importData: (text: string) => void
  exportData: () => string
}

type Backup = {
  schemaVersion?: number
  settings?: Settings
  repertoires: Repertoire[]
  cards: Record<string, Card>
  attempts: Attempt[]
}

const validNode = (value: unknown): boolean => {
  const node = value as TreeNode | null
  if (!node || typeof node.fen !== 'string' || !Array.isArray(node.children)) return false
  return node.children.every(validNode)
}

function validateImport(parsed: Partial<Data>): asserts parsed is Backup {
  if (!Array.isArray(parsed.repertoires) || !parsed.cards || typeof parsed.cards !== 'object' || !Array.isArray(parsed.attempts)) {
    throw new Error('This file is not a Tempo backup.')
  }
  for (const rep of parsed.repertoires) {
    if (!rep?.id || !rep.name || (rep.side !== 'white' && rep.side !== 'black') || !validNode(rep.root)) {
      throw new Error('A repertoire in this file is damaged.')
    }
  }
  for (const card of Object.values(parsed.cards)) {
    const c = card as Card
    if (!c || typeof c.epd !== 'string' || typeof c.due !== 'number' || typeof c.ease !== 'number') {
      throw new Error('A card in this file is damaged.')
    }
  }
  for (const attempt of parsed.attempts) {
    const a = attempt as Attempt
    if (!a || typeof a.ts !== 'number' || typeof a.name !== 'string' || typeof a.correct !== 'boolean') {
      throw new Error('An attempt in this file is damaged.')
    }
  }
}

function touch(rep: Repertoire, root: TreeNode): Repertoire {
  return { ...rep, root, updatedAt: Date.now() }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      settings: defaultSettings,
      repertoires: seeded.repertoires,
      cards: seeded.cards,
      attempts: seeded.attempts,

      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setBoardTheme: (boardTheme) => set((s) => ({ settings: { ...s.settings, boardTheme } })),
      setNewPerDay: (newPerDay) => set((s) => ({ settings: { ...s.settings, newPerDay } })),

      createRepertoire: (name, side) => {
        const id = uid()
        const now = Date.now()
        const rep: Repertoire = {
          id,
          name,
          side,
          root: { san: '', uci: '', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', children: [] },
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ repertoires: [...s.repertoires, rep] }))
        return id
      },

      renameRepertoire: (id, name) =>
        set((s) => ({
          repertoires: s.repertoires.map((r) => (r.id === id ? { ...r, name, updatedAt: Date.now() } : r)),
        })),

      deleteRepertoire: (id) =>
        set((s) => {
          const cards = Object.fromEntries(
            Object.entries(s.cards).filter(([, c]) => c.repId !== id),
          )
          return {
            repertoires: s.repertoires.filter((r) => r.id !== id),
            cards,
            attempts: s.attempts.filter((a) => a.repId !== id),
          }
        }),

      addLineTo: (id, sans) => {
        const rep = get().repertoires.find((r) => r.id === id)
        if (!rep) return null
        const result = addLine(rep.root, sans)
        set((s) => ({ repertoires: s.repertoires.map((r) => (r.id === id ? touch(r, result.root) : r)) }))
        return result.path
      },

      addLinesTo: (id, lines) => {
        const rep = get().repertoires.find((r) => r.id === id)
        if (!rep) return 0
        let root = rep.root
        for (const sans of lines) root = addLine(root, sans).root
        set((s) => ({ repertoires: s.repertoires.map((r) => (r.id === id ? touch(r, root) : r)) }))
        return lines.length
      },

      addMoveTo: (id, parentPath, san) => {
        const rep = get().repertoires.find((r) => r.id === id)
        if (!rep) return null
        const result = addMove(rep.root, parentPath, san)
        if (!result) return null
        set((s) => ({ repertoires: s.repertoires.map((r) => (r.id === id ? touch(r, result.root) : r)) }))
        return result.path
      },

      removeNodeAt: (id, path) => {
        const rep = get().repertoires.find((r) => r.id === id)
        if (!rep || !path.length) return
        set((s) => ({
          repertoires: s.repertoires.map((r) => (r.id === id ? touch(r, removeAt(r.root, path)) : r)),
        }))
      },

      draft: (id) => {
        const rep = get().repertoires.find((r) => r.id === id)
        if (!rep) return 0
        const before = countNodes(rep.root)
        const root = draftFromPopular(rep.root, rep.side, (fen) => {
          const s = getStats(fen)
          return s ? { total: s.total, moves: s.moves.map((m) => ({ uci: m.uci, games: m.games })) } : null
        })
        set((s) => ({ repertoires: s.repertoires.map((r) => (r.id === id ? touch(r, root) : r)) }))
        return countNodes(root) - before
      },

      recordResult: ({ repId, epd: position, correct, ms, name, grade }) =>
        set((s) => {
          const key = cardKey(repId, position)
          let cards = s.cards
          if (grade && repId) {
            const base = s.cards[key] ?? newCard(repId, position)
            cards = { ...s.cards, [key]: gradeCard(base, correct) }
          }
          const attempt: Attempt = { ts: Date.now(), repId, epd: position, name, correct, ms }
          const attempts = [...s.attempts, attempt].slice(-5000)
          return { cards, attempts }
        }),

      resetDemo: () => {
        const seed = createSeed()
        set((s) => ({
          repertoires: seed.repertoires,
          cards: seed.cards,
          attempts: seed.attempts,
          settings: { ...s.settings, seeded: true },
        }))
      },

      importData: (text) => {
        const parsed = JSON.parse(text) as Partial<Data>
        validateImport(parsed)
        const ids = new Set(parsed.repertoires.map((r) => r.id))
        const cards = Object.fromEntries(
          Object.entries(parsed.cards).filter(([, c]) => ids.has((c as Card).repId)),
        )
        set((s) => ({
          repertoires: parsed.repertoires as Repertoire[],
          cards: cards as Record<string, Card>,
          attempts: (parsed.attempts as Attempt[]).slice(-5000),
          settings: { ...s.settings, ...(parsed.settings ?? {}), seeded: false },
        }))
      },

      exportData: () => {
        const { schemaVersion, settings, repertoires, cards, attempts } = get()
        return JSON.stringify({ schemaVersion, settings, repertoires, cards, attempts }, null, 2)
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        settings: s.settings,
        repertoires: s.repertoires,
        cards: s.cards,
        attempts: s.attempts,
      }),
    },
  ),
)

export const coverageOf = (rep: Repertoire) =>
  coverage(rep.root, rep.side, (fen) => {
    const s = getStats(fen)
    return s ? { total: s.total, moves: s.moves.map((m) => ({ uci: m.uci, games: m.games })) } : null
  })

