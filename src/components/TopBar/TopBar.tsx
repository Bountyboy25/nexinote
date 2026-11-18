import {
  useCards, useCamera, useCanvasStore, useActiveBoardId, useBoards, boardAncestry,
} from '@/store'
import { fitCameraToCards } from '@/utils/canvas'
import { Icon } from '@/UI/Icon'
import { GlyphIcon } from '@/UI/glyphs'
import styles from './TopBar.module.css'

// ─────────────────────────────────────────────────────────────
// TOP BAR
//
// • "Nexinote" logo (core → hot-core gradient) — click for gallery
// • Breadcrumb trail of the board's ancestors, since a board card can
//   nest boards inside boards. Ancestors are buttons that climb back
//   out; the last crumb is the current board and is editable inline.
// • Fit / Reset / Zoom controls + settings
// ─────────────────────────────────────────────────────────────

interface TopBarProps {
  onOpenSettings: () => void
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const cards         = useCards()
  const camera        = useCamera()
  const activeBoardId = useActiveBoardId()
  const boards        = useBoards()
  const { resetView, setCamera, backToBoards, updateBoardName, openBoard } =
    useCanvasStore.getState()

  // [root, …, current]. Everything but the last entry is an ancestor.
  const trail       = boardAncestry(boards, activeBoardId)
  const ancestors   = trail.slice(0, -1)
  const activeBoard = trail[trail.length - 1]

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
          data-tip="Back to boards"
          data-tip-pos="bottom"
          aria-label="Back to boards"
        >
          <span className={styles.logo}>Nexinote</span>
        </button>

        {activeBoardId && (
          <>
            {ancestors.map(ancestor => (
              <span key={ancestor.id} className={styles.crumbWrap}>
                <span className={styles.sep}>/</span>
                <button
                  className={styles.crumb}
                  onClick={() => openBoard(ancestor.id)}
                  title={`Back to ${ancestor.name}`}
                >
                  <GlyphIcon name={ancestor.icon} accent={ancestor.accent} size={14} />
                  {ancestor.name}
                </button>
              </span>
            ))}

            <span className={styles.sep}>/</span>
            <GlyphIcon
              name={activeBoard?.icon}
              accent={activeBoard?.accent}
              size={15}
              className={styles.crumbIcon}
            />
            <input
              className={styles.boardName}
              defaultValue={activeBoard?.name ?? 'Untitled Board'}
              key={activeBoardId}
              onBlur={e => {
                updateBoardName(e.target.value)
                // Mirror the store's trim/fallback in the uncontrolled input
                e.target.value = e.target.value.trim() || 'Untitled Board'
              }}
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
              data-tip="Reset zoom (Ctrl+0)"
              data-tip-pos="bottom"
              aria-label="Reset zoom"
            >
              {Math.round(camera.zoom * 100)}%
            </button>

            <button
              className={styles.btn}
              onClick={fitToScreen}
              data-tip="Fit to screen"
              data-tip-pos="bottom"
              aria-label="Fit to screen"
            >
              Fit
            </button>
          </>
        )}

        {/* Settings */}
        <button
          className={styles.btn}
          onClick={onOpenSettings}
          data-tip="Settings"
          data-tip-pos="bottom"
          aria-label="Settings"
        >
          <Icon name="settings" size={15} />
        </button>
      </div>
    </header>
  )
}
