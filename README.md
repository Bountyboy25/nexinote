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

- **Infinite canvas** — pan, zoom-to-cursor, and a live minimap that highlights the card
  you're dragging and fades away when you leave it alone
- **Multiple boards** — a gallery of boards, each with its own cards + connectors, and
  **sub-boards** nested inside a board via a board card
- **15 card types** — note, document, task list, table, image, link, column, sketch, color,
  audio, video, heading, comment, map, and board
- **Connectors** — SVG arrows between cards with 6 anchor points (optionally animated)
- **Image upload** — click-to-upload, **drag & drop onto the canvas**, or **paste from the clipboard**; large images are downscaled automatically so they fit in local storage
- **Document editor** — documents open in a focused, full-page writing view (Milanote-style)
- **Lock cards** — pin a card's position so it can't be nudged while you work around it
  (Ctrl/Cmd+L or the padlock in the card header). Contents stay fully editable
- **Board icons** — give any board or sub-board a built-in glyph and accent color, or
  upload your own image, so a gallery of projects reads at a glance
- **Templates** — offered automatically the first time you open a board or sub-board, and
  available any time from Settings. Applying one replaces the board, so it always warns
  first when there's work to lose
- **Auto-save** — every change is persisted to `localStorage` immediately

---

## Card Types

| Card | What it's for |
|------|---------------|
| 📝 **Note** | Short rich-text note, edited inline on the card |
| 📄 **Document** | Long-form writing — the smallest card: a custom icon + word count, opens into a full-page editor |
| ✅ **Task** | Checklist with square / circle / star checkbox styles + progress bar |
| 📊 **Table** | Editable grid of cells |
| 🖼️ **Image** | Uploaded (downscaled & embedded) or linked by URL; cover / contain fit |
| 🔗 **Link** | URL with a description |
| ▤ **Column** | A container that stacks whole cards of any type (except other columns) |
| ✏️ **Sketch** | Freehand drawing — pens, any color, nib sizes, eraser, undo, resizable, focus view |
| 🎨 **Color** | A swatch with hex, picker, presets, click-to-copy, and a contrast preview |
| 🔊 **Audio** | A small uploaded clip (≤2MB) or a track link |
| 🎬 **Video** | YouTube / Vimeo / direct `.mp4` link — never embedded in storage |
| 🅷 **Heading** | Section title for a region of the board — 3 sizes, 3 alignments |
| 💬 **Comment** | Append-only thread of timestamped remarks |
| 🗺️ **Map** | Real OpenStreetMap slippy map — search a place, drop and label pins |
| 🗂️ **Board** | A board nested inside this one, to keep a big project uncluttered |

### Sketch, color, and the storage budget

Sketches are stored as **vector strokes**, not a canvas image — so they stay sharp at 400%
zoom and cost a fraction of the space. That matters because everything shares one ~5MB
`localStorage` budget, which is also why audio uploads are capped and video is link-only.

### Columns hold real cards

Drop **any** card onto a column — a table, a map, a sketch, a sub-board — and it moves in
whole. Nothing is flattened or converted: a table dropped into a column is still an editable
table. Columns are the one thing a column won't take, since containers inside containers have
no sensible layout. Rows collapse to keep long stacks tidy (collapsed cards aren't rendered
at all, so a column of maps stays fast), and the ↳ button lifts a card back onto the board.

### Sub-boards

A **board card** holds a real board inside the current one. Click it to descend; the top bar
grows a breadcrumb trail to climb back out. Nested boards never appear in the main gallery,
so a project can hold a dozen of them without turning the landing screen into a wall of
tiles. Deleting a board deletes everything nested inside it (you'll be told how much);
deleting just the *card* releases its board back to the gallery instead of destroying it.

### Notes vs. Documents

A **note** is a small card you type into directly on the canvas — good for short
thoughts. A **document** behaves like a file: on the board it's just an icon and a
word count, and **clicking it** launches a focused full-page editor with a
formatting toolbar. Keeping the contents out of the tile is deliberate — a board
full of documents should read as a shelf of files, not a wall of 12px text.

Because the icon is the only thing telling one document from another at a glance,
it's **customizable**: hover a document card and click the swatch button to pick any
glyph, accent color, or your own uploaded image — the same picker boards use. Document
cards are the smallest type on the canvas, sized to the icon rather than to content
they no longer display.

### Drawing up close

Sketch cards have a **focus view** (the ⌖ button in the pen tray, Esc to leave): the
same drawing, magnified to fill most of the screen, so fine strokes are actually
workable. It's a magnifier, not a separate canvas — strokes stay exactly where they
were. The pen tray also has a **color picker** beside the six theme pens for choosing
any color at all.

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
| Drag a card | Move it — grab any blank part of the card |
| Press & hold a card | Hold ~0.2s to drag from anywhere, including over its text |
| Space + drag | Pan the canvas |
| Scroll | Zoom toward cursor |
| Double-click canvas | Add a note at the cursor |
| Double-click document | Open it in the full-page editor |
| Drag image onto canvas | Add it as an image card |
| Paste image | Add it as an image card at the viewport center |
| Delete / Backspace | Delete selected cards |
| Ctrl/Cmd + L | Lock / unlock the selected cards in place |
| Ctrl/Cmd + A | Select all |
| Ctrl/Cmd + 0 | Reset view |
| Escape | Deselect all / close the document editor |
