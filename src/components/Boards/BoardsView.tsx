import { useState } from 'react'
import { useCanvasStore, useBoards } from '@/store'
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
  const maxX = Math.max(...board.cards.map(c => c.x + c.width), 1)
  const maxY = Math.max(...board.cards.map(c => c.y + 160), 1)

  return (
    <svg className={styles.thumbnail} viewBox={`0 0 ${maxX} ${maxY}`} preserveAspectRatio="xMidYMid meet">
      {board.cards.map(c => (
        <rect
          key={c.id}
          x={c.x} y={c.y}
          width={c.width} height={120}
          rx={8}
          fill="rgba(124,106,245,0.25)"
          stroke="rgba(124,106,245,0.5)"
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
            stroke="rgba(124,106,245,0.4)" strokeWidth={4}
          />
        )
      })}
    </svg>
  )
}

interface RenamingState { id: string; name: string }

export function BoardsView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const boards = useBoards()
  const { createBoard, openBoard, renameBoard, deleteBoard } = useCanvasStore.getState()

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
    if (!confirm('Delete this board? This cannot be undone.')) return
    deleteBoard(id)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>Nexinote</h1>
        <div className={styles.headerRight}>
          <button className={styles.settingsBtn} onClick={onOpenSettings} title="Settings">⚙</button>
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
                      <span className={styles.emptyIcon}>📋</span>
                      <span className={styles.emptyText}>Empty board</span>
                    </div>
                }
              </div>

              {/* Info row */}
              <div className={styles.info}>
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
