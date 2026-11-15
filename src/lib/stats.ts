import { useCallback, useEffect, useState } from 'react'
import { epd } from './chess'

export type MoveStat = {
  uci: string
  san: string
  games: number
  w: number
  d: number
  b: number
  share: number
}

export type PosStat = {
  total: number
  w: number
  d: number
  b: number
  moves: MoveStat[]
}

type RawMove = [string, string, number, number, number, number]
type RawPos = [number, number, number, number, RawMove[]]

export type StatsMeta = {
  source: string
  games: number
  depth: number
  minGames: number
  timeControls: string
  generated: string
  positions: number
}

let database: Record<string, RawPos> | null = null
let meta: StatsMeta | null = null
let loading: Promise<void> | null = null
const cache = new Map<string, PosStat | null>()

export function ensureStats(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}opening-stats.json.gz`)
      if (!res.ok) throw new Error(`Stats file not found (${res.status})`)
      const buf = new Uint8Array(await res.arrayBuffer())
      let text: string
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
        text = await new Response(stream).text()
      } else {
        text = new TextDecoder().decode(buf)
      }
      const data = JSON.parse(text) as { meta: StatsMeta; positions: Record<string, RawPos> }
      database = data.positions
      meta = data.meta
    })()
  }
  return loading
}

export const statsLoaded = () => database !== null

export const statsMeta = () => meta

export function getStats(fen: string): PosStat | null {
  if (!database) return null
  const key = epd(fen)
  if (cache.has(key)) return cache.get(key) ?? null
  const raw = database[key]
  if (!raw) {
    cache.set(key, null)
    return null
  }
  const [total, w, d, b, moves] = raw
  const stat: PosStat = {
    total,
    w,
    d,
    b,
    moves: moves.map(([uci, san, games, mw, md, mb]) => ({
      uci,
      san,
      games,
      w: mw,
      d: md,
      b: mb,
      share: total ? games / total : 0,
    })),
  }
  cache.set(key, stat)
  return stat
}

export const lookup = (fen: string) => {
  const s = getStats(fen)
  if (!s) return null
  return { total: s.total, moves: s.moves.map((m) => ({ uci: m.uci, games: m.games })) }
}

export function useStats() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(
    statsLoaded() ? 'ready' : 'loading',
  )
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (state === 'ready') return
    let alive = true
    ensureStats()
      .then(() => alive && setState('ready'))
      .catch((e: Error) => {
        if (!alive) return
        setError(e.message)
        setState('error')
      })
    return () => {
      alive = false
    }
  }, [state])
  const retry = useCallback(() => {
    loading = null
    setState('loading')
  }, [])
  return { state, error, retry }
}
