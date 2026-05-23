import { useCards, useCamera, useCanvasStore, useActiveBoardId, useBoards } from '@/store'
import { fitCameraToCards } from '@/utils/canvas'
import styles from './TopBar.module.css'

// ─────────────────────────────────────────────────────────────
// TOP BAR — Phase 3
//
// • Logo renamed to "Nexinote" with green→gray→black gradient
// • Back button when inside a board (returns to gallery)
// • Board name is editable inline
// • Fit / Reset / Zoom controls
// ─────────────────────────────────────────────────────────────

interface TopBarProps {
  onOpenSettings: () => void
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const cards         = useCards()
  const camera        = useCamera()
  const activeBoardId = useActiveBoardId()
  const boards        = useBoards()
  const { resetView, setCamera, backToBoards, updateBoardName } = useCanvasStore.getState()

  const activeBoard = boards.find(b => b.id === activeBoardId)

  const fitToScreen = () => {
    const newCamera = fitCameraToCards(
      cards,
      window.innerWidth,
      window.innerHeight - 52,
    )
    setCamera(newCamera)
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {/* Logo — click to go back to boards */}
        <button
          className={styles.logoBtn}
          onClick={backToBoards}
          title="Back to boards"
        >
          <span className={styles.logo}>Nexinote</span>
        </button>

        {activeBoardId && (
          <>
            <span className={styles.sep}>/</span>
            <input
              className={styles.boardName}
              defaultValue={activeBoard?.name ?? 'Untitled Board'}
              key={activeBoardId}
              onBlur={e => updateBoardName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              spellCheck={false}
            />
          </>
        )}
      </div>

      <div className={styles.right}>
        {activeBoardId && (
          <>
            {/* Card count badge */}
            <span className={styles.badge}>
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>

            {/* Zoom display — click to reset */}
            <button
              className={styles.zoomBtn}
              onClick={resetView}
              title="Reset zoom (Ctrl+0)"
            >
              {Math.round(camera.zoom * 100)}%
            </button>

            <button className={styles.btn} onClick={fitToScreen} title="Fit to screen">
              Fit
            </button>
          </>
        )}

        {/* Settings */}
        <button className={styles.btn} onClick={onOpenSettings} title="Settings">
          ⚙
        </button>
      </div>
    </header>
  )
}
