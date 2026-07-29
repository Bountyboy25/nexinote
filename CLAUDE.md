# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # tsc (type-check only, noEmit) + vite build → dist/
npm run typecheck  # tsc --noEmit alone
npm run preview    # Serve the production build
```

There is no test framework and no linter configured — `tsc` is the only gate. It runs
`strict` plus `noUnusedLocals` / `noUnusedParameters`, so an unused import or parameter
fails the build. Always run `npm run typecheck` after editing.

`@/*` maps to `src/*` and is declared in **both** `tsconfig.json` and `vite.config.ts` —
changing one alias requires changing the other.

## Architecture

A Milanote-style infinite-canvas note app: Vite + React 18 + TypeScript + Zustand,
persisted entirely to `localStorage`. No backend, no router. The only non-React runtime
dependencies are `zustand`, `nanoid`, and `leaflet` (map cards only).

### Routing is store state, not a router

[App.tsx](src/App.tsx) branches on `activeBoardId`: `null` → `BoardsView` gallery,
otherwise the canvas editor (TopBar + SideTaskbar + CanvasView + Toolbar + MiniMap +
DocumentEditorModal). `openBoard()` / `backToBoards()` are the only navigation.

### The store

[src/store/index.ts](src/store/index.ts) is one Zustand store holding *all* app state; its
shape is declared as `CanvasStore` in [src/types/index.ts](src/types/index.ts). Adding state
or an action means editing both files.

Two consumption patterns coexist and both are intentional:
- Selector hooks (`useCards()`, `useCamera()`, `useSelectedIds()`, …) for reactive reads.
- `useCanvasStore.getState()` or the frozen `useCanvasActions()` object for actions —
  these references are stable, so handlers can use empty dependency arrays.

The active board's `cards`/`connectors` live at the top level of the store while it is open;
`persistActiveBoard()` folds them back into `boards[]` after every mutation. Writes to
`localStorage` are **debounced 400 ms** and flushed on `beforeunload`/`pagehide`, because
media cards embed base64 image data and serializing on every mousemove is prohibitive.

Storage keys: `nexinote_boards`, `nexinote_settings`, and `nexinote-theme` (written by a
separate `persist`-middleware store, [src/store/useThemeStore.ts](src/store/useThemeStore.ts)).

### Coordinate system

Camera is `{ x, y, zoom }`; the world is one CSS transform
`translate(x, y) scale(zoom)`. Conversions live in [src/utils/canvas.ts](src/utils/canvas.ts)
and must be used rather than re-derived. Two constants are baked in across files:

- `y: 52` — TopBar height, the default/reset camera Y (`resetView`, `fitCameraToCards`).
- `CARD_H = 160` — an *approximation* of card height used for connector anchor math in
  [store/index.ts](src/store/index.ts), [ConnectorLayer.tsx](src/components/Canvas/ConnectorLayer.tsx),
  and `fitCameraToCards`. Real card heights are content-driven; column drop-targeting
  deliberately hit-tests real DOM rects instead ([useCardDrag.ts](src/hooks/useCardDrag.ts)).

Any drag delta must be divided by `camera.zoom` to convert screen → world.

### Cards

`Card` is a discriminated union on `type` — 15 of them: note, document, task, table, media,
link, column, sketch, color, audio, video, heading, comment, map, board.
[CardNode.tsx](src/components/Card/CardNode.tsx) is the shared shell (position, selection
ring, drag handle, header/footer) and dispatches content via a switch. **Adding a card type
touches four places**: the union + `CardType` in `types/index.ts` (`ActiveTool` derives from
`CardType`), the `createCard` switch in the store, `CARD_ICONS` and the `CardContent` switch
in `CardNode`, and a button or dropdown entry in
[Toolbar.tsx](src/components/Toolbar/Toolbar.tsx).

Storage budget drives several card designs. localStorage is ~5MB for every board combined,
so: sketches store vector strokes rather than a rasterized canvas, audio uploads are capped
at `AUDIO_MAX_BYTES` ([utils/media.ts](src/utils/media.ts)), video is URL-only, and map cards
persist only the view box and pins. Any new card that wants to embed binary data needs the
same scrutiny.

`CardNode` is `memo`'d on purpose — dragging replaces only that card's object, so other
cards bail out on the shallow prop check instead of re-rendering per mousemove.

`BaseCard.locked` pins a card's **position only** — [useCardDrag](src/hooks/useCardDrag.ts)
still selects the card, then bails before starting a drag, and resize grips hide. Selection,
editing, connecting and deleting all behave normally, so a lock never reads as a broken card.
`toggleLock(id?)` with no id toggles the whole selection, and only unlocks when every
selected card is already locked (Ctrl/Cmd+L).

### Columns contain real cards

`ColumnCard.content.items` is `Card[]` — whole cards, not a separate item model. Every type
is allowed **except another column** (no sensible layout, no obvious exit), refused at all
three entry points: `absorbCardIntoColumn`, the add menu, and a defensive filter when
rendering. Consequences:

- Cards live in **two places**: top-level `cards`, and nested in a column. Anything
  resolving a card by id must use `findCardDeep()` (exported from the store) — that's why
  `updateCard` has a column branch and `DocumentEditorModal` doesn't call `cards.find`.
  Miss this and edits inside a column silently no-op.
- The `CardContent` factory lives in its own module
  ([Card/CardContent.tsx](src/components/Card/CardContent.tsx)) with two consumers —
  `CardNode` and `ColumnCardContent`. Importing it from `CardNode` would be a cycle.
- Collapsed rows don't mount their content, so a column of maps costs nothing until opened.
- `ejectFromColumn` puts a card back on the canvas; without it, dropping something in
  would be one-way.
- Board cards can be nested inside a column, so `promoteOrphanedSubBoards` flattens column
  items, and deleting an embedded card goes through `removeFromColumn` rather than a plain
  content patch.
- `migrateLegacyColumns()` in the store converts the old `ColumnItem` stubs on load
  (identified by having no `content` field). `ColumnItem` is kept in types for that path
  only — nothing writes it.

Two cards embed third-party interactive surfaces (map, video/audio embeds). Anything like
that must stop the **native** event from reaching the canvas — the canvas registers real
`addEventListener` handlers for wheel-zoom and card-drag, and React's `stopPropagation`
fires too late at the React root to help. `MapCardContent` uses Leaflet's
`DomEvent.disableScrollPropagation` / `disableClickPropagation` for exactly this.

### Sub-boards

A board card owns a real child `Board` whose `parentId` points at the board holding the
card, forming a tree. Consequences worth knowing before touching board code:

- The gallery lists only `!parentId` boards; `openBoard()` is the only way into a child.
- [TopBar](src/components/TopBar/TopBar.tsx) renders the trail from `boardAncestry()`
  (exported from the store), which walks `parentId` upward.
- `deleteBoard` **cascades** to all descendants — they'd otherwise be unreachable.
- Deleting a board *card* instead **promotes** its child to a root board
  (`promoteOrphanedSubBoards`), so the work resurfaces in the gallery rather than vanishing.
  `deleteCard`, `deleteSelected`, and `clearBoard` all route through it.

### Icons (boards and documents)

Boards carry `icon` + `accent`; document cards carry the same pair on `content`. Both draw
from one registry, [UI/glyphs.tsx](src/UI/glyphs.tsx) — **adding an icon is a single entry
in `GLYPHS`**, and it appears in the picker automatically. The names are deliberately
generic (`GLYPHS`, `GlyphIcon`, `IconPicker`) because this is no longer board-only.

`icon` is typed `string`, not a union of the current keys, for two reasons: a board saved
with a glyph a later build renames still loads (falling back to `DEFAULT_GLYPH`), and the
same field carries **custom uploaded images** without a second shape — if it's a data URL
(`isCustomIcon()`), `GlyphIcon` renders an `<img>`. Uploads are downscaled to `ICON_MAX_DIM`
(96px); icons render at ~30px and the storage budget is shared with every card.

[IconPicker](src/UI/IconPicker.tsx) portals to `document.body` with fixed positioning
measured from its trigger. Every host (`CardNode`, gallery tile) sets `overflow: hidden`,
and a canvas card additionally inherits the world's `scale()` — an in-place popover would be
clipped and would shrink with the zoom. Any future popover launched from inside a card needs
the same treatment.

### Templates

There is no toolbar button — applying a template **erases the board**, which is not a thing
to sit one stray click away in a tool dock. Two entry points instead:

- **Automatic**, the first time a board or sub-board is opened. `Board.templatePrompted`
  records that the offer was made (accepted *or* declined), so a board is asked exactly once.
  `migrateBoards` back-fills it as `true` for pre-existing boards that already hold cards,
  otherwise every established board would be greeted with an offer to wipe it.
- **Deliberate**, from Settings. That row is hidden in the gallery, where there is no active
  board to apply to.

`TemplatesModal` takes `mode`: `'welcome'` (new board — nothing to lose, so picks apply
immediately and declining gets its own button) or `'menu'`. When the board has content,
either mode routes the pick through a confirmation naming the live card/connector counts.

Apply goes through the store's `applyTemplate`, not a raw `setState`. The old path wrote
`cards` directly, which skipped `persistActiveBoard` (a template applied and then abandoned
by closing the tab was never saved) and `promoteOrphanedSubBoards` (wiping a board card
stranded its child board).

### Overlay geometry

Fixed-position chrome shares the bottom of the screen, and the toolbar's width grew with the
card count (~716px at 17 buttons). Because it is centre-anchored, **any horizontal
separation from it depends on viewport width** — the minimap collided with it below ~1140px,
which includes a 1920px display at 175% OS scaling. The minimap therefore clears it
*vertically* (`bottom: 92px` = toolbar offset + height + gap), which holds at every width.
Prefer that reasoning over widening gaps when placing new overlays.

Do not add `overflow` to the toolbar to constrain it: its hover dropdowns are absolutely
positioned children and would be clipped.

### Rich text

Notes, tables, and documents are `contentEditable` divs formatted with
`document.execCommand`. The commands are issued from
[SideTaskbar](src/components/SideTaskbar/SideTaskbar.tsx) and
[DocumentEditorModal](src/components/UI/DocumentEditorModal.tsx), which use
`onMouseDown` + `preventDefault()` so the DOM selection survives the click. Card editors
`stopPropagation()` on mousedown/keydown so typing doesn't trigger card drag or global
shortcuts. Editor HTML is set once on mount and saved on blur — do not make it a
controlled input.

SideTaskbar dropdowns are `createPortal`'d into `document.body`: the taskbar uses
`backdrop-filter`, which makes it a containing block for `position: fixed` children.

### Theming

Everything is colored through `--nx-*` CSS custom properties written onto `<html>` by
[applyTheme.ts](src/theme/applyTheme.ts) from the four themes in
[themes.ts](src/theme/themes.ts). `initTheme()` runs in [main.tsx](src/main.tsx) before
render so vars exist on first paint.

- [styles/nuclear-base.css](src/styles/nuclear-base.css) defines the tokens and must be
  imported before [styles/global.css](src/styles/global.css), which aliases the older
  semantic names (`--bg`, `--accent`, `--text-1`, …) onto the `--nx-*` tokens.
- Never hardcode a color in a component — use a token, or the theme switcher won't affect it.
- Display fonts (Rajdhani / Space Grotesk / Share Tech Mono) are loaded from Google Fonts
  in [index.html](index.html); new `--nx-font-*` roles need a link there too.

### Two directories named "UI"

- [src/UI/](src/UI/) — theme-token design-system primitives (`Icon`, `Button`, `Toggle`,
  `Modal`, `ThemeSwitcher`, `ReactorGauge`, …), imported as `@/UI/…`.
- [src/components/UI/](src/components/UI/) — app-specific modals (Templates, Settings,
  Document editor, Table size).

Check which one an import means before adding to either.

### Layering

Arrows sit at `z-index: 1`, the world/cards at `2`, SideTaskbar at `500`, chrome
(TopBar/Toolbar) at `1000`, connector and settings popovers at `3000`, the document editor
at `3500`. Keep new overlays consistent with this scale.

### Images

[utils/image.ts](src/utils/image.ts) downscales uploads to 1600px on the longest edge
(GIF/SVG pass through untouched) and returns a data URL that is stored inline in the board
JSON. Images arrive via click-to-upload, canvas drag & drop, or paste
([CanvasView.tsx](src/components/Canvas/CanvasView.tsx)).

## Notes

- `graphify-out/` is generated knowledge-graph output, not source, and is not gitignored.
- Source files carry heavy explanatory comments by design; match that style when editing them.
