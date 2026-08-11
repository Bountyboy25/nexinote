import { useState } from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore, useCards, useConnectors } from '@/store'
import { fitCameraToCards } from '@/utils/canvas'
import type { Card } from '@/types'
import styles from './TemplatesModal.module.css'

// ───────────────────────────────────────────────────────
// TEMPLATES MODAL — preset board starters
//
// Reached two ways, which is why it has two modes:
//
//   'welcome' — shown automatically the first time a board or
//               sub-board is opened. This is the natural moment to
//               offer a starting layout: the board is empty, so there
//               is nothing to lose and no warning is needed. Declining
//               is a first-class option, not a hidden X.
//   'menu'    — opened deliberately from Settings, on a board that may
//               already hold work.
//
// Applying a template REPLACES the board. When the board has anything
// on it, the pick routes through an explicit confirmation naming what
// will be destroyed — the counts come from the live board, not from a
// generic "are you sure".
// ───────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  /** 'welcome' is the automatic first-open offer; 'menu' is deliberate. */
  mode?: 'welcome' | 'menu'
}

// ── Template definitions ──────────────────────────────────────
//
// Each template's `cards` is a thunk so nanoid() runs at apply-time —
// we want a fresh ID for every card every time the user picks a template,
// not a single set of IDs baked in at module load.

interface TemplateDef {
  id: string
  name: string
  emoji: string
  desc: string
  cards: () => Card[]
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'blank',
    name: 'Blank Board',
    emoji: '⬜',
    desc: 'Start fresh with an empty canvas.',
    cards: () => [],
  },
  {
    id: 'project',
    name: 'Project Plan',
    emoji: '🗂️',
    desc: 'Backlog, in-progress, and done columns.',
    cards: () => [
      { id: nanoid(), type: 'note',  x: 60,  y: 80,  width: 240, title: 'Project Goal',    createdAt: Date.now(), content: { html: '<p>Define your project objective here.</p>' } },
      { id: nanoid(), type: 'task',  x: 60,  y: 260, width: 240, title: 'Backlog',          createdAt: Date.now(), content: { items: [
        { id: nanoid(), text: 'Research', done: false },
        { id: nanoid(), text: 'Design',   done: false },
        { id: nanoid(), text: 'Build',    done: false },
      ]}},
      { id: nanoid(), type: 'task',  x: 340, y: 260, width: 240, title: 'In Progress',      createdAt: Date.now(), content: { items: [
        { id: nanoid(), text: 'Setup repo', done: false },
      ]}},
      { id: nanoid(), type: 'task',  x: 620, y: 260, width: 240, title: 'Done',             createdAt: Date.now(), content: { items: [
        { id: nanoid(), text: 'Project kick-off', done: true },
      ]}},
      { id: nanoid(), type: 'note',  x: 340, y: 80,  width: 520, title: 'Timeline',         createdAt: Date.now(), content: { html: '<p><strong>Week 1:</strong> Research &amp; planning<br><strong>Week 2:</strong> Design &amp; prototyping<br><strong>Week 3–4:</strong> Build &amp; test</p>' } },
    ],
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    emoji: '🧠',
    desc: 'Central idea surrounded by branches.',
    cards: () => [
      { id: nanoid(), type: 'note',  x: 280, y: 200, width: 200, title: 'Central Idea',  createdAt: Date.now(), content: { html: '<p>Your big idea goes here</p>' } },
      { id: nanoid(), type: 'note',  x: 60,  y: 60,  width: 200, title: 'Branch 1',      createdAt: Date.now(), content: { html: '<p>First angle or theme</p>' } },
      { id: nanoid(), type: 'note',  x: 540, y: 60,  width: 200, title: 'Branch 2',      createdAt: Date.now(), content: { html: '<p>Second angle or theme</p>' } },
      { id: nanoid(), type: 'note',  x: 60,  y: 360, width: 200, title: 'Branch 3',      createdAt: Date.now(), content: { html: '<p>Third angle or theme</p>' } },
      { id: nanoid(), type: 'note',  x: 540, y: 360, width: 200, title: 'Branch 4',      createdAt: Date.now(), content: { html: '<p>Fourth angle or theme</p>' } },
      { id: nanoid(), type: 'note',  x: 280, y: 420, width: 200, title: 'Next Steps',    createdAt: Date.now(), content: { html: '<ul><li>Action 1</li><li>Action 2</li></ul>' } },
    ],
  },
  {
    id: 'moodboard',
    name: 'Mood Board',
    emoji: '🎨',
    desc: 'Visual inspiration with image placeholders.',
    cards: () => [
      { id: nanoid(), type: 'note',  x: 60,  y: 60,  width: 260, title: 'Theme',        createdAt: Date.now(), content: { html: '<p>Describe the mood, palette, and aesthetic you\'re going for.</p>' } },
      { id: nanoid(), type: 'media', x: 360, y: 60,  width: 200, title: 'Image 1',       createdAt: Date.now(), content: { src: '', fit: 'cover' } },
      { id: nanoid(), type: 'media', x: 600, y: 60,  width: 200, title: 'Image 2',       createdAt: Date.now(), content: { src: '', fit: 'cover' } },
      { id: nanoid(), type: 'media', x: 360, y: 280, width: 200, title: 'Image 3',       createdAt: Date.now(), content: { src: '', fit: 'cover' } },
      { id: nanoid(), type: 'note',  x: 60,  y: 280, width: 260, title: 'Color Palette', createdAt: Date.now(), content: { html: '<p>Primary: #<br>Secondary: #<br>Accent: #<br>Background: #</p>' } },
      { id: nanoid(), type: 'link',  x: 600, y: 280, width: 200, title: 'Inspiration',   createdAt: Date.now(), content: { url: 'https://', description: 'Reference link' } },
    ],
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    emoji: '📋',
    desc: 'Agenda, notes, and action items.',
    cards: () => [
      { id: nanoid(), type: 'note',  x: 60,  y: 60,  width: 280, title: 'Meeting Info',   createdAt: Date.now(), content: { html: '<p><strong>Date:</strong> <br><strong>Attendees:</strong> <br><strong>Goal:</strong> </p>' } },
      { id: nanoid(), type: 'task',  x: 60,  y: 260, width: 280, title: 'Agenda',          createdAt: Date.now(), content: { items: [
        { id: nanoid(), text: 'Introductions',    done: false },
        { id: nanoid(), text: 'Review last week', done: false },
        { id: nanoid(), text: 'This week\'s plan', done: false },
        { id: nanoid(), text: 'Open questions',   done: false },
      ]}},
      { id: nanoid(), type: 'note',  x: 380, y: 60,  width: 280, title: 'Notes',           createdAt: Date.now(), content: { html: '<p>Key discussion points…</p>' } },
      { id: nanoid(), type: 'task',  x: 380, y: 260, width: 280, title: 'Action Items',    createdAt: Date.now(), content: { items: [
        { id: nanoid(), text: 'Owner: Task description', done: false },
      ]}},
    ],
  },
]

// ── Component ─────────────────────────────────────────

export function TemplatesModal({ onClose, mode = 'menu' }: Props) {
  const cards      = useCards()
  const connectors = useConnectors()
  const { applyTemplate, setCamera, resetView } = useCanvasStore.getState()

  // Set while a destructive pick is awaiting confirmation.
  const [pending, setPending] = useState<TemplateDef | null>(null)

  const isWelcome = mode === 'welcome'
  // Whether picking anything would destroy work. In welcome mode the
  // board is new, so this is normally false and picks apply straight away.
  const hasContent = cards.length > 0

  function commit(def: TemplateDef) {
    const templateCards = def.cards()

    if (templateCards.length === 0) {
      applyTemplate([])
      resetView()
      onClose()
      return
    }

    applyTemplate(templateCards)
    setCamera(
      fitCameraToCards(
        templateCards,
        window.innerWidth,
        window.innerHeight - 52,
      ),
    )
    onClose()
  }

  // A pick on a board with work on it stops for confirmation first.
  function pick(def: TemplateDef) {
    if (hasContent) setPending(def)
    else commit(def)
  }

  // Backdrop click closes modal
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  // In welcome mode the blank option is the "no thanks" button below,
  // so it would be a duplicate inside the grid.
  const shown = isWelcome ? TEMPLATES.filter(t => t.id !== 'blank') : TEMPLATES

  return (
    <div className={styles.backdrop} onClick={onBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {isWelcome ? 'Start with a template?' : 'Choose a template'}
            </h2>
            <p className={styles.subtitle}>
              {isWelcome
                ? 'Pick a layout to begin with, or start from an empty board.'
                : 'A template replaces everything currently on this board.'}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {pending ? (
          /* ── Destructive confirmation ── */
          <div className={styles.warning} role="alertdialog" aria-live="assertive">
            <div className={styles.warnIcon} aria-hidden="true">⚠</div>
            <h3 className={styles.warnTitle}>This will erase the board</h3>
            <p className={styles.warnBody}>
              Applying <strong>{pending.name}</strong> deletes everything currently
              on this board — {cards.length} card{cards.length === 1 ? '' : 's'}
              {connectors.length > 0 && (
                <> and {connectors.length} connector{connectors.length === 1 ? '' : 's'}</>
              )}
              . This cannot be undone.
            </p>
            <p className={styles.warnNote}>
              Sub-boards held by any board card are kept, and return to your
              board gallery.
            </p>
            <div className={styles.warnActions}>
              <button className={styles.warnCancel} onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className={styles.warnConfirm} onClick={() => commit(pending)}>
                Erase and apply
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {shown.map(t => (
                <button
                  key={t.id}
                  className={styles.card}
                  onClick={() => pick(t)}
                >
                  <span className={styles.emoji}>{t.emoji}</span>
                  <span className={styles.name}>{t.name}</span>
                  <span className={styles.desc}>{t.desc}</span>
                </button>
              ))}
            </div>

            {isWelcome && (
              <div className={styles.skipRow}>
                <button className={styles.skipBtn} onClick={onClose}>
                  Start with an empty board
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
