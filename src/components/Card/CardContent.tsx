import { RichTextCard }        from './types/RichTextCard'
import { TaskCardContent }     from './types/TaskCardContent'
import { TableCardContent }    from './types/TableCardContent'
import { MediaCardContent }    from './types/MediaCardContent'
import { LinkCardContent }     from './types/LinkCardContent'
import { DocumentCardContent } from './types/DocumentCardContent'
import { ColumnCardContent }   from './types/ColumnCardContent'
import { SketchCardContent }   from './types/SketchCardContent'
import { ColorCardContent }    from './types/ColorCardContent'
import { AudioCardContent }    from './types/AudioCardContent'
import { VideoCardContent }    from './types/VideoCardContent'
import { HeadingCardContent }  from './types/HeadingCardContent'
import { CommentCardContent }  from './types/CommentCardContent'
import { BoardCardContent }    from './types/BoardCardContent'
import { lazy, Suspense } from 'react'
import type { Card } from '@/types'
import styles from './types/CardTypes.module.css'

// Map cards are the one type with a heavy third-party dependency:
// Leaflet is ~147KB of JS plus ~15KB of CSS, which was a third of the
// main bundle — downloaded on every board, including the majority that
// contain no map at all. Splitting it out means that cost is paid only
// once a map card actually renders.
//
// The leaflet CSS import lives inside MapCardContent (not main.tsx) so
// it travels with this chunk instead of the global stylesheet.
const MapCardContent = lazy(() =>
  import('./types/MapCardContent').then(m => ({ default: m.MapCardContent }))
)

// ─────────────────────────────────────────────────────────────
// CARD FACTORY — card.type → its content component
//
// Lives in its own module rather than inside CardNode because it has
// TWO consumers now: the canvas card shell, and ColumnCardContent,
// which renders whole embedded cards. Importing it from CardNode
// would make CardNode ⇄ ColumnCardContent a cycle.
//
// Every content component takes the same single `card` prop and reads
// and writes through the store, so it renders identically whether the
// card sits on the canvas or inside a column.
//
// Adding a card type = one case here (plus the type union, the store's
// createCard, CARD_ICONS in CardNode, and a Toolbar entry).
// ─────────────────────────────────────────────────────────────

export function CardContent({ card }: { card: Card }) {
  switch (card.type) {
    case 'note':     return <RichTextCard         card={card} />
    case 'document': return <DocumentCardContent  card={card} />
    case 'task':     return <TaskCardContent      card={card} />
    case 'table':    return <TableCardContent     card={card} />
    case 'media':    return <MediaCardContent     card={card} />
    case 'link':     return <LinkCardContent      card={card} />
    case 'column':   return <ColumnCardContent    card={card} />
    case 'sketch':   return <SketchCardContent    card={card} />
    case 'color':    return <ColorCardContent     card={card} />
    case 'audio':    return <AudioCardContent     card={card} />
    case 'video':    return <VideoCardContent     card={card} />
    case 'heading':  return <HeadingCardContent   card={card} />
    case 'comment':  return <CommentCardContent   card={card} />
    case 'board':    return <BoardCardContent     card={card} />
    case 'map':
      // Fallback is sized from the card's stored height so the card
      // doesn't visibly collapse and re-expand while the chunk loads.
      return (
        <Suspense
          fallback={
            <div className={styles.mapLoading} style={{ height: card.content.height }}>
              Loading map…
            </div>
          }
        >
          <MapCardContent card={card} />
        </Suspense>
      )
  }
}
