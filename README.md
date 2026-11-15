# Tempo

A chess opening repertoire builder and spaced-repetition trainer. It merges two
workflows in one local-first dashboard:

1. **Library drill** — browse the ECO opening set, preview lines, and practise
   any line move by move.
2. **Repertoire** — build one tree for White and one for Black. Tempo shows the
   opponent's most popular replies with Lichess game shares, so you can cover
   the moves you actually face.

Everything runs in the browser. There is no account, server, or runtime API.

## Quick start

```bash
bun install
bun dev            # http://localhost:5173
bun test           # unit tests
bun run build      # production build in dist/
```

The first visit loads a demo White and Black repertoire with 30 days of review
history, so the dashboard is populated. Use **Progress → Reset to demo data** to
restore it, or delete the repertoires and build your own.

## Stack

React 19 and TypeScript on Vite, Tailwind CSS v4, Zustand with `localStorage`
persistence, `chess.js`, `react-chessboard`, and Recharts. Tests run on Vitest.

## Features

- **Data-dense dashboard** — cards due, learned positions, 7-day accuracy,
  streak, 30-day review activity, coverage per side, weak positions.
- **Repertoire builder** — board plus move tree plus popularity panel.
  - Click a popular move to add it, or play any legal move on the board.
  - Weighted coverage shows the share of opponent games you have answered.
  - **Draft popular lines** extends the tree to 85% coverage, 8 plies deep.
- **Opening library** — 3,800+ ECO lines with search, ECO filters, a move
  browser, import into a repertoire, and line drills as either colour.
- **Trainer** — review due cards, play out a weighted random line, or drill one
  line. Misses show the expected arrow, then repeat in 10 minutes.
- **Progress** — accuracy by opening, 12-week heatmap, settings, JSON backup.
- **Dark and light themes**, keyboard shortcuts, and mobile layouts.

Keyboard in a session: `Space` shows the hint, `Enter` advances after a correct
move.

## Repertoire model

A repertoire is a tree of positions. A node on **your** turn with at least one
child is a review card. Cards are keyed by repertoire plus board position, so
transpositions share one schedule. The scheduler is simplified SM-2: a correct
answer grows the interval by the card's ease, a miss resets the interval and
lowers the ease.

All state lives in `localStorage` under `tempo-state`, versioned with
`schemaVersion` and stable IDs so a sync layer can be added later. Use the
export button before clearing site data.

## Popularity snapshot

The app reads `public/opening-stats.json.gz` (about 0.5 MB). It contains, per
position, the total games, W/D/L split, and the top 12 moves with counts.

The file is generated from the official
[`Lichess/standard-chess-games`](https://huggingface.co/datasets/Lichess/standard-chess-games)
Parquet dataset. The script reads a sample over HTTP, replays the games with
`chess.js`, and aggregates positions up to ply 12:

```bash
node --max-old-space-size=6144 scripts/build-opening-stats.mjs \
  --games 500000 --min 20
```

Options: `--games`, `--depth`, `--min` (minimum games per position), `--url`
(any Parquet shard), `--out`. The current snapshot uses one shard from
2025-01, blitz/rapid/classical games only (180–1800s base time), 302,900 games,
and 13,175 positions.

The Lichess opening explorer API is **not** used. It now answers 401 to
third-party clients, so the snapshot keeps the app offline and deterministic.

## Project map

```
scripts/build-opening-stats.mjs   data pipeline
public/opening-stats.json.gz      bundled popularity snapshot
src/data/openings/*.tsv           ECO names and lines (lichess-org/chess-openings)
src/data/seed.ts                  demo repertoires and history
src/lib/                          chess, tree, SRS, sessions, analytics
src/pages/                        dashboard, builder, library, trainer, progress
src/store/store.ts                zustand store with persistence
```

## Limits

- The snapshot is a 2025 Lichess sample. It does not reflect the current meta or
  your own opponents.
- "Draft popular lines" picks popular moves, not engine-best moves.
- `localStorage` is small (about 5 MB). Export a backup for large repertoires.
- No cloud sync, engine analysis, PGN import, or accounts yet.
