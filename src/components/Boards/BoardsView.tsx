import { useRef, useState } from 'react'
import { useCanvasStore, useBoards } from '@/store'
import { Icon } from '@/UI/Icon'
import { BoardIcon } from '@/UI/boardIcons'
import { BoardIconPicker } from '@/UI/BoardIconPicker'
import type { Board } from '@/types'
import styles from './BoardsView.module.css'

// ─────────────────────────────────────────────────────────────
// BOARDS VIEW — Gallery of all boards (landing screen)
//
// Displays board cards with:
//   - Title (editable inline via rename)
//   - Card count + date last edited
//   - Simple minimap thumbnail
//
// Actions: Create / Open / Rename / Delete
// ─────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Tiny thumbnail: render a few dots to represent card positions
function BoardThumbnail({ board }: { board: Board }) {
  // Compute the bounding box in one pass instead of two Math.max(...spread)
  // calls — spread args blow up at very large card counts, and the seed
  // value of 1 protects against an empty cards array (avoids -Infinity).
  let maxX = 1, maxY = 1
  for (const c of board.cards) {
    if (c.x + c.width > maxX) maxX = c.x + c.width
    if (c.y + 160      > maxY) maxY = c.y + 160
  }

  return (
    <svg className={styles.thumbnail} viewBox={`0 0 ${maxX} ${maxY}`} preserveAspectRatio="xMidYMid meet">
      {board.cards.map(c => (
        <rect
          key={c.id}
          x={c.x} y={c.y}
          width={c.width} height={120}
          rx={8}
          fill="var(--nx-core-soft)"
          stroke="color-mix(in srgb, var(--nx-core) 50%, transparent)"
          strokeWidth={4}
        />
      ))}
      {board.connectors.map(conn => {
        const from = board.cards.find(c => c.id === conn.fromId)
        const to   = board.cards.find(c => c.id === conn.toId)
        if (!from || !to) return null
        return (
          <line
            key={conn.id}
            x1={from.x + from.width / 2} y1={from.y + 60}
            x2={to.x   + to.width   / 2} y2={to.y   + 60}
            stroke="color-mix(in srgb, var(--nx-core) 40%, transparent)" strokeWidth={4}
          />
        )
      })}
    </svg>
  )
}

// How many boards live under this one, at any depth.
function countDescendants(boards: Board[], rootId: string): number {
  let total = 0
  const walk = (parentId: string) => {
    for (const b of boards) {
      if (b.parentId === parentId) { total++; walk(b.id) }
    }
  }
  walk(rootId)
  return total
}

// Each tile owns its own trigger ref and open state — the picker
// portals out of the tile, so it needs a per-board anchor element.
function BoardIconButton({
  board, onPick,
}: { board: Board; onPick: (icon: string, accent: string) => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.iconWrap}>
      <button
        ref={btnRef}
        className={styles.iconBtn}
        title="Change icon"
        aria-label="Change board icon"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >
        <BoardIcon name={board.icon} accent={board.accent} size={18} />
      </button>

      {open && (
        <BoardIconPicker
          icon={board.icon}
          accent={board.accent}
          anchorRef={btnRef}
          onPick={onPick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

interface RenamingState { id: string; name: string }

export function BoardsView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const allBoards = useBoards()
  const { createBoard, openBoard, renameBoard, deleteBoard, setBoardIcon } =
    useCanvasStore.getState()

  // Sub-boards are reached through their board card, not the gallery —
  // keeping them out of here is the entire point of nesting.
  const boards = allBoards.filter(b => !b.parentId)

  const [renaming, setRenaming] = useState<RenamingState | null>(null)
  const [newBoardName, setNewBoardName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  function handleCreate() {
    const name = newBoardName.trim() || 'Untitled Board'
    const board = createBoard(name)
    setNewBoardName('')
    setShowCreate(false)
    openBoard(board.id)
  }

  function handleRenameConfirm() {
    if (!renaming) return
    renameBoard(renaming.id, renaming.name.trim() || 'Untitled Board')
    setRenaming(null)
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    // Deleting cascades to every nested board, so say how much is going.
    const nested = countDescendants(allBoards, id)
    const warning = nested > 0
      ? `Delete this board and its ${nested} sub-board${nested === 1 ? '' : 's'}? This cannot be undone.`
      : 'Delete this board? This cannot be undone.'
    if (!confirm(warning)) return
    deleteBoard(id)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>Nexinote</h1>
        <div className={styles.headerRight}>
          <button
            className={styles.settingsBtn}
            onClick={onOpenSettings}
            data-tip="Settings"
            data-tip-pos="bottom"
            aria-label="Settings"
          >
            <Icon name="settings" size={16} />
          </button>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            + New Board
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h2 className={styles.sectionTitle}>Your Boards</h2>

        {/* Create board inline form */}
        {showCreate && (
          <div className={styles.createForm}>
            <input
              autoFocus
              className={styles.createInput}
              placeholder="Board name…"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setShowCreate(false); setNewBoardName('') }
              }}
            />
            <button className={styles.createConfirm} onClick={handleCreate}>Create</button>
            <button className={styles.createCancel} onClick={() => { setShowCreate(false); setNewBoardName('') }}>Cancel</button>
          </div>
        )}

        {/* Board gallery */}
        <div className={styles.grid}>
          {boards.map(board => (
            <div
              key={board.id}
              className={styles.boardCard}
              onClick={() => renaming?.id !== board.id && openBoard(board.id)}
            >
              {/* Thumbnail */}
              <div className={styles.thumbWrap}>
                {board.cards.length > 0
                  ? <BoardThumbnail board={board} />
                  : <div className={styles.emptyThumb}>
                      <span className={styles.emptyIcon}>
                        <BoardIcon name={board.icon} accent={board.accent} size={30} />
                      </span>
                      <span className={styles.emptyText}>Empty board</span>
                    </div>
                }
              </div>

              {/* Info row */}
              <div className={styles.info}>
                <BoardIconButton
                  board={board}
                  onPick={(icon, accent) => setBoardIcon(board.id, icon, accent)}
                />

                <div className={styles.infoText}>
                {renaming?.id === board.id
                  ? (
                    <input
                      autoFocus
                      className={styles.renameInput}
                      value={renaming.name}
                      onChange={e => setRenaming({ ...renaming, name: e.target.value })}
                      onBlur={handleRenameConfirm}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  handleRenameConfirm()
                        if (e.key === 'Escape') setRenaming(null)
                        e.stopPropagation()
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  )
                  : <span className={styles.boardName}>{board.name}</span>
                }
                <span className={styles.meta}>
                  {board.cards.length} card{board.cards.length !== 1 ? 's' : ''} · {timeAgo(board.updatedAt)}
                </span>
                </div>
              </div>

              {/* Hover actions */}
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  title="Rename"
                  onClick={e => {
                    e.stopPropagation()
                    setRenaming({ id: board.id, name: board.name })
                  }}
                >✏️</button>
                <button
                  className={`${styles.actionBtn} ${styles.actionDanger}`}
                  title="Delete"
                  onClick={e => handleDelete(board.id, e)}
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {boards.length === 0 && (
          <div className={styles.empty}>
            <p>No boards yet. Create your first one!</p>
          </div>
        )}
      </main>
    </div>
  )
}
