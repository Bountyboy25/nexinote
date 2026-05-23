import { useCanvasStore } from '@/store'
import type { LinkCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// LINK CARD CONTENT
//
// URL field + description. Opens link in new tab on click.
// ─────────────────────────────────────────────────────────────

interface Props { card: LinkCard }

export function LinkCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const { url, description } = card.content

  function setUrl(val: string) {
    updateCard(card.id, { content: { ...card.content, url: val } })
  }

  function setDesc(val: string) {
    updateCard(card.id, { content: { ...card.content, description: val } })
  }

  const isValid = url.startsWith('http')

  return (
    <div className={styles.link} onMouseDown={e => e.stopPropagation()}>
      <div className={styles.linkIcon}>🔗</div>

      <input
        className={styles.linkUrl}
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.stopPropagation()}
        placeholder="https://…"
        spellCheck={false}
      />

      <textarea
        className={styles.linkDesc}
        value={description}
        onChange={e => setDesc(e.target.value)}
        onKeyDown={e => e.stopPropagation()}
        placeholder="Description (optional)"
        rows={2}
      />

      {isValid && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkOpen}
          onMouseDown={e => e.stopPropagation()}
        >
          Open ↗
        </a>
      )}
    </div>
  )
}
