// ─────────────────────────────────────────────────────────────
// TYPES — Phase 3: boards, document card, settings, anchors
// ─────────────────────────────────────────────────────────────

// ── Task item ─────────────────────────────────────────────────
export interface TaskItem {
  id: string
  text: string
  done: boolean
}

export type CheckboxStyle = 'square' | 'circle' | 'star'

// ── Anchor points on a card ───────────────────────────────────
export type AnchorPoint =
  | 'top-left' | 'top-right'
  | 'mid-left' | 'mid-right'
  | 'bot-left' | 'bot-right'

// ── Connector ─────────────────────────────────────────────────
// Nuclear-themed connector styles:
//   beam        — Particle Beam: solid Cherenkov line + glow (default)
//   pulse       — Reactor Pulse: hot animated energy dashes
//   hazard      — Hazard Tape: amber striped warning line
//   decay       — Decay Trail: red dotted line, radiation-trefoil head
//   containment — Containment: double-walled line with a seal end-cap
export type ConnectorStyle = 'beam' | 'pulse' | 'hazard' | 'decay' | 'containment'

export interface Connector {
  id: string
  fromId: string
  toId: string
  // LEGACY — only present on boards saved before connectors became
  // continuous. Attachment is now a live ray/rect intersection computed
  // per frame in ConnectorLayer, so this field is written by nothing and
  // read by nothing; it is kept only so old saved boards still parse.
  toAnchor?: AnchorPoint
  style?: ConnectorStyle   // Defaults to 'beam'
}

// ── Card variants ─────────────────────────────────────────────
interface BaseCard {
  id: string
  x: number
  y: number
  width: number
  title: string
  color?: string
  createdAt: number
  // Pinned in place: no dragging, no resize grips. Deliberately scoped to
  // POSITION only — a locked card can still be selected, edited, connected
  // and deleted, so "locked" never means "mysteriously unresponsive".
  locked?: boolean
}

export interface NoteCard extends BaseCard {
  type: 'note'
  content: { html: string }
}

export interface DocumentCard extends BaseCard {
  type: 'document'
  content: { html: string }
}

export interface TaskCard extends BaseCard {
  type: 'task'
  content: {
    items: TaskItem[]
    checkboxStyle?: CheckboxStyle
  }
}

export interface TableCard extends BaseCard {
  type: 'table'
  content: { rows: string[][] }
}

export interface MediaCard extends BaseCard {
  type: 'media'
  content: { src: string; fit: 'cover' | 'contain' }
}

export interface LinkCard extends BaseCard {
  type: 'link'
  content: { url: string; description: string }
}

// ── Column card ────────────────────────────────────────────────

// LEGACY shape. Columns used to flatten a dropped card into one of
// three text stubs, which destroyed everything else about it — a table
// became a title, a task list became loose strings. Boards saved before
// the change still contain these; migrateLegacyColumns() in the store
// converts them to real cards on load. Nothing writes this any more.
export interface ColumnItem {
  id: string
  type: 'note' | 'task' | 'link'
  title: string
  text: string    // plain-text body / url / task description
  done?: boolean  // for task items
  color?: string  // optional per-item accent
}

export interface ColumnCard extends BaseCard {
  type: 'column'
  content: {
    // Real, whole cards — a column is a container, not a converter.
    // Every card type is allowed EXCEPT another column: nesting
    // containers inside containers has no sensible layout or exit path,
    // so it is blocked at every entry point (drop, add menu, render).
    items: Card[]
  }
}

// ── Sketch card ────────────────────────────────────────────────
// Strokes are stored as VECTORS, not a rasterized canvas image: a
// PNG data URL of a 280×220 drawing costs ~40KB of the ~5MB
// localStorage budget, while the same drawing as points costs well
// under 1KB — and stays crisp at any zoom.
export interface SketchStroke {
  id: string
  color: string
  width: number
  points: number[]   // flat [x0,y0,x1,y1,…] in card-local (unzoomed) px
}

export interface SketchCard extends BaseCard {
  type: 'sketch'
  content: {
    strokes: SketchStroke[]
    height: number   // drawing surface height in world px
  }
}

// ── Color card ─────────────────────────────────────────────────
export interface ColorCard extends BaseCard {
  type: 'color'
  content: { hex: string; label: string }
}

// ── Audio card ─────────────────────────────────────────────────
// src is either a remote URL or a data URL from a small upload
// (see AUDIO_MAX_BYTES in utils/media.ts).
export interface AudioCard extends BaseCard {
  type: 'audio'
  content: { src: string; fileName: string }
}

// ── Video card ─────────────────────────────────────────────────
// URL only — an embedded video would exhaust localStorage on its own.
export interface VideoCard extends BaseCard {
  type: 'video'
  content: { url: string }
}

// ── Heading card ───────────────────────────────────────────────
export type HeadingLevel = 1 | 2 | 3
export type HeadingAlign = 'left' | 'center' | 'right'

export interface HeadingCard extends BaseCard {
  type: 'heading'
  content: { text: string; level: HeadingLevel; align: HeadingAlign }
}

// ── Comment card ───────────────────────────────────────────────
export interface CommentEntry {
  id: string
  text: string
  createdAt: number
}

export interface CommentCard extends BaseCard {
  type: 'comment'
  content: { entries: CommentEntry[] }
}

// ── Map card ───────────────────────────────────────────────────
export interface MapPin {
  id: string
  lat: number
  lng: number
  label: string
}

export interface MapCard extends BaseCard {
  type: 'map'
  content: {
    center: { lat: number; lng: number }
    zoom: number
    pins: MapPin[]
    height: number   // map viewport height in world px
  }
}

// ── Board card ─────────────────────────────────────────────────
// A window into a CHILD board (Board.parentId points back here).
// boardId is null only in the impossible-but-typed case where the
// child board was deleted out from under the card.
export interface BoardCard extends BaseCard {
  type: 'board'
  content: { boardId: string | null }
}

// Discriminated union — TypeScript narrows via card.type
export type Card =
  | NoteCard | TaskCard | TableCard | MediaCard | LinkCard | DocumentCard | ColumnCard
  | SketchCard | ColorCard | AudioCard | VideoCard | HeadingCard | CommentCard
  | MapCard | BoardCard

export type CardType =
  | 'note' | 'task' | 'table' | 'media' | 'link' | 'document' | 'column'
  | 'sketch' | 'color' | 'audio' | 'video' | 'heading' | 'comment'
  | 'map' | 'board'

// ── Board ─────────────────────────────────────────────────────
export interface Board {
  id: string
  name: string
  cards: Card[]
  connectors: Connector[]
  createdAt: number
  updatedAt: number
  // Set when this board lives inside a board card on another board.
  // Root boards leave it null/undefined — the gallery shows only those,
  // which is the whole point of nesting: sub-boards don't add clutter.
  parentId?: string | null
  // Key into BOARD_ICONS (see UI/boardIcons.tsx). Stored as a plain string
  // rather than a union so a board saved with an icon that a later build
  // renames or removes falls back to the default instead of failing to load.
  icon?: string
  // CSS color for the icon — a theme var like var(--nx-core), or a hex.
  accent?: string
}

// ── App Settings ──────────────────────────────────────────────
export interface AppSettings {
  animateArrows: boolean
}

// ── Camera ────────────────────────────────────────────────────
export interface Camera {
  x: number
  y: number
  zoom: number
}

// ── Active tool ───────────────────────────────────────────────
export type ActiveTool = CardType | 'select' | 'connect'

// ── Full store shape ──────────────────────────────────────────
export interface CanvasStore {
  // ── State ───────────────────────────────────────────────
  boards: Board[]
  activeBoardId: string | null
  cards: Card[]
  connectors: Connector[]
  camera: Camera
  selectedIds: Set<string>
  activeTool: ActiveTool
  connectFromId: string | null
  draggingCardId: string | null
  dropColumnId: string | null   // column currently hovered while dragging a card
  openDocId: string | null      // Document card currently open in the full-page editor
  settings: AppSettings

  // ── Board actions ────────────────────────────────────────
  // parentId turns the new board into a sub-board (see Board.parentId).
  createBoard: (name: string, parentId?: string | null) => Board
  openBoard: (id: string) => void
  renameBoard: (id: string, name: string) => void
  setBoardIcon: (id: string, icon: string, accent?: string) => void
  // Cascades: deleting a board also deletes every board nested inside it.
  deleteBoard: (id: string) => void
  backToBoards: () => void
  updateBoardName: (name: string) => void

  // ── Card actions ─────────────────────────────────────────
  addCard: (type: CardType, x: number, y: number, options?: Record<string, unknown>) => Card
  updateCard: (id: string, patch: Partial<Card>) => void
  deleteCard: (id: string) => void
  deleteSelected: () => void
  duplicateCard: (id: string) => void
  clearBoard: () => void
  // Pin/unpin a card's position. With no id, toggles every selected card
  // (all to locked unless every one is already locked).
  toggleLock: (id?: string) => void

  // ── Connector actions ─────────────────────────────────────
  addConnector: (fromId: string, toId: string, style?: ConnectorStyle) => void
  updateConnector: (id: string, patch: Partial<Omit<Connector, 'id'>>) => void
  deleteConnector: (id: string) => void
  setConnectFrom: (id: string | null) => void

  // ── Selection actions ────────────────────────────────────
  selectCard: (id: string, additive?: boolean) => void
  deselectAll: () => void
  selectAll: () => void

  // ── Drag tracking ─────────────────────────────────────────
  setDraggingCard: (id: string | null) => void
  setDropColumn: (id: string | null) => void
  // Move a canvas card INTO a column card, whole. The card keeps its type
  // and all its content; it just stops being positioned on the canvas
  // (its connectors are dropped, since it no longer has a place to anchor).
  absorbCardIntoColumn: (cardId: string, columnId: string) => void
  // The inverse — lift an embedded card back out onto the canvas beside
  // its column. Without this, dropping a card into a column would trap it.
  ejectFromColumn: (columnId: string, cardId: string) => void
  // Create a new card directly inside a column.
  addCardToColumn: (columnId: string, type: CardType, options?: Record<string, unknown>) => void
  // Delete an embedded card. Goes through the store (not a plain content
  // patch) so a board card nested in a column still releases its
  // sub-board to the gallery on the way out.
  removeFromColumn: (columnId: string, cardId: string) => void

  // ── Document editor ───────────────────────────────────────
  openDocument: (id: string) => void
  closeDocument: () => void

  // ── Camera actions ───────────────────────────────────────
  setCamera: (camera: Partial<Camera>) => void
  resetView: () => void
  zoomTo: (zoom: number, originX: number, originY: number) => void

  // ── Tool actions ────────────────────────────────────────
  setActiveTool: (tool: ActiveTool) => void

  // ── Settings actions ────────────────────────────────────
  updateSettings: (patch: Partial<AppSettings>) => void
}
