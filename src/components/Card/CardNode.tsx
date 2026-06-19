import { useCanvasStore, useSelectedIds, useConnectFrom } from '@/store'
import { useCardDrag } from '@/hooks/useCardDrag'
import { RichTextCard }        from './types/RichTextCard'
import { TaskCardContent }     from './types/TaskCardContent'
import { TableCardContent }    from './types/TableCardContent'
import { MediaCardContent }    from './types/MediaCardContent'
import { LinkCardContent }     from './types/LinkCardContent'
import { DocumentCardContent } from './types/DocumentCardContent'
import { ColumnCardContent }   from './types/ColumnCardContent'
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

const CARD_ICONS: Record<string, string> = {
  note:     '📝',
  document: '📄',
  task:     '✅',
  table:    '📊',
  media:    '🖼️',
  link:     '🔗',
  column:   '▤',
}

// ── CardFactory — dispatches to the right content component ──
function CardContent({ card }: { card: Card }) {
  switch (card.type) {
    case 'note':     return <RichTextCard        card={card} />
    case 'document': return <DocumentCardContent  card={card} />
    case 'task':     return <TaskCardContent      card={card} />
    case 'table':    return <TableCardContent     card={card} />
    case 'media':    return <MediaCardContent     card={card} />
    case 'link':     return <LinkCardContent      card={card} />
    case 'column':   return <ColumnCardContent    card={card} />
  }
}

// ── Main card shell ───────────────────────────────────────────
interface CardNodeProps { card: Card }

export function CardNode({ card }: CardNodeProps) {
  const selectedIds   = useSelectedIds()
  const connectFromId = useConnectFrom()
  const {
    updateCard, deleteCard, duplicateCard,
    addConnector, setConnectFrom, setActiveTool,
  } = useCanvasStore.getState()
  const { onMouseDown } = useCardDrag(card)

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
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      data-card={card.id}
      style={{ left: card.x, top: card.y, width: card.width }}
      onMouseDown={onMouseDown}
      onClick={isConnectMode ? onCardClick : undefined}
    >
      {/* ── HEADER ───────────────────────────────────────── */}
      <div className={styles.header}>
        <span className={styles.icon}>{CARD_ICONS[card.type]}</span>

        <input
          className={styles.title}
          defaultValue={card.title}
          onChange={e => updateCard(card.id, { title: e.target.value })}
          onMouseDown={e => e.stopPropagation()}
          spellCheck={false}
        />

        {/* Connect button — starts connect mode for this card */}
        <button
          className={styles.connectBtn}
          onClick={onConnectBtnClick}
          onMouseDown={e => e.stopPropagation()}
          title="Connect to another card"
        >⟶</button>
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
}
