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

**Subscribe to booleans, not store values.** `CardNode` reads
`useCanvasStore(s => s.selectedIds.has(card.id))` rather than `useSelectedIds()`. The
difference is board-wide: `selectedIds` is a `Set` rebuilt on every selection change, so
reading the Set itself re-renders *every* card on any click. The same applies to
`dropColumnId` and `draggingCardId`, which are broadcast to all cards as a string. Any new
per-card store read should follow this pattern.

Map cards are **lazily loaded** ([CardContent.tsx](src/components/Card/CardContent.tsx)):
Leaflet is ~154KB JS + ~16KB CSS, a third of the bundle, and most boards have no map. Its
stylesheet is imported inside `MapCardContent` — *not* `main.tsx` — so it travels with the
async chunk. Adding another heavy third-party card type should do the same.

### Dragging a card

Two entry points, both from [useCardDrag](src/hooks/useCardDrag.ts), and the distinction
matters:

- `onMouseDown` (bubble) — plain card surface, drags immediately.
- `onMouseDownCapture` (**capture**) — arms a 220ms press-and-hold, so a card can be grabbed
  from on top of its own inputs and editors. Capture is not optional here: sixteen content
  components call `stopPropagation()` on mousedown to protect their editors, so a
  bubble-phase listener on the card root never sees those presses at all.

The capture handler never calls `preventDefault`/`stopPropagation` — it is purely additive,
so a short click still focuses and places a caret exactly as before. Moving more than
`HOLD_SLOP` (5px) cancels the pending hold, which is what preserves click-drag text
selection inside an input. Elements running their own drag gesture (resize grips, the column
row grip) opt out with `data-no-card-drag`; the sketch and map surfaces are excluded already
because the hold only arms over text-editable targets.

Card positions are clamped to `WORLD_BOUNDS` (±12,000 world px, in
[utils/canvas.ts](src/utils/canvas.ts)) so a fast drag can't fling a card somewhere it can
never be found. `CanvasView` draws that boundary only while a drag is in progress, with
`borderWidth` divided by zoom so it stays hairline at every scale.

A drag also ends on `window.blur`. Without it, a mouseup that happens outside the window is
never heard and the card keeps following the cursor when focus returns.

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

### Touch / pointer input

Card dragging uses **pointer events** ([useCardDrag](src/hooks/useCardDrag.ts)), not mouse
events — touch never fires `mousemove` (browsers synthesize mouse events only *after* a tap
completes), so a mouse-event drag is simply inert on a phone. One code path now covers
mouse, touch and pen.

Consequence worth knowing: content components `stopPropagation()` on **mousedown**, which no
longer blocks the card root's `pointerdown`. The editable-target guard in the bubble handler
is therefore load-bearing, not defensive — remove it and every tap on an input starts a drag.

Canvas pan/pinch is separate ([useCanvasTouch](src/hooks/useCanvasTouch.ts)) and uses native
**touch events**, because `TouchEvent.touches` gives the whole set a pinch needs, where
pointer events would mean pairing up tracked pointers by hand.

`touch-action: none` on `.canvas` and `.card` is required, not cosmetic: without it the
browser scrolls the page instead of letting the gesture through. It also means the browser
does *not* fire `pointercancel` when a second finger lands, so `useCanvasTouch` explicitly
broadcasts `CANCEL_DRAG_EVENT` on pinch start — otherwise a card already in hand keeps
tracking finger one and gets flung across the board.

### PWA / distribution

The app is installable via [vite-plugin-pwa](vite.config.ts) (`generateSW`). Workbox
precaches the built shell, so an installed copy launches with no network — board data is
already local. Two deliberate choices:

- `registerType: 'prompt'`, not `autoUpdate`. Swapping the running bundle under a user
  mid-sentence risks losing a `contentEditable` that hasn't blurred yet, so the update is
  surfaced in Settings and applied on their click ([usePwa.ts](src/hooks/usePwa.ts)).
- `maximumFileSizeToCacheInBytes` is raised to 4MB. The split Leaflet chunk is ~154KB but
  the default limit would silently drop *any* oversized asset from the precache, breaking
  map cards offline.

`beforeinstallprompt` is captured and replayed from Settings (browsers only allow the prompt
from a user gesture, once per event). The Install row is hidden when no prompt is available,
rather than rendering a button that can't work — Firefox and desktop Safari never fire it.

Icons are generated by [scripts/generate-icons.mjs](scripts/generate-icons.mjs) (`npm run
icons`), which rasterizes analytically and encodes PNGs with Node's built-in `zlib` — no
image-processing dependency. `__APP_VERSION__` is injected from `package.json` via Vite
`define`, so the version stamped on feedback can't drift from the build.

### Feedback

[utils/feedback.ts](src/utils/feedback.ts) posts to a Google Apps Script web app that appends
a row to a spreadsheet ([feedback/](feedback/) holds the script and setup guide). The endpoint
comes from `VITE_FEEDBACK_ENDPOINT`; when unset, the form degrades to copy-to-clipboard rather
than losing what someone wrote.

Two constraints that shaped the implementation:

- The body is sent as `text/plain`, not JSON. A JSON content type triggers a CORS preflight
  that Apps Script doesn't answer; `text/plain` is a simple request. The script `JSON.parse`s
  it server-side. If the response still can't be read, it retries with `mode: 'no-cors'` and
  reports `sent-unconfirmed` — never a fake success.
- `collectContext()` reads **only `.length`** off boards/cards/connectors. No board content
  is ever transmitted. The UI states this next to the form; **if you extend the context,
  update that wording in `FeedbackPanel.tsx` to match.**

## Notes

- `graphify-out/` is generated knowledge-graph output, not source, and is not gitignored.
- Source files carry heavy explanatory comments by design; match that style when editing them.
