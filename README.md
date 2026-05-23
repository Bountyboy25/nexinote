# Canvas App — Phase 1

A Milanote-inspired infinite canvas built with Vite, React, TypeScript, and Zustand.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:5173
```

---

## How the Files Connect

```
src/
├── main.tsx              Entry point — mounts React into index.html
├── App.tsx               Root component — assembles all sections
│
├── types/
│   └── index.ts          TypeScript shapes (Card, Camera, Store)
│                         ↑ Every other file imports from here
│
├── store/
│   └── index.ts          Zustand store — single source of truth
│                         ↑ Components read/write state here
│
├── utils/
│   └── canvas.ts         Pure math functions (screen↔world conversion)
│                         ↑ Used by hooks and components
│
├── hooks/
│   ├── useKeyboard.ts    Global keyboard shortcuts
│   ├── useCanvasPan.ts   Space+drag / middle-click panning
│   ├── useCanvasZoom.ts  Scroll-to-zoom toward cursor
│   └── useCardDrag.ts    Per-card drag with zoom-corrected delta
│
├── components/
│   ├── Canvas/
│   │   └── CanvasView.tsx  The viewport + world div + card renderer
│   ├── Card/
│   │   └── CardNode.tsx    Individual card (reads its own store slice)
│   ├── TopBar/
│   │   └── TopBar.tsx      Navigation bar with zoom display
│   ├── Toolbar/
│   │   └── Toolbar.tsx     Bottom floating tool palette
│   └── MiniMap/
│       └── MiniMap.tsx     Canvas 2D overview of all cards
│
└── styles/
    └── global.css          CSS design tokens + reset
```

---

## Core Concepts Explained

### The Camera
The camera is 3 numbers: `{ x, y, zoom }`.
- `x` / `y` = how far the world has been panned (screen pixels)
- `zoom` = scale multiplier (1 = 100%, 2 = 200%)

The entire canvas is one CSS transform:
```
translate(camera.x px, camera.y px) scale(camera.zoom)
```

### Coordinate Systems
Cards live in **world space**. The screen is **screen space**.

```
worldX = (screenX - camera.x) / camera.zoom   ← screen → world
screenX = worldX * camera.zoom + camera.x      ← world → screen
```

These two formulas are in `utils/canvas.ts` and used everywhere.

### The Store (Zustand)
```
Component reads state → useCards(), useCamera(), etc.
Component triggers action → addCard(), updateCard(), etc.
Store updates → subscribed components re-render
```

No prop drilling. Any component anywhere can access or update any state.

### Custom Hooks
Each interaction is isolated in a hook:
- `useCanvasPan` — knows nothing about zoom
- `useCanvasZoom` — knows nothing about pan
- `useCardDrag` — knows nothing about canvas pan/zoom

This makes each behavior easy to understand, test, and modify.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space + drag | Pan the canvas |
| Scroll | Zoom toward cursor |
| Double-click canvas | Add note at cursor |
| Delete / Backspace | Delete selected cards |
| Ctrl + A | Select all |
| Ctrl + 0 | Reset view |
| Escape | Deselect all |

---

## Phase 2 Preview (what comes next)

- **Rich text editor** — Tiptap embedded in card body
- **Table/formula card** — Hyperformula cell engine
- **Connectors** — SVG arrows between cards
- **Media cards** — Image upload and display
- **Templates** — Saved board layouts
