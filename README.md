# nexinote

A Milanote-inspired infinite canvas for visual note-taking — built with Vite, React, TypeScript, and Zustand.

Arrange notes, documents, task lists, tables, images, links, and columns freely on an infinite board, connect them with arrows, and organize everything across multiple boards. Everything is saved automatically to your browser's local storage.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev          # → http://localhost:5173

# 3. Type-check + production build
npm run build        # tsc (type-check only) + vite build → dist/

# 4. Preview the production build
npm run preview
```

> `tsc` runs with `noEmit` — it only type-checks. Vite produces the actual
> bundle in `dist/`. No compiled `.js` files are written next to the sources.

---

## Features

- **Infinite canvas** — pan, zoom-to-cursor, and a live minimap overview
- **Multiple boards** — a gallery of boards, each with its own cards + connectors
- **7 card types** — note, document, task list, table, image, link, and column
- **Connectors** — SVG arrows between cards with 6 anchor points (optionally animated)
- **Image upload** — click-to-upload, **drag & drop onto the canvas**, or **paste from the clipboard**; large images are downscaled automatically so they fit in local storage
- **Document editor** — documents open in a focused, full-page writing view (Milanote-style)
- **Templates** — start a board from a saved layout
- **Auto-save** — every change is persisted to `localStorage` immediately

---

## Card Types

| Card | What it's for |
|------|---------------|
| 📝 **Note** | Short rich-text note, edited inline on the card |
| 📄 **Document** | Long-form writing — shows a compact preview tile on the board, opens into a full-page editor |
| ✅ **Task** | Checklist with square / circle / star checkbox styles + progress bar |
| 📊 **Table** | Editable grid of cells |
| 🖼️ **Image** | Uploaded (downscaled & embedded) or linked by URL; cover / contain fit |
| 🔗 **Link** | URL with a description |
| ▤ **Column** | A container that stacks mixed note / task / link items |

### Notes vs. Documents

A **note** is a small card you type into directly on the canvas — good for short
thoughts. A **document** behaves like a file: on the board it's a compact preview
tile showing an excerpt and word count, and **double-clicking it (or pressing
"Open")** launches a focused full-page editor with a formatting toolbar. This
mirrors how Milanote separates quick notes from long-form documents.

---

## How the Files Connect

```
src/
├── main.tsx                Entry point — mounts React into index.html
├── App.tsx                 Root — routes between board gallery and canvas
│
├── types/
│   └── index.ts            All TypeScript shapes (Card union, Board, Store…)
│
├── store/
│   └── index.ts            Zustand store — single source of truth + localStorage
│
├── utils/
│   ├── canvas.ts           Pure math (screen↔world, zoom, fit-to-cards)
│   ├── image.ts            Read + downscale uploaded images to data URLs
│   └── text.ts             HTML → plain text + word count helpers
│
├── hooks/
│   ├── useKeyboard.ts      Global keyboard shortcuts
│   ├── useCanvasPan.ts     Space+drag / middle-click panning
│   ├── useCanvasZoom.ts    Scroll-to-zoom toward cursor
│   └── useCardDrag.ts      Per-card drag with zoom-corrected delta
│
└── components/
    ├── Boards/             Board gallery (create / open / rename / delete)
    ├── Canvas/             Viewport, world transform, connector layer, drag-drop
    ├── Card/               Card shell (CardNode) + per-type content components
    ├── Toolbar/            Bottom floating tool palette
    ├── SideTaskbar/        Contextual formatting tools for the selection
    ├── TopBar/             Board name + zoom + navigation
    ├── MiniMap/            2D overview of all cards
    └── UI/                 Modals — Templates, Settings, Document editor, Table size
```

---

## Core Concepts

### The Camera
The camera is 3 numbers: `{ x, y, zoom }`. The entire world is rendered with one
CSS transform: `translate(camera.x px, camera.y px) scale(camera.zoom)`.

### Coordinate Systems
Cards live in **world space**; the screen is **screen space**. The two conversions
live in `utils/canvas.ts` and are used everywhere:

```
worldX  = (screenX - camera.x) / camera.zoom   ← screen → world
screenX = worldX * camera.zoom + camera.x       ← world → screen
```

### The Store (Zustand)
Components read state via selector hooks (`useCards()`, `useCamera()`, …) and
trigger actions (`addCard()`, `updateCard()`, `openDocument()`, …). The active
board's cards and connectors are persisted to `localStorage` after every mutation,
so work is never lost.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space + drag | Pan the canvas |
| Scroll | Zoom toward cursor |
| Double-click canvas | Add a note at the cursor |
| Double-click document | Open it in the full-page editor |
| Drag image onto canvas | Add it as an image card |
| Paste image | Add it as an image card at the viewport center |
| Delete / Backspace | Delete selected cards |
| Ctrl/Cmd + A | Select all |
| Ctrl/Cmd + 0 | Reset view |
| Escape | Deselect all / close the document editor |
