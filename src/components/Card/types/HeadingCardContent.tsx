import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store'
import type { HeadingCard, HeadingAlign, HeadingLevel } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// HEADING CARD — a section title for the board
//
// Used to label regions of a canvas ("Research", "Q3 launch"), so it
// is deliberately plain text, not rich text: no inline formatting to
// fight with, and the whole string stays greppable.
//
// Like the other editors here, the text node is set once on mount and
// saved on blur. Making it a controlled input would move the caret to
// the end of the line on every keystroke.
// ─────────────────────────────────────────────────────────────

const LEVELS: HeadingLevel[] = [1, 2, 3]
const ALIGNS: HeadingAlign[] = ['left', 'center', 'right']

const ALIGN_GLYPH: Record<HeadingAlign, string> = {
  left: '⟵', center: '⟷', right: '⟶',
}

interface Props { card: HeadingCard }

export function HeadingCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const ref = useRef<HTMLDivElement>(null)
  const { text, level, align } = card.content

  useEffect(() => {
    if (ref.current && ref.current.textContent === '') {
      ref.current.textContent = text
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch: Partial<HeadingCard['content']>) =>
    updateCard(card.id, { content: { ...card.content, ...patch } })

  const save = () => {
    const next = ref.current?.textContent ?? ''
    if (next !== text) set({ text: next })
  }

  return (
    <div className={styles.heading} onMouseDown={e => e.stopPropagation()}>
      <div
        ref={ref}
        className={styles.headingText}
        data-level={level}
        style={{ textAlign: align }}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={save}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => {
          // Enter commits rather than inserting a line break — this is a
          // title, not a paragraph.
          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() }
          e.stopPropagation()
        }}
        data-placeholder="Heading…"
      />

      <div className={styles.headingTools}>
        <div className={styles.headingGroup}>
          {LEVELS.map(l => (
            <button
              key={l}
              className={`${styles.headingBtn} ${level === l ? styles.headingBtnOn : ''}`}
              onClick={() => set({ level: l })}
              title={`Heading ${l}`}
            >H{l}</button>
          ))}
        </div>
        <div className={styles.headingGroup}>
          {ALIGNS.map(a => (
            <button
              key={a}
              className={`${styles.headingBtn} ${align === a ? styles.headingBtnOn : ''}`}
              onClick={() => set({ align: a })}
              title={`Align ${a}`}
              aria-label={`Align ${a}`}
            >{ALIGN_GLYPH[a]}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
