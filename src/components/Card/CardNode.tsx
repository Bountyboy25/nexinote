import { memo } from 'react'
import {
  useCanvasStore, useSelectedIds, useConnectFrom, useDropColumnId, useDraggingCardId,
} from '@/store'
import { useCardDrag } from '@/hooks/useCardDrag'
import { CardContent } from './CardContent'
import { Icon, type IconName } from '@/UI/Icon'
import type { Card } from '@/types'
import styles from './CardNode.module.css'

// ─────────────────────────────────────────────────────────────
// CARD NODE — Shell + CardFactory pattern
//
// This component owns:
//   - Position, size, selection ring
//   - Drag handle (via useCardDrag)
//   - Header (title + connect button)
//   - Footer (duplicate / delete)
//
// It delegates content rendering to the CardFactory switch.
// Adding a new card type = add one case in CardContent below.
// ─────────────────────────────────────────────────────────────

// Nuclear Nexus monoline glyphs (UI/Icon.tsx) — replaced the emoji set so
// header icons follow the theme tokens + each card's accent color.
const CARD_ICONS: Record<Card['type'], IconName> = {
  note:     'note',
  document: 'document',
  task:     'task',
  table:    'table',
  media:    'media',
  link:     'link',
  column:   'column',
  sketch:   'sketch',
  color:    'color',
  audio:    'audio',
  video:    'video',
  heading:  'heading',
  comment:  'comment',
  map:      'map',
  board:    'board',
}

// ── Main card shell ───────────────────────────────────────────
interface CardNodeProps { card: Card }

// memo: dragging (or editing) one card replaces only that card's object
// in the store, so every OTHER CardNode bails out on the shallow prop
// check instead of re-rendering its whole content tree per mousemove.
// Store-driven state (selection, connect mode) still updates normally
// because those subscriptions live inside the component.
export const CardNode = memo(function CardNode({ card }: CardNodeProps) {
  const selectedIds   = useSelectedIds()
  const connectFromId = useConnectFrom()
  const dropColumnId  = useDropColumnId()
  // Confirms a press-and-hold actually engaged — without a visible change
  // the hold feels like nothing happened. Flips twice per drag, so the
  // extra render is negligible.
  const draggingCardId = useDraggingCardId()
  const {
    updateCard, deleteCard, duplicateCard, toggleLock,
    addConnector, setConnectFrom, setActiveTool,
  } = useCanvasStore.getState()
  // Two handlers on purpose — see useCardDrag. The capture one arms
  // press-and-hold for presses that content components swallow.
  const { onMouseDown, onMouseDownCapture } = useCardDrag(card)

  const isSelected      = selectedIds.has(card.id)
  const isConnectMode   = connectFromId !== null
  const isConnectSource = connectFromId === card.id

  // Click while in connect mode → complete the connection
  const onCardClick = (e: React.MouseEvent) => {
    if (!isConnectMode) return
    e.stopPropagation()
    if (isConnectSource) {
      // Click source again → cancel
      setConnectFrom(null)
      setActiveTool('select')
      return
    }
    addConnector(connectFromId!, card.id)
    setConnectFrom(null)
    setActiveTool('select')
  }

  // Connector tool button in card header
  const onConnectBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConnectFrom(card.id)
    setActiveTool('connect')
  }

  const classNames = [
    styles.card,
    styles[card.type],
    isSelected      ? styles.selected      : '',
    isConnectSource ? styles.connectSource  : '',
    isConnectMode && !isConnectSource ? styles.connectTarget : '',
    dropColumnId === card.id ? styles.dropTarget : '',
    card.locked ? styles.locked : '',
    draggingCardId === card.id ? styles.dragging : '',
    // Document cards are the smallest type on the board, so their shell
    // tightens to match — see .compact in the stylesheet.
    card.type === 'document' ? styles.compact : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      data-card={card.id}
      style={{ left: card.x, top: card.y, width: card.width }}
      onMouseDownCapture={onMouseDownCapture}
      onMouseDown={onMouseDown}
      onClick={isConnectMode ? onCardClick : undefined}
    >
      {/* ── HEADER ───────────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.icon}><Icon name={CARD_ICONS[card.type]} size={15} /></span>

        <input
          className={styles.title}
          defaultValue={card.title}
          onChange={e => updateCard(card.id, { title: e.target.value })}
          onMouseDown={e => e.stopPropagation()}
          spellCheck={false}
        />

        {/* Lock — pins the card's position (contents stay editable) */}
        <button
          className={`${styles.connectBtn} ${card.locked ? styles.lockOn : ''}`}
          onClick={e => { e.stopPropagation(); toggleLock(card.id) }}
          onMouseDown={e => e.stopPropagation()}
          title={card.locked ? 'Unlock position (Ctrl+L)' : 'Lock in place (Ctrl+L)'}
          aria-label={card.locked ? 'Unlock card position' : 'Lock card position'}
          aria-pressed={!!card.locked}
        ><Icon name={card.locked ? 'lock' : 'unlock'} size={13} /></button>

        {/* Connect button — starts connect mode for this card */}
        <button
          className={styles.connectBtn}
          onClick={onConnectBtnClick}
          onMouseDown={e => e.stopPropagation()}
          title="Connect to another card"
        ><Icon name="connect" size={13} /></button>
      </div>

      {/* ── BODY — rendered by CardFactory ───────────────── */}
      <div className={styles.body}>
        <CardContent card={card} />
      </div>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <div className={styles.footer}>
        <button
          className={styles.btn}
          onClick={e => { e.stopPropagation(); duplicateCard(card.id) }}
        >
          Duplicate
        </button>
        <button
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={e => { e.stopPropagation(); deleteCard(card.id) }}
        >
          Delete
        </button>
      </div>
    </div>
  )
})
