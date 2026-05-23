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
export interface Connector {
  id: string
  fromId: string
  toId: string
  toAnchor?: AnchorPoint   // Which of the 6 anchor points on the target
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

// Discriminated union — TypeScript narrows via card.type
export type Card = NoteCard | TaskCard | TableCard | MediaCard | LinkCard | DocumentCard
export type CardType = 'note' | 'task' | 'table' | 'media' | 'link' | 'document'

// ── Board ─────────────────────────────────────────────────────
export interface Board {
  id: string
  name: string
  cards: Card[]
  connectors: Connector[]
  createdAt: number
  updatedAt: number
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
export type ActiveTool =
  | 'select'
  | 'note'
  | 'document'
  | 'task'
  | 'table'
  | 'media'
  | 'link'
  | 'connect'

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
  settings: AppSettings

  // ── Board actions ────────────────────────────────────────
  createBoard: (name: string) => Board
  openBoard: (id: string) => void
  renameBoard: (id: string, name: string) => void
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

  // ── Connector actions ─────────────────────────────────────
  addConnector: (fromId: string, toId: string) => void
  deleteConnector: (id: string) => void
  setConnectFrom: (id: string | null) => void

  // ── Selection actions ────────────────────────────────────
  selectCard: (id: string, additive?: boolean) => void
  deselectAll: () => void
  selectAll: () => void

  // ── Drag tracking ─────────────────────────────────────────
  setDraggingCard: (id: string | null) => void

  // ── Camera actions ───────────────────────────────────────
  setCamera: (camera: Partial<Camera>) => void
  resetView: () => void
  zoomTo: (zoom: number, originX: number, originY: number) => void

  // ── Tool actions ─────────────────────────────────────────
  setActiveTool: (tool: ActiveTool) => void

  // ── Settings actions ─────────────────────────────────────
  updateSettings: (patch: Partial<AppSettings>) => void
}
