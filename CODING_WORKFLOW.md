# Nexinote — Coding Workflow

How changes get made in this repo, written down while doing four of them. Each change
is its own category with the step-by-step instructions that were actually followed, and
the general workflow they all share is at the top. Follow the same shape for future work.

---

## The general workflow (every change)

1. **Read before writing.** Find every file the change touches *before* editing any of
   them. `CLAUDE.md` is the map — it names the files and the traps (memo'd cards,
   capture-phase drag, portal-only popovers, the localStorage budget).
2. **Reuse the existing mechanism.** Nexinote usually already has the pattern you need
   (a registry, a token, a clamp, a portal). Extending it is smaller and safer than
   inventing a parallel one.
3. **Break the work into categories** and finish one category at a time — don't
   interleave half-done changes.
4. **Update the comments and docs the change invalidates.** Source files here carry
   heavy explanatory comments by design; a stale comment is a bug for the next reader.
   That includes `CLAUDE.md`.
5. **Gate on the compiler.** `npm run typecheck` after editing, `npm run build` before
   calling it done. `tsc` is the only gate (strict + `noUnusedLocals` /
   `noUnusedParameters` — an unused import fails the build). There are no tests.
6. **Never hardcode a color** — every color goes through a `--nx-*` token so the theme
   switcher keeps working.

---

## Category 1 — The Taskbar (one adaptive bar)

**Goal:** combine the bottom Toolbar and the left SideTaskbar into a single dock that
changes depending on whether you are on a card or not.

**Steps taken:**

1. Read both components and both CSS modules; note what each mode needs:
   - *Build mode* (no selection): card-creation tools, board actions, reset view.
   - *Context mode* (card selected): formatting for notes/documents, rows/cols for
     tables, task tools, column shortcuts, duplicate/delete.
2. Create [src/components/Toolbar/SelectionTools.tsx](src/components/Toolbar/SelectionTools.tsx)
   — the SideTaskbar's tools re-laid horizontally for the bottom bar, plus a **Done**
   button that deselects (escape hatch back to build tools).
   - Formatting buttons keep the `onMouseDown` + `preventDefault()` rule so the
     `contentEditable` selection survives the click — `execCommand` acts on it.
   - The color/size hover panels became absolutely-positioned children opening
     *upward*, like the existing note/media dropdowns. No portal needed — the toolbar
     deliberately has no `overflow`, which is exactly why one must never be added.
3. In [Toolbar.tsx](src/components/Toolbar/Toolbar.tsx), subscribe **narrowly** to the
   first selected card (one card object, not `useCards()`, so the bar doesn't
   re-render on every board mutation) and branch the bar's children on it.
4. Remove the rail: delete `src/components/SideTaskbar/`, drop it from
   [App.tsx](src/App.tsx), slide the minimap into the freed corner
   ([MiniMap.module.css](src/components/MiniMap/MiniMap.module.css)).
5. Fix every comment that still said "SideTaskbar" (`RichTextCard`,
   `TableCardContent`, `CanvasView`, `App`) and rewrite the relevant `CLAUDE.md`
   sections (new "One toolbar, two modes" section; layering table).

**Trap to remember:** the toolbar must never get `overflow` — its dropdowns and the new
context panels are absolute children and would be clipped.

---

## Category 2 — The Document card (contrast with the theme)

**Goal:** opening a document to view/edit must be readable under every theme — theme
ink on theme glow made the words hard to see.

**Steps taken:**

1. Decide the mechanism: a **"paper" surface that inverts the theme**, expressed as
   three new tokens so nothing is hardcoded:
   `--nx-doc-paper`, `--nx-doc-ink`, `--nx-doc-accent`.
2. Add the trio to all four themes in [themes.ts](src/theme/themes.ts) (light page +
   dark ink for the three dark themes, tinted toward each theme's hue; plain white for
   the already-light Isotope) and defaults in
   [nuclear-base.css](src/styles/nuclear-base.css) so first paint has values.
   `applyTheme()` iterates `theme.vars` generically — new keys need no code change.
3. Restyle only the **writing surface** in
   [DocumentEditorModal.module.css](src/components/UI/DocumentEditorModal.module.css):
   `.editor` background/color, plus everything drawn *inside* it (placeholder,
   blockquote, `pre`, links, `hr`, scrollbar) re-derived from the doc tokens via
   `color-mix`. The modal's header/toolbar/footer stay theme-colored.
4. Re-seed the text-color picker default from `--nx-doc-ink` in
   [DocumentEditorModal.tsx](src/components/UI/DocumentEditorModal.tsx) — the old
   `--nx-ink` default is near-white on dark themes and would vanish on paper.

**Rule created:** anything rendered inside the editor surface uses `--nx-doc-*`, never
`--nx-ink`.

---

## Category 3 — Icons on cards (change the basic icon on all cards)

**Goal:** every card's header icon is customizable, not just boards and document tiles.

**Steps taken:**

1. Reuse the whole existing stack — `GLYPHS` registry, `GlyphIcon`, `IconPicker`
   ([src/UI/glyphs.tsx](src/UI/glyphs.tsx), [src/UI/IconPicker.tsx](src/UI/IconPicker.tsx)) —
   rather than building a second picker.
2. Add `icon?: string` and `accent?: string` to `BaseCard` in
   [types/index.ts](src/types/index.ts). Optional on purpose: unset falls back to the
   type's default glyph (`CARD_ICONS`), so every existing board loads unchanged, and
   the loose `string` typing carries both glyph keys and uploaded data-URL images —
   same reasoning as `Board.icon`.
3. In [CardNode.tsx](src/components/Card/CardNode.tsx), turn the header icon `<span>`
   into a `<button>` that toggles an `IconPicker`; `onPick` →
   `updateCard(card.id, { icon, accent })`.
   - `stopPropagation` on `pointerdown` so pressing the button never doubles as a
     drag start (the drag hook listens on pointer events, not mouse events).
   - The picker portals to `document.body` — required, because the card clips
     overflow *and* inherits the world's `scale()` transform.
4. Honor the custom icon where cards render outside the shell: column rows
   ([ColumnCardContent.tsx](src/components/Card/types/ColumnCardContent.tsx)) show
   `item.icon` when set.
5. Update the `CLAUDE.md` icons section ("boards, documents, and every card").

---

## Category 4 — Boundary line (can't drag a card past the screen edge)

**Goal:** a boundary around the edges of the screen that a dragged card cannot pass.

**Steps taken:**

1. Locate the existing clamp: drags already ran through `clampCardToWorld`
   (±12,000 world px). The new rule is stricter, so it *replaces* that call rather
   than adding a second one.
2. Add `clampCardToView(x, y, w, h, camera)` to
   [utils/canvas.ts](src/utils/canvas.ts): convert the visible viewport (below the
   52px TopBar, now the exported `TOPBAR_H`) to world coordinates with the existing
   `screenToWorld`, intersect with `WORLD_BOUNDS`, clamp the card's whole footprint.
   - Edge case handled: a card *bigger* than the viewport (deep zoom) collapses the
     max bound below the min — `Math.max` keeps min ≤ max so the top-left corner pins
     on screen instead of jittering.
3. Swap the call in [useCardDrag.ts](src/hooks/useCardDrag.ts) (camera is read fresh
   each move, so mid-drag zooming stays correct) and delete the now-unused
   `clampCardToWorld`.
4. Draw the line: replace the old world-space bounds box in
   [CanvasView.tsx](src/components/Canvas/CanvasView.tsx) with `.dragFence` — a
   **screen-space** dashed border fixed to the viewport (top at 52px to match the
   clamp), shown only while a drag is in progress so it reads as a fence around the
   gesture, not permanent chrome.
5. Update the "Dragging a card" section of `CLAUDE.md`.

**Behavioral note:** to move a card beyond the current view, pan the canvas and drag
again — the fence makes "card lost off-screen" impossible by construction.

---

## Finishing checklist (used for this batch, reuse verbatim)

- [x] `npm run typecheck` — clean
- [x] `npm run build` — clean (bundle + PWA precache generated)
- [x] No hardcoded colors — new colors exist only as theme tokens
- [x] Stale comments fixed everywhere the change reached
- [x] `CLAUDE.md` updated to match the new architecture
