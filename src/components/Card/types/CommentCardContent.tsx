import { useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import type { CommentCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// COMMENT CARD — a running thread of timestamped remarks
//
// Distinct from a note card: entries are append-only units with their
// own time, so the card reads as a review log or decision trail
// ("why did we drop option B?") rather than one editable blob.
//
// Ctrl/Cmd+Enter posts, matching every comment box on the web.
// ─────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const mins  = Math.floor((Date.now() - ts) / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Props { card: CommentCard }

export function CommentCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { entries } = card.content

  const post = () => {
    const text = draft.trim()
    if (!text) return
    updateCard(card.id, {
      content: {
        entries: [...entries, { id: nanoid(), text, createdAt: Date.now() }],
      },
    })
    setDraft('')
    inputRef.current?.focus()
  }

  const remove = (id: string) =>
    updateCard(card.id, { content: { entries: entries.filter(e => e.id !== id) } })

  return (
    <div className={styles.comment} onMouseDown={e => e.stopPropagation()}>
      {entries.length > 0 && (
        <ul className={styles.commentList}>
          {entries.map(entry => (
            <li key={entry.id} className={styles.commentEntry}>
              <div className={styles.commentHead}>
                <time
                  className={styles.commentTime}
                  dateTime={new Date(entry.createdAt).toISOString()}
                  title={new Date(entry.createdAt).toLocaleString()}
                >
                  {timeAgo(entry.createdAt)}
                </time>
                <button
                  className={styles.commentDel}
                  onClick={() => remove(entry.id)}
                  title="Delete this comment"
                  aria-label="Delete comment"
                ><Icon name="close" size={11} /></button>
              </div>
              <p className={styles.commentText}>{entry.text}</p>
            </li>
          ))}
        </ul>
      )}

      {entries.length === 0 && (
        <p className={styles.commentEmpty}>No comments yet.</p>
      )}

      <div className={styles.commentCompose}>
        <textarea
          ref={inputRef}
          className={styles.commentInput}
          placeholder="Add a comment…"
          value={draft}
          rows={2}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); post() }
            e.stopPropagation()
          }}
        />
        <button
          className={styles.commentPost}
          onClick={post}
          disabled={!draft.trim()}
          title="Post (Ctrl+Enter)"
        >Post</button>
      </div>
    </div>
  )
}
