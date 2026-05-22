# Tsundoku — Implementation Plan

> **Tsundoku** (積ん読): the Japanese practice of acquiring books and letting them pile up unread.
> This app exists to remind you to *read* what you buy.

---

## Vision

A mobile-first web app running on your phone that lets you manage your comic book collection in real time, synced via TinyBase to a server on your PC. Tintin-inspired "ligne claire" aesthetic. Designed to expand to computer games.

---

## Architecture

```
Phone (browser)                  PC (server)
┌─────────────────────┐          ┌──────────────────────────┐
│  React PWA           │  WiFi   │  Node.js                 │
│  TinyBase            │◄───────►│  TinyBase WsServer       │
│  MergeableStore      │  WS     │  + FilePersister         │
│  localStorage        │         │  + Express (static files)│
└─────────────────────┘          └──────────────────────────┘
```

**Key decisions:**
- **Phone access**: Phone and PC on the same WiFi. Server serves the static client app at `http://<PC_IP>:3000`. Add to phone home screen as a web app shortcut. No HTTPS/service worker needed for a LAN-only app — keep it simple.
- **Server persistence**: `createWsServer` accepts a `createPersisterForPath` callback, giving the server its own `MergeableStore` backed by a JSON file on disk. The server legitimately *receives and holds* all changes.
- **Schema extensibility**: Items table uses a `kind` discriminator (`'comic'` | `'game'`) so games can be added later without a schema migration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client build | Vite 5 + TypeScript |
| Client UI | React 18 |
| Data / sync | TinyBase 5 (MergeableStore, WsSynchronizer) |
| Client persistence | `persister-browser` (localStorage) |
| Server | Node.js 20 + TypeScript (`tsx` for dev, `tsc` for prod) |
| Server WebSocket | `ws` + TinyBase `synchronizer-ws-server` |
| Server persistence | `persister-file` (JSON files on disk) |
| Static serving | Express |
| Tests | Vitest |
| Package manager | pnpm workspaces |

---

## Data Schema

```typescript
// Table: items — covers both comics and games
{
  id:           string,   // nanoid UUID
  kind:         string,   // 'comic' | 'game'
  title:        string,   // "The Blue Lotus"
  series:       string,   // "Tintin"
  volume:       string,   // "5" (issue # for comics, disc/entry for games)
  publisher:    string,   // "Casterman"
  year:         number,   // 1936
  condition:    string,   // 'mint'|'near-mint'|'very-fine'|'fine'|'good'|'fair'|'poor'
  read:         number,   // 0=unread/unplayed, 1=read/played (TinyBase booleans are numbers)
  owned:        number,   // 0=wishlist, 1=owned
  notes:        string,
  acquiredDate: string,   // ISO date "2024-03-15"
  pricePaid:    number,   // in local currency
  language:     string,   // "English" | "French" | etc.
}

// Values (key-value store)
{
  userName: string,   // display name
  currency: string,   // "USD" | "EUR" | etc.
}
```

---

## Visual Theme (Tintin / Ligne Claire)

- **Palette**: `#E63329` (red), `#1A3A6B` (blue), `#F5C518` (yellow), `#FFFFFF` (white)
- **Typography**: Clean, bold sans-serif. No decorative fonts.
- **Style**: Flat colors, strong outlines, no gradients — ligne claire aesthetic.
- **Motifs**: Rocket ship (🚀) as logo, Snowy-white accent color, speech bubble callouts for stats.
- **States**: Unread items get a prominent red "UNREAD" badge; read items get a blue checkmark.

---

## Project Structure

```
tsundoku/
├── PLAN.md
├── package.json              # pnpm workspace root
├── pnpm-workspace.yaml
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   └── manifest.json     # Web app manifest for "Add to Home Screen"
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── store.ts          # MergeableStore + schema
│       ├── sync.ts           # WsSynchronizer setup
│       ├── persist.ts        # localStorage persister
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── ItemList.tsx
│       │   ├── ItemCard.tsx
│       │   ├── ItemForm.tsx
│       │   ├── StatsBar.tsx
│       │   └── SyncStatus.tsx
│       ├── styles/
│       │   └── theme.css
│       └── __tests__/
│           ├── store.test.ts
│           └── filters.test.ts
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts          # Express + WsServer
        └── __tests__/
            └── server.test.ts
```

---

## Iterations

Each iteration is self-contained, tested, and committed before the next begins.

### Iteration 1 — Scaffold
**Goal**: Both processes start without errors.

- `pnpm-workspace.yaml` + root `package.json`
- `server/`: `package.json`, `tsconfig.json`, `src/index.ts` (starts Express on 3000, logs "ready")
- `client/`: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx` (renders "Tsundoku")
- Tests: server starts and responds to GET /, client build produces output
- **Done when**: `pnpm --filter server start` and `pnpm --filter client dev` both run cleanly

### Iteration 2 — Schema & Store
**Goal**: TinyBase store exists with validated schema.

- `client/src/store.ts`: `createMergeableStore()` with full items schema + values schema
- Schema uses `setTablesSchema` + `setValuesSchema`
- Tests: insert valid item → succeeds; insert item missing required field → rejected; insert item with wrong type → rejected
- **Done when**: All schema tests pass

### Iteration 3 — WebSocket Sync
**Goal**: A cell written on the client appears in the server's JSON file.

- `server/src/index.ts`: `createWsServer` with `createPersisterForPath` using `createFilePersister`
- `client/src/sync.ts`: `createWsSynchronizer`, connect to `ws://localhost:8080`
- `client/src/App.tsx`: writes a test cell on mount, shows sync status
- Tests: start server, create client store, sync, assert server's data file contains the written cell
- **Done when**: Sync test passes; server `data/default.json` reflects client writes

### Iteration 4 — Add & List Comics UI
**Goal**: You can add a comic and see it in a list on mobile.

- `ItemForm.tsx`: form with all schema fields; validates before saving
- `ItemList.tsx`: renders each item as a card with title, series, read badge
- `ItemCard.tsx`: shows title, series, volume, read/unread status, condition
- `App.tsx`: FAB (+) button to open form, list below
- CSS: mobile-first, touch targets ≥ 44px, Tintin palette
- Tests: form submission creates a row in the store; list renders items from store
- **Done when**: Can add "The Blue Lotus" to the list on a phone screen

### Iteration 5 — Local Persistence
**Goal**: Data survives a page reload.

- `client/src/persist.ts`: `createLocalPersister(store, 'tsundoku')`, `startAutoPersisting()`
- Load persisted data on startup before rendering
- Tests: write item → simulate reload → assert item still in store
- **Done when**: Reload test passes; refreshing the browser keeps the comic list

### Iteration 6 — Read Tracking & Stats
**Goal**: Mark items read/unread; see collection stats.

- Toggle read status on each card (tap the badge)
- `StatsBar.tsx`: total owned, # read, # unread, % read — ligne claire speech bubble style
- Filter buttons: All | Unread | Read | Wishlist
- Tests: toggle read → store updates; filter logic returns correct subsets
- **Done when**: Stats update live as you toggle items

### Iteration 7 — Search & Sort
**Goal**: Find a specific comic quickly.

- Search input filters by title or series (case-insensitive)
- Sort: by title, by year, by acquired date, by condition
- TinyBase `useResultTable` + `createQueries` for filtering
- Tests: query returns correct rows for search term; sort orders correctly
- **Done when**: Searching "tintin" shows only Tintin series items

### Iteration 8 — PWA Manifest & Polish
**Goal**: App installs on phone home screen.

- `public/manifest.json`: name, icons, display: standalone, theme_color
- `<meta name="mobile-web-app-capable">` tags in `index.html`
- `SyncStatus.tsx`: connected/disconnected indicator in header
- Edit/delete comic (swipe or long-press menu on mobile)
- **Done when**: Phone shows "Add to Home Screen" prompt; app opens fullscreen

---

## Running the App

```bash
# Install all dependencies
pnpm install

# Terminal 1 — Start server (PC)
pnpm --filter server start
# Server runs at http://0.0.0.0:3000 and ws://0.0.0.0:8080

# Terminal 2 — Dev client (development only)
pnpm --filter client dev

# Production: server also serves the built client
pnpm --filter client build
pnpm --filter server start
# Then open http://<YOUR_PC_IP>:3000 on your phone
```

---

## Future: Games Expansion (Phase 2)

The `kind: 'game'` discriminator is already in the schema. Phase 2 adds:
- Game-specific fields: `platform`, `genre`, `completed` (boolean), `playedHours`
- Platform logos and color coding
- Separate "Games" tab in the navigation
- Same store, same sync, same server — just a new filter and form fields

---

## Notes

- TinyBase version: `^5.0.0`
- TinyBase booleans are stored as numbers (0/1) because the `boolean` Cell type is not supported in schemas; use `number` with validation.
- The WsServer path defaults to `/` if the client connects to `ws://host:8080`. Each unique path creates a separate synced room — useful if you want separate collections per user later.
- Server data is persisted to `server/data/<pathId>.json`. Back up this directory.
