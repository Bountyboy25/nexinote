import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  CanvasStore, Card, CardType, Camera, ActiveTool, AnchorPoint,
  NoteCard, DocumentCard, TaskCard, TableCard, MediaCard, LinkCard, ColumnCard,
  Board, AppSettings, Connector,
} from '@/types'

// ─────────────────────────────────────────────────────────────
// STORE — Phase 3: boards, settings, document card, drag tracking
// ─────────────────────────────────────────────────────────────

const CARD_WIDTH   = 280
const LS_BOARDS    = 'nexinote_boards'
const LS_SETTINGS  = 'nexinote_settings'

// ── Persistence helpers ────────────────────────────────────────
function loadBoards(): Board[] {
  try { return JSON.parse(localStorage.getItem(LS_BOARDS) ?? '[]') } catch { return [] }
}
function saveBoards(boards: Board[]) {
  try { localStorage.setItem(LS_BOARDS, JSON.stringify(boards)) } catch {}
}
function loadSettings(): AppSettings {
  try {
    return { animateArrows: true, ...JSON.parse(localStorage.getItem(LS_SETTINGS) ?? '{}') }
  } catch { return { animateArrows: true } }
}
function saveSettings(s: AppSettings) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)) } catch {}
}

// ── Card factory ───────────────────────────────────────────────
function createCard(
  type: CardType,
  x: number,
  y: number,
  options?: Record<string, unknown>,
): Card {
  const base = { id: nanoid(), x, y, width: CARD_WIDTH, createdAt: Date.now() }

  switch (type) {
    case 'note':
      return { ...base, type: 'note', title: 'Note',
        content: { html: '<p>Start writing…</p>' } } satisfies NoteCard

    case 'document':
      return {
        ...base, type: 'document', title: 'Document', width: 320,
        content: { html: '' },
      } satisfies DocumentCard

    case 'task':
      return { ...base, type: 'task', title: 'Tasks',
        content: { items: [
          { id: nanoid(), text: 'First task',  done: false },
          { id: nanoid(), text: 'Second task', done: false },
        ], checkboxStyle: 'square' } } satisfies TaskCard

    case 'table': {
      const rows    = (options?.rows  as number) ?? 3
      const cols    = (options?.cols  as number) ?? 3
      return { ...base, type: 'table', title: 'Table',
        content: { rows: Array.from({ length: rows }, () => Array(cols).fill('')) } } satisfies TableCard
    }

    case 'media':
      return { ...base, type: 'media', title: 'Image',
        content: { src: '', fit: 'cover' } } satisfies MediaCard

    case 'link':
      return { ...base, type: 'link', title: 'Link',
        content: { url: 'https://', description: '' } } satisfies LinkCard

    case 'column':
      return {
        ...base, type: 'column', title: 'Column', width: 300,
        content: { items: [] },
      } satisfies ColumnCard
  }
}

// ── Auto-save helper ───────────────────────────────────────────
// Called after any card/connector mutation so work is never lost
// even if the user closes the tab without navigating to BoardsView.
function persistActiveBoard(
  boards: Board[],
  activeBoardId: string | null,
  cards: Card[],
  connectors: Connector[],
): Board[] {
  if (!activeBoardId) return boards
  const updated = boards.map(b =>
    b.id === activeBoardId
      ? { ...b, cards, connectors, updatedAt: Date.now() }
      : b
  )
  saveBoards(updated)
  return updated
}

// ── Initial board helper ───────────────────────────────────────
function makeInitialBoard(): Board {
  return {
    id: nanoid(), name: 'My First Board',
    cards: [], connectors: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  }
}

// ── Store ──────────────────────────────────────────────────────
export const useCanvasStore = create<CanvasStore>((set, get) => {
  const savedBoards = loadBoards()
  const initialBoards = savedBoards.length > 0 ? savedBoards : [makeInitialBoard()]

  return {
    // ── INITIAL STATE ──────────────────────────────────────────
    boards:         initialBoards,
    activeBoardId:  null,   // null = show boards gallery
    cards:          [],
    connectors:     [],
    camera:         { x: 0, y: 52, zoom: 1 },
    selectedIds:    new Set<string>(),
    activeTool:     'select',
    connectFromId:  null,
    draggingCardId: null,
    settings:       loadSettings(),

    // ── BOARD ACTIONS ──────────────────────────────────────────

    createBoard: (name: string): Board => {
      const board: Board = {
        id: nanoid(), name,
        cards: [], connectors: [],
        createdAt: Date.now(), updatedAt: Date.now(),
      }
      set(state => {
        const boards = [...state.boards, board]
        saveBoards(boards)
        return { boards }
      })
      return board
    },

    openBoard: (id: string) => {
      // Save current canvas into the currently-active board first
      const { boards, activeBoardId, cards, connectors } = get()
      let updatedBoards = boards
      if (activeBoardId) {
        updatedBoards = boards.map(b =>
          b.id === activeBoardId
            ? { ...b, cards, connectors, updatedAt: Date.now() }
            : b
        )
      }
      const target = updatedBoards.find(b => b.id === id)
      if (!target) return
      saveBoards(updatedBoards)
      set({
        boards:        updatedBoards,
        activeBoardId: id,
        cards:         target.cards,
        connectors:    target.connectors,
        camera:        { x: 0, y: 52, zoom: 1 },
        selectedIds:   new Set<string>(),
        activeTool:    'select',
        connectFromId: null,
      })
    },

    renameBoard: (id: string, name: string) => {
      set(state => {
        const boards = state.boards.map(b =>
          b.id === id ? { ...b, name, updatedAt: Date.now() } : b
        )
        saveBoards(boards)
        return { boards }
      })
    },

    deleteBoard: (id: string) => {
      set(state => {
        const boards = state.boards.filter(b => b.id !== id)
        // Always keep at least one board
        const final = boards.length > 0 ? boards : [makeInitialBoard()]
        saveBoards(final)
        return { boards: final }
      })
    },

    backToBoards: () => {
      // Save current canvas into active board
      const { boards, activeBoardId, cards, connectors } = get()
      if (activeBoardId) {
        const updated = boards.map(b =>
          b.id === activeBoardId
            ? { ...b, cards, connectors, updatedAt: Date.now() }
            : b
        )
        saveBoards(updated)
        set({ boards: updated, activeBoardId: null, selectedIds: new Set<string>() })
      } else {
        set({ activeBoardId: null })
      }
    },

    updateBoardName: (name: string) => {
      const { activeBoardId } = get()
      if (!activeBoardId) return
      set(state => {
        const boards = state.boards.map(b =>
          b.id === activeBoardId ? { ...b, name, updatedAt: Date.now() } : b
        )
        saveBoards(boards)
        return { boards }
      })
    },

    // ── CARD ACTIONS ───────────────────────────────────────────

    addCard: (type: CardType, x: number, y: number, options?: Record<string, unknown>): Card => {
      const card = createCard(type, x, y, options)
      set(state => {
        const cards = [...state.cards, card]
        return {
          cards,
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, state.connectors),
        }
      })
      return card
    },

    updateCard: (id: string, patch: Partial<Card>) => {
      set(state => {
        const cards = state.cards.map(c => c.id === id ? { ...c, ...patch } as Card : c)
        return {
          cards,
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, state.connectors),
        }
      })
    },

    deleteCard: (id: string) => {
      set(state => {
        const cards      = state.cards.filter(c => c.id !== id)
        const connectors = state.connectors.filter(c => c.fromId !== id && c.toId !== id)
        return {
          cards, connectors,
          selectedIds: new Set([...state.selectedIds].filter(sid => sid !== id)),
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, connectors),
        }
      })
    },

    deleteSelected: () => {
      const { selectedIds } = get()
      set(state => {
        const cards      = state.cards.filter(c => !selectedIds.has(c.id))
        const connectors = state.connectors.filter(
          c => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)
        )
        return {
          cards, connectors,
          selectedIds: new Set<string>(),
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, connectors),
        }
      })
    },

    duplicateCard: (id: string) => {
      const original = get().cards.find(c => c.id === id)
      if (!original) return
      const dup: Card = {
        ...original,
        content:   JSON.parse(JSON.stringify(original.content)),
        id:        nanoid(),
        x:         original.x + 24,
        y:         original.y + 24,
        createdAt: Date.now(),
      } as Card
      set(state => {
        const cards = [...state.cards, dup]
        return {
          cards,
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, state.connectors),
        }
      })
    },

    clearBoard: () => {
      set(state => ({
        cards: [], connectors: [], selectedIds: new Set<string>(),
        boards: persistActiveBoard(state.boards, state.activeBoardId, [], []),
      }))
    },

    // ── CONNECTOR ACTIONS ──────────────────────────────────────

    addConnector: (fromId: string, toId: string) => {
      if (fromId === toId) return
      const { connectors, cards } = get()
      if (connectors.some(c => c.fromId === fromId && c.toId === toId)) return

      // Choose the closest of the 6 anchor points on the target card
      const from = cards.find(c => c.id === fromId)
      const to   = cards.find(c => c.id === toId)
      let toAnchor: AnchorPoint = 'mid-left'
      if (from && to) {
        const CARD_H = 160
        const srcCx = from.x + from.width / 2
        const srcCy = from.y + CARD_H / 2
        const anchors: [AnchorPoint, number, number][] = [
          ['top-left',  to.x,            to.y             ],
          ['top-right', to.x + to.width, to.y             ],
          ['mid-left',  to.x,            to.y + CARD_H / 2],
          ['mid-right', to.x + to.width, to.y + CARD_H / 2],
          ['bot-left',  to.x,            to.y + CARD_H    ],
          ['bot-right', to.x + to.width, to.y + CARD_H    ],
        ]
        let minDist = Infinity
        for (const [name, ax, ay] of anchors) {
          const d = Math.hypot(srcCx - ax, srcCy - ay)
          if (d < minDist) { minDist = d; toAnchor = name }
        }
      }

      set(state => {
        const connectors = [...state.connectors, { id: nanoid(), fromId, toId, toAnchor }]
        return {
          connectors,
          boards: persistActiveBoard(state.boards, state.activeBoardId, state.cards, connectors),
        }
      })
    },

    deleteConnector: (id: string) => {
      set(state => {
        const connectors = state.connectors.filter(c => c.id !== id)
        return {
          connectors,
          boards: persistActiveBoard(state.boards, state.activeBoardId, state.cards, connectors),
        }
      })
    },

    setConnectFrom: (id: string | null) => set({ connectFromId: id }),

    // ── SELECTION ACTIONS ──────────────────────────────────────

    selectCard: (id: string, additive = false) => {
      set(state => ({
        selectedIds: additive
          ? new Set([...state.selectedIds, id])
          : new Set([id]),
      }))
    },

    deselectAll: () => set({ selectedIds: new Set<string>() }),

    selectAll: () =>
      set(state => ({ selectedIds: new Set(state.cards.map(c => c.id)) })),

    // ── DRAG TRACKING ──────────────────────────────────────────

    setDraggingCard: (id: string | null) => set({ draggingCardId: id }),

    // ── CAMERA ACTIONS ─────────────────────────────────────────

    setCamera: (patch: Partial<Camera>) =>
      set(state => ({ camera: { ...state.camera, ...patch } })),

    resetView: () => set({ camera: { x: 0, y: 52, zoom: 1 } }),

    zoomTo: (newZoom: number, originX: number, originY: number) => {
      const { camera } = get()
      const clamped = Math.min(4, Math.max(0.1, newZoom))
      const worldX = (originX - camera.x) / camera.zoom
      const worldY = (originY - camera.y) / camera.zoom
      set({ camera: { x: originX - worldX * clamped, y: originY - worldY * clamped, zoom: clamped } })
    },

    // ── TOOL ACTIONS ───────────────────────────────────────────

    setActiveTool: (tool: ActiveTool) => set({ activeTool: tool }),

    // ── SETTINGS ACTIONS ───────────────────────────────────────

    updateSettings: (patch: Partial<AppSettings>) => {
      set(state => {
        const settings = { ...state.settings, ...patch }
        saveSettings(settings)
        return { settings }
      })
    },
  }
})

// ── SELECTOR HOOKS ────────────────────────────────────────────
export const useCards        = () => useCanvasStore(s => s.cards)
export const useCamera       = () => useCanvasStore(s => s.camera)
export const useSelectedIds  = () => useCanvasStore(s => s.selectedIds)
export const useActiveTool   = () => useCanvasStore(s => s.activeTool)
export const useConnectors   = () => useCanvasStore(s => s.connectors)
export const useConnectFrom  = () => useCanvasStore(s => s.connectFromId)
export const useBoards       = () => useCanvasStore(s => s.boards)
export const useActiveBoardId = () => useCanvasStore(s => s.activeBoardId)
export const useDraggingCardId = () => useCanvasStore(s => s.draggingCardId)
export const useSettings     = () => useCanvasStore(s => s.settings)

// Stable action references (won't trigger re-renders)
const _state = useCanvasStore.getState()
const _actions = Object.freeze({
  addCard:         _state.addCard,
  updateCard:      _state.updateCard,
  deleteCard:      _state.deleteCard,
  deleteSelected:  _state.deleteSelected,
  duplicateCard:   _state.duplicateCard,
  clearBoard:      _state.clearBoard,
  addConnector:    _state.addConnector,
  deleteConnector: _state.deleteConnector,
  setConnectFrom:  _state.setConnectFrom,
  selectCard:      _state.selectCard,
  deselectAll:     _state.deselectAll,
  selectAll:       _state.selectAll,
  setCamera:       _state.setCamera,
  resetView:       _state.resetView,
  zoomTo:          _state.zoomTo,
  setActiveTool:   _state.setActiveTool,
  setDraggingCard: _state.setDraggingCard,
  updateSettings:  _state.updateSettings,
  createBoard:     _state.createBoard,
  openBoard:       _state.openBoard,
  renameBoard:     _state.renameBoard,
  deleteBoard:     _state.deleteBoard,
  backToBoards:    _state.backToBoards,
  updateBoardName: _state.updateBoardName,
})
export const useCanvasActions = () => _actions
