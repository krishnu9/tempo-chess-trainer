export type Side = 'white' | 'black'

export type TreeNode = {
  san: string
  uci: string
  fen: string
  children: TreeNode[]
  note?: string
}

export type Repertoire = {
  id: string
  name: string
  side: Side
  root: TreeNode
  createdAt: number
  updatedAt: number
}

export type Card = {
  repId: string
  epd: string
  due: number
  interval: number
  ease: number
  reps: number
  lapses: number
  lastReviewed: number
}

export type Attempt = {
  ts: number
  repId: string
  epd: string
  name: string
  correct: boolean
  ms: number
}

export type Settings = {
  theme: 'dark' | 'light'
  boardTheme: 'green' | 'blue'
  newPerDay: number
  seeded: boolean
}

export type AppState = {
  schemaVersion: number
  settings: Settings
  repertoires: Repertoire[]
  cards: Record<string, Card>
  attempts: Attempt[]
}
