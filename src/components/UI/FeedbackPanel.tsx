import { useState } from 'react'
import { Icon } from '@/UI/Icon'
import {
  submitFeedback, feedbackAsText, FEEDBACK_CONFIGURED,
  type FeedbackCategory, type FeedbackResult,
} from '@/utils/feedback'
import styles from './FeedbackPanel.module.css'

// ─────────────────────────────────────────────────────────────
// FEEDBACK PANEL
//
// Lives inside Settings. Two design choices worth keeping:
//
//   1. SUGGESTED PROMPTS. "Send feedback" with an empty box gets
//      "it's good, thanks". The prompts give people a specific thing to
//      answer, which is what produces usable reports — clicking one
//      seeds the message rather than replacing what's already typed.
//   2. NOTHING IS EVER LOST. If the endpoint isn't configured, is
//      unreachable, or the build is offline, the message is still
//      copyable to the clipboard so it can be pasted somewhere. A
//      feedback form that eats what someone took the time to write is
//      worse than no form.
//
// The note about what gets sent is not decoration — it has to stay true
// to collectContext() in utils/feedback.ts.
// ─────────────────────────────────────────────────────────────

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'bug',       label: 'Something broke' },
  { id: 'confusing', label: 'Confusing' },
  { id: 'idea',      label: 'Idea' },
  { id: 'praise',    label: 'Works well' },
  { id: 'other',     label: 'Other' },
]

// Keyed by category so the prompts match what the person came to say.
const PROMPTS: Record<FeedbackCategory, string[]> = {
  bug: [
    'What were you doing right before it happened?',
    'What did you expect instead?',
    'Does it happen every time?',
  ],
  confusing: [
    'What were you trying to do?',
    'Where did you look for it first?',
    'What did you expect this to be called?',
  ],
  idea: [
    'What would this let you do that you can’t today?',
    'How often would you use it?',
    'What do you use instead right now?',
  ],
  praise: [
    'What did you get done with it?',
    'What would make you keep using it?',
  ],
  other: [
    'What’s on your mind?',
  ],
}

const MAX_LEN = 2000

interface Props { onClose: () => void }

export function FeedbackPanel({ onClose }: Props) {
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [message, setMessage]   = useState('')
  const [contact, setContact]   = useState('')
  const [busy, setBusy]         = useState(false)
  const [result, setResult]     = useState<FeedbackResult | null>(null)
  const [copied, setCopied]     = useState(false)

  const usePrompt = (p: string) => {
    // Append rather than overwrite — clicking a second prompt shouldn't
    // discard the answer to the first.
    setMessage(cur => (cur.trim() ? `${cur.trim()}\n\n${p}\n` : `${p}\n`))
  }

  async function send() {
    setBusy(true)
    setResult(null)
    const r = await submitFeedback({ category, message, contact })
    setResult(r)
    setBusy(false)
    if (r.status === 'ok' || r.status === 'sent-unconfirmed') {
      setMessage('')
    }
  }

  async function copyOut() {
    try {
      await navigator.clipboard.writeText(feedbackAsText({ category, message, contact }))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const sent = result?.status === 'ok' || result?.status === 'sent-unconfirmed'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Send feedback</h2>
            <p className={styles.subtitle}>
              Rough notes are fine — specific beats polished.
            </p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>
          {/* Category */}
          <div className={styles.chips} role="group" aria-label="Feedback type">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`${styles.chip} ${category === c.id ? styles.chipOn : ''}`}
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Suggested prompts for the chosen category */}
          <div className={styles.prompts}>
            <span className={styles.promptsLabel}>Not sure what to write?</span>
            {PROMPTS[category].map(p => (
              <button key={p} className={styles.prompt} onClick={() => usePrompt(p)}>
                + {p}
              </button>
            ))}
          </div>

          <textarea
            className={styles.textarea}
            value={message}
            maxLength={MAX_LEN}
            onChange={e => setMessage(e.target.value)}
            placeholder="What happened, or what would you change?"
            rows={7}
            autoFocus
          />
          <div className={styles.count}>{message.length} / {MAX_LEN}</div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email — optional, only if you want a reply</span>
            <input
              className={styles.input}
              type="email"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {/* Must stay in step with collectContext() in utils/feedback.ts */}
          <p className={styles.privacy}>
            <Icon name="lock" size={13} />
            <span>
              Sent with your message: app version, browser, screen size, theme, and
              how many boards and cards you have. <strong>Never sent:</strong> anything
              you wrote on a board — no note text, titles, images, sketches or board names.
            </span>
          </p>

          {result?.status === 'error' && (
            <div className={`${styles.notice} ${styles.noticeBad}`}>
              {result.reason} Your message is still here — you can copy it out below.
            </div>
          )}
          {result?.status === 'ok' && (
            <div className={`${styles.notice} ${styles.noticeGood}`}>
              Thanks — that came through.
            </div>
          )}
          {result?.status === 'sent-unconfirmed' && (
            <div className={`${styles.notice} ${styles.noticeGood}`}>
              Sent. The service didn’t send a receipt back, so if you want to be
              certain it landed, copy your message as a backup.
            </div>
          )}
          {!FEEDBACK_CONFIGURED && (
            <div className={`${styles.notice} ${styles.noticeInfo}`}>
              This build has no feedback address configured, so nothing can be
              submitted from here. Use <strong>Copy</strong> and send it along
              however you like.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.secondary}
            onClick={copyOut}
            disabled={!message.trim()}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <div className={styles.footerRight}>
            <button className={styles.secondary} onClick={onClose}>
              {sent ? 'Done' : 'Cancel'}
            </button>
            <button
              className={styles.primary}
              onClick={send}
              disabled={busy || !message.trim() || !FEEDBACK_CONFIGURED}
            >
              {busy ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
