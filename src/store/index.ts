import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  CanvasStore, Card, CardType, Camera, ActiveTool,
  NoteCard, DocumentCard, TaskCard, TableCard, MediaCard, LinkCard, ColumnCard,
  SketchCard, ColorCard, AudioCard, VideoCard, HeadingCard, CommentCard,
  MapCard, BoardCard,
  ColumnItem, Board, AppSettings, Connector, ConnectorStyle,
} from '@/types'

// ─────────────────────────────────────────────────────────────
// STORE — Phase 3: boards, settings, document card, drag tracking
// ─────────────────────────────────────────────────────────────

const CARD_WIDTH   = 280
const LS_BOARDS    = 'nexinote_boards'
const LS_SETTINGS  = 'nexinote_settings'

// Document cards are deliberately the smallest type on the canvas.
// OLD_DOC_CARD_WIDTH is the previous default, kept so the migration can
// recognise untouched cards and leave hand-resized ones alone.
const DOC_CARD_WIDTH     = 150
const OLD_DOC_CARD_WIDTH = 240

// ── Legacy migration ───────────────────────────────────────────
// One pass over saved boards, fixing up shapes from earlier versions so
// old work keeps opening. Runs once at load; the results persist on the
// next save.
//
// 1. Columns used to store three kinds of text stub (ColumnItem) instead
//    of real cards. Boards saved before that change still hold them, so they
// are converted once at load time. A stub is identified by the absence
// of `content` — every real Card has one.
//
// The mapping is deliberately lossless in the direction that matters:
// whatever text the user typed survives, and the item becomes a card
// they can now actually edit with the full editor for its type.
function migrateBoards(boards: Board[]): Board[] {
  let touched = false

  const convert = (raw: unknown): Card | null => {
    const item = raw as Partial<ColumnItem> & { content?: unknown }
    // Already a real card — leave it alone.
    if (item && typeof item === 'object' && 'content' in item && item.content) {
      return raw as Card
    }
    if (!item?.id || !item.type) return null

    touched = true
    const base = {
      id: item.id,
      x: 0, y: 0, width: 280,
      title: item.title ?? '',
      createdAt: Date.now(),
    }
    const text = item.text ?? ''

    switch (item.type) {
      case 'link':
        return { ...base, type: 'link', content: { url: text, description: '' } } satisfies LinkCard
      case 'task':
        return {
          ...base, type: 'task',
          content: {
            // The stub kept its label in `title` and an optional note in
            // `text`; prefer the note, fall back to the label, so the row
            // never migrates into an empty checklist.
            items: [{ id: nanoid(), text: text || (item.title ?? ''), done: !!item.done }],
            checkboxStyle: 'square',
          },
        } satisfies TaskCard
      default:
        return {
          ...base, type: 'note',
          content: { html: text ? `<p>${escapeHtml(text)}</p>` : '' },
        } satisfies NoteCard
    }
  }

  // Document cards shrank when their excerpt preview was replaced by an
  // icon and word count. Cards still sitting at the OLD default were
  // never resized by hand, so bringing them down matches what the user
  // now sees on every newly created one. Anything at another width was
  // chosen deliberately and is left alone.
  const shrinkDoc = (card: Card): Card => {
    if (card.type === 'document' && card.width === OLD_DOC_CARD_WIDTH) {
      touched = true
      return { ...card, width: DOC_CARD_WIDTH }
    }
    return card
  }

  const next = boards.map(board => ({
    ...board,
    cards: board.cards.map(card =>
      card.type === 'column'
        ? {
            ...card,
            content: {
              ...card.content,
              items: (card.content.items as unknown[])
                .map(convert)
                .filter((c): c is Card => c !== null)
                .map(shrinkDoc),
            },
          }
        : shrinkDoc(card)
    ),
  }))

  return touched ? next : boards
}

// Migrated note text is plain, but it lands in an innerHTML field.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── Persistence helpers ────────────────────────────────────────
function loadBoards(): Board[] {
  try {
    return migrateBoards(JSON.parse(localStorage.getItem(LS_BOARDS) ?? '[]'))
  } catch { return [] }
}

// Serializing every board (media cards embed base64 images!) is far
// too expensive to run on every mousemove/keystroke, so writes are
// debounced. The trailing write is flushed on tab hide/close so the
// "work is never lost" guarantee still holds.
const SAVE_DEBOUNCE_MS = 400
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingBoards: Board[] | null = null

function flushBoardSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (!pendingBoards) return
  try { localStorage.setItem(LS_BOARDS, JSON.stringify(pendingBoards)) } catch {}
  pendingBoards = null
}

function saveBoards(boards: Board[]) {
  pendingBoards = boards
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flushBoardSave, SAVE_DEBOUNCE_MS)
}

window.addEventListener('beforeunload', flushBoardSave)
window.addEventListener('pagehide', flushBoardSave)
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
        // The smallest card on the board by design: a document tile is an
        // icon and a word count, so it only needs to be big enough to
        // recognise and click. Its contents open in the full-page editor.
        ...base, type: 'document', title: 'Document', width: DOC_CARD_WIDTH,
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

    case 'sketch':
      return {
        ...base, type: 'sketch', title: 'Sketch', width: 320,
        content: { strokes: [], height: 220 },
      } satisfies SketchCard

    case 'color':
      return {
        ...base, type: 'color', title: 'Color', width: 200,
        content: { hex: '#3ec6ff', label: '' },
      } satisfies ColorCard

    case 'audio':
      return {
        ...base, type: 'audio', title: 'Audio', width: 300,
        content: { src: '', fileName: '' },
      } satisfies AudioCard

    case 'video':
      return {
        ...base, type: 'video', title: 'Video', width: 360,
        content: { url: '' },
      } satisfies VideoCard

    case 'heading':
      return {
        ...base, type: 'heading', title: 'Heading', width: 380,
        content: { text: '', level: 1, align: 'left' },
      } satisfies HeadingCard

    case 'comment':
      return {
        ...base, type: 'comment', title: 'Comments', width: 300,
        content: { entries: [] },
      } satisfies CommentCard

    case 'map':
      return {
        ...base, type: 'map', title: 'Map', width: 360,
        content: {
          // Zoomed out over Europe/Africa — a neutral "pick a place" view.
          center: { lat: 20, lng: 0 },
          zoom: 2,
          pins: [],
          height: 260,
        },
      } satisfies MapCard

    case 'board':
      // boardId is filled in by addCard(), which creates the child board
      // — createCard is pure and has no access to the board list.
      return {
        ...base, type: 'board', title: 'Sub-board', width: 260,
        content: { boardId: null },
      } satisfies BoardCard
  }
}

// Cards live in two places: positioned on the canvas, and embedded
// inside a column card. Anything that resolves a card by id has to look
// in both, or features break the moment a card is dropped into a column.
export function findCardDeep(cards: Card[], id: string | null): Card | undefined {
  if (!id) return undefined
  for (const c of cards) {
    if (c.id === id) return c
    if (c.type === 'column') {
      const hit = c.content.items.find(i => i.id === id)
      if (hit) return hit
    }
  }
  return undefined
}

// ── Sub-board tree helpers ─────────────────────────────────────

// Every board nested under `rootId`, at any depth. Used to cascade a
// delete so removing a project doesn't leave unreachable sub-boards
// stranded in storage forever.
function descendantBoardIds(boards: Board[], rootId: string): Set<string> {
  const out = new Set<string>()
  const walk = (parentId: string) => {
    for (const b of boards) {
      if (b.parentId === parentId && !out.has(b.id)) {
        out.add(b.id)
        walk(b.id)
      }
    }
  }
  walk(rootId)
  return out
}

// The chain from the root board down to `id`, used for breadcrumbs.
// Guards against a cycle in corrupted data rather than hanging.
export function boardAncestry(boards: Board[], id: string | null): Board[] {
  const chain: Board[] = []
  const seen = new Set<string>()
  let current = boards.find(b => b.id === id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    chain.unshift(current)
    current = current.parentId
      ? boards.find(b => b.id === current!.parentId)
      : undefined
  }
  return chain
}

// When a board card is removed, its child board would become invisible:
// it isn't in the gallery (it has a parentId) and nothing links to it
// any more. Promoting it to a root board surfaces it in the gallery
// instead of silently orphaning the user's work.
function promoteOrphanedSubBoards(boards: Board[], removed: Card[]): Board[] {
  // Deleting a column deletes every card inside it too, so board cards
  // nested in a column have to be collected as well — otherwise their
  // sub-boards would be stranded with no card and no gallery entry.
  const flattened: Card[] = []
  for (const card of removed) {
    flattened.push(card)
    if (card.type === 'column') flattened.push(...card.content.items)
  }

  const orphaned = new Set(
    flattened
      .filter((c): c is BoardCard => c.type === 'board')
      .map(c => c.content.boardId)
      .filter((id): id is string => !!id)
  )
  if (orphaned.size === 0) return boards
  return boards.map(b => (orphaned.has(b.id) ? { ...b, parentId: null } : b))
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
    dropColumnId:   null,
    openDocId:      null,
    settings:       loadSettings(),

    // ── BOARD ACTIONS ──────────────────────────────────────────

    createBoard: (name: string, parentId: string | null = null): Board => {
      const board: Board = {
        id: nanoid(), name,
        cards: [], connectors: [],
        createdAt: Date.now(), updatedAt: Date.now(),
        parentId,
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
        openDocId:     null,
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

    setBoardIcon: (id: string, icon: string, accent?: string) => {
      set(state => {
        const boards = state.boards.map(b =>
          b.id === id
            ? { ...b, icon, accent: accent ?? b.accent, updatedAt: Date.now() }
            : b
        )
        saveBoards(boards)
        return { boards }
      })
    },

    deleteBoard: (id: string) => {
      set(state => {
        // Cascade — a board's sub-boards are only reachable THROUGH it, so
        // leaving them behind would strand them in storage with no way in.
        const doomed = descendantBoardIds(state.boards, id)
        doomed.add(id)
        const boards = state.boards.filter(b => !doomed.has(b.id))
        // Always keep at least one board the gallery can show.
        const final = boards.some(b => !b.parentId) ? boards : [...boards, makeInitialBoard()]
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
        set({ boards: updated, activeBoardId: null, selectedIds: new Set<string>(), openDocId: null })
      } else {
        set({ activeBoardId: null, openDocId: null })
      }
    },

    updateBoardName: (name: string) => {
      const { activeBoardId } = get()
      if (!activeBoardId) return
      const clean = name.trim() || 'Untitled Board'
      set(state => {
        const boards = state.boards.map(b =>
          b.id === activeBoardId ? { ...b, name: clean, updatedAt: Date.now() } : b
        )
        saveBoards(boards)
        return { boards }
      })
    },

    // ── CARD ACTIONS ───────────────────────────────────────────

    addCard: (type: CardType, x: number, y: number, options?: Record<string, unknown>): Card => {
      const card = createCard(type, x, y, options)

      // A board card owns a real child board. Create the two together so
      // the card can never point at a board that doesn't exist.
      let childBoard: Board | null = null
      if (card.type === 'board') {
        const name = (options?.name as string)?.trim() || 'Sub-board'
        childBoard = {
          id: nanoid(), name,
          cards: [], connectors: [],
          createdAt: Date.now(), updatedAt: Date.now(),
          parentId: get().activeBoardId,
        }
        card.content.boardId = childBoard.id
        card.title = name
      }

      set(state => {
        const cards  = [...state.cards, card]
        const boards = childBoard ? [...state.boards, childBoard] : state.boards
        return {
          cards,
          boards: persistActiveBoard(boards, state.activeBoardId, cards, state.connectors),
        }
      })
      return card
    },

    updateCard: (id: string, patch: Partial<Card>) => {
      set(state => {
        let found = false
        const cards = state.cards.map(c => {
          if (c.id === id) {
            found = true
            return { ...c, ...patch } as Card
          }
          // Cards embedded in a column aren't in the top-level list, but
          // their content components call updateCard() exactly like any
          // other card. Without this branch, editing anything inside a
          // column would silently do nothing.
          if (c.type === 'column' && c.content.items.some(i => i.id === id)) {
            found = true
            return {
              ...c,
              content: {
                ...c.content,
                items: c.content.items.map(i => i.id === id ? { ...i, ...patch } as Card : i),
              },
            }
          }
          return c
        })
        if (!found) return state
        return {
          cards,
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, state.connectors),
        }
      })
    },

    deleteCard: (id: string) => {
      set(state => {
        const removed    = state.cards.filter(c => c.id === id)
        const cards      = state.cards.filter(c => c.id !== id)
        const connectors = state.connectors.filter(c => c.fromId !== id && c.toId !== id)
        return {
          cards, connectors,
          selectedIds: new Set([...state.selectedIds].filter(sid => sid !== id)),
          openDocId: state.openDocId === id ? null : state.openDocId,
          boards: persistActiveBoard(
            promoteOrphanedSubBoards(state.boards, removed),
            state.activeBoardId, cards, connectors,
          ),
        }
      })
    },

    deleteSelected: () => {
      const { selectedIds } = get()
      set(state => {
        const removed    = state.cards.filter(c => selectedIds.has(c.id))
        const cards      = state.cards.filter(c => !selectedIds.has(c.id))
        const connectors = state.connectors.filter(
          c => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)
        )
        return {
          cards, connectors,
          selectedIds: new Set<string>(),
          openDocId: state.openDocId && selectedIds.has(state.openDocId) ? null : state.openDocId,
          boards: persistActiveBoard(
            promoteOrphanedSubBoards(state.boards, removed),
            state.activeBoardId, cards, connectors,
          ),
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
        // A copy always starts movable — inheriting the lock would drop
        // an unmovable card 24px off the original with no way to place it.
        locked:    false,
      } as Card
      set(state => {
        const cards = [...state.cards, dup]
        return {
          cards,
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, state.connectors),
        }
      })
    },

    toggleLock: (id?: string) => {
      set(state => {
        const targets = id
          ? new Set([id])
          : state.selectedIds
        if (targets.size === 0) return state

        // Mixed selection → lock everything. Only an all-locked selection
        // unlocks, so one keypress never half-toggles a group.
        const affected = state.cards.filter(c => targets.has(c.id))
        const next = !affected.every(c => c.locked)

        const cards = state.cards.map(c =>
          targets.has(c.id) ? { ...c, locked: next } : c
        )
        return {
          cards,
          boards: persistActiveBoard(state.boards, state.activeBoardId, cards, state.connectors),
        }
      })
    },

    clearBoard: () => {
      set(state => ({
        cards: [], connectors: [], selectedIds: new Set<string>(), openDocId: null,
        boards: persistActiveBoard(
          promoteOrphanedSubBoards(state.boards, state.cards),
          state.activeBoardId, [], [],
        ),
      }))
    },

    // ── CONNECTOR ACTIONS ──────────────────────────────────────

    addConnector: (fromId: string, toId: string, style: ConnectorStyle = 'beam') => {
      if (fromId === toId) return
      const { connectors } = get()
      if (connectors.some(c => c.fromId === fromId && c.toId === toId)) return

      // No attachment point is stored: ConnectorLayer derives it from the
      // live card rectangles every frame (see Connector.toAnchor in types).

      set(state => {
        const connectors = [...state.connectors, { id: nanoid(), fromId, toId, style }]
        return {
          connectors,
          boards: persistActiveBoard(state.boards, state.activeBoardId, state.cards, connectors),
        }
      })
    },

    updateConnector: (id: string, patch: Partial<Omit<Connector, 'id'>>) => {
      set(state => {
        const connectors = state.connectors.map(c => c.id === id ? { ...c, ...patch } : c)
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

    // Guarded — called per mousemove while dragging, so only write to the
    // store when the hovered column actually changes.
    setDropColumn: (id: string | null) => {
      if (get().dropColumnId !== id) set({ dropColumnId: id })
    },

    absorbCardIntoColumn: (cardId: string, columnId: string) => {
      const { cards } = get()
      const source = cards.find(c => c.id === cardId)
      const column = cards.find(c => c.id === columnId)
      if (!source || !column || column.type !== 'column' || cardId === columnId) return

      // A column inside a column has no sensible layout and no clear way
      // back out, so it is the one type a column refuses.
      if (source.type === 'column') return

      set(state => {
        // The card moves WHOLE — same id, same type, same content. It
        // simply stops being a canvas card, so its connectors go with it
        // (there is no longer an anchor point to draw an arrow to).
        const nextCards = state.cards
          .filter(c => c.id !== cardId)
          .map(c => c.id === columnId && c.type === 'column'
            ? { ...c, content: { ...c.content, items: [...c.content.items, source] } }
            : c)
        const connectors = state.connectors.filter(c => c.fromId !== cardId && c.toId !== cardId)
        return {
          cards: nextCards,
          connectors,
          selectedIds: new Set([...state.selectedIds].filter(sid => sid !== cardId)),
          dropColumnId: null,
          openDocId: state.openDocId === cardId ? null : state.openDocId,
          boards: persistActiveBoard(state.boards, state.activeBoardId, nextCards, connectors),
        }
      })
    },

    ejectFromColumn: (columnId: string, cardId: string) => {
      set(state => {
        const column = state.cards.find(c => c.id === columnId)
        if (!column || column.type !== 'column') return state
        const embedded = column.content.items.find(c => c.id === cardId)
        if (!embedded) return state

        // Land it just right of the column so it is visible immediately
        // rather than reappearing wherever it happened to be before.
        const restored: Card = {
          ...embedded,
          x: column.x + column.width + 32,
          y: column.y,
          width: embedded.width || 280,
        }

        const nextCards = state.cards
          .map(c => c.id === columnId && c.type === 'column'
            ? { ...c, content: { ...c.content, items: c.content.items.filter(i => i.id !== cardId) } }
            : c)
          .concat(restored)

        return {
          cards: nextCards,
          selectedIds: new Set([restored.id]),
          boards: persistActiveBoard(state.boards, state.activeBoardId, nextCards, state.connectors),
        }
      })
    },

    removeFromColumn: (columnId: string, cardId: string) => {
      set(state => {
        const column = state.cards.find(c => c.id === columnId)
        if (!column || column.type !== 'column') return state
        const target = column.content.items.find(c => c.id === cardId)
        if (!target) return state

        const cards = state.cards.map(c =>
          c.id === columnId && c.type === 'column'
            ? { ...c, content: { ...c.content, items: c.content.items.filter(i => i.id !== cardId) } }
            : c
        )
        return {
          cards,
          openDocId: state.openDocId === cardId ? null : state.openDocId,
          // Routed through the same promotion rule as a canvas delete, so
          // deleting a board card that lives inside a column still hands
          // its sub-board back to the gallery instead of losing it.
          boards: persistActiveBoard(
            promoteOrphanedSubBoards(state.boards, [target]),
            state.activeBoardId, cards, state.connectors,
          ),
        }
      })
    },

    addCardToColumn: (columnId: string, type: CardType, options?: Record<string, unknown>) => {
      if (type === 'column') return
      const card = createCard(type, 0, 0, options)

      // Board cards own a real child board wherever they live, including
      // inside a column — same rule as addCard().
      let childBoard: Board | null = null
      if (card.type === 'board') {
        const name = (options?.name as string)?.trim() || 'Sub-board'
        childBoard = {
          id: nanoid(), name,
          cards: [], connectors: [],
          createdAt: Date.now(), updatedAt: Date.now(),
          parentId: get().activeBoardId,
        }
        card.content.boardId = childBoard.id
        card.title = name
      }

      set(state => {
        const cards = state.cards.map(c =>
          c.id === columnId && c.type === 'column'
            ? { ...c, content: { ...c.content, items: [...c.content.items, card] } }
            : c
        )
        const boards = childBoard ? [...state.boards, childBoard] : state.boards
        return {
          cards,
          boards: persistActiveBoard(boards, state.activeBoardId, cards, state.connectors),
        }
      })
    },

    // ── DOCUMENT EDITOR ────────────────────────────────────────

    openDocument: (id: string) => set({ openDocId: id }),
    closeDocument: () => set({ openDocId: null }),

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
export const useDropColumnId  = () => useCanvasStore(s => s.dropColumnId)
export const useOpenDocId    = () => useCanvasStore(s => s.openDocId)
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
  toggleLock:      _state.toggleLock,
  addConnector:    _state.addConnector,
  updateConnector: _state.updateConnector,
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
  setDropColumn:   _state.setDropColumn,
  absorbCardIntoColumn: _state.absorbCardIntoColumn,
  ejectFromColumn:  _state.ejectFromColumn,
  addCardToColumn:  _state.addCardToColumn,
  removeFromColumn: _state.removeFromColumn,
  updateSettings:  _state.updateSettings,
  createBoard:     _state.createBoard,
  openBoard:       _state.openBoard,
  renameBoard:     _state.renameBoard,
  setBoardIcon:    _state.setBoardIcon,
  deleteBoard:     _state.deleteBoard,
  backToBoards:    _state.backToBoards,
  updateBoardName: _state.updateBoardName,
})
export const useCanvasActions = () => _actions
