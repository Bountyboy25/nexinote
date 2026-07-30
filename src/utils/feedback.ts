import { useCanvasStore } from '@/store'
import { useThemeStore } from '@/store/useThemeStore'

// ─────────────────────────────────────────────────────────────
// FEEDBACK SUBMISSION
//
// Posts to a Google Apps Script web app that appends a row to a
// spreadsheet (see feedback/README.md for the script and setup). There
// is no backend in this project and this doesn't add one — the endpoint
// is Google's, and the URL is baked in at build time.
//
// ── What is sent ─────────────────────────────────────────────
// The message, the chosen category, an optional contact address, and a
// small amount of technical context that makes a bug report actionable:
// app version, platform/browser string, viewport, active theme, and
// COUNTS of boards/cards/connectors.
//
// ── What is deliberately NOT sent ────────────────────────────
// No board content of any kind. No note text, card titles, sketch
// strokes, images, map pins, or board names. Someone's notes are the
// most private thing in this app, and a feedback form is not consent to
// upload them. collectContext() below only ever reads `.length`.
// The UI states this next to the form; keep the two in agreement.
//
// ── CORS ─────────────────────────────────────────────────────
// Apps Script is awkward from a browser. A POST with a JSON content type
// triggers a preflight that Apps Script doesn't answer, so the body goes
// as text/plain — a "simple request" with no preflight. The script
// parses it as JSON on the other side. If the response still can't be
// read (deployment settings vary), we retry opaquely with no-cors, which
// delivers the request but hides the result; the caller is told the
// difference so it can word things honestly.
// ─────────────────────────────────────────────────────────────

export const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT ?? ''

export const FEEDBACK_CONFIGURED = FEEDBACK_ENDPOINT.length > 0

// Injected from package.json at build time (vite.config.ts `define`), so
// the version stamped on a feedback row can't drift from the real build.
export const APP_VERSION = __APP_VERSION__

export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'confusing' | 'other'

export interface FeedbackPayload {
  category: FeedbackCategory
  message: string
  contact: string
}

export type FeedbackResult =
  | { status: 'ok' }
  /** Delivered, but the response was opaque so receipt isn't provable. */
  | { status: 'sent-unconfirmed' }
  | { status: 'error'; reason: string }

/**
 * Non-identifying technical context. Reads only lengths — never content.
 */
function collectContext() {
  const s = useCanvasStore.getState()
  return {
    version: APP_VERSION,
    theme: useThemeStore.getState().themeKey,
    boards: s.boards.length,
    cards: s.cards.length,
    connectors: s.connectors.length,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    platform: navigator.userAgent,
    language: navigator.language,
    installed:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  }
}

/** The full record, exactly as it will be transmitted. */
export function buildFeedbackRecord(payload: FeedbackPayload) {
  return {
    submittedAt: new Date().toISOString(),
    category: payload.category,
    message: payload.message.trim(),
    contact: payload.contact.trim(),
    ...collectContext(),
  }
}

/** Human-readable copy of the record, for the clipboard fallback. */
export function feedbackAsText(payload: FeedbackPayload): string {
  const r = buildFeedbackRecord(payload)
  return Object.entries(r)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  if (!FEEDBACK_CONFIGURED) {
    return { status: 'error', reason: 'No feedback endpoint is configured for this build.' }
  }
  if (!payload.message.trim()) {
    return { status: 'error', reason: 'Write a message first.' }
  }

  const body = JSON.stringify(buildFeedbackRecord(payload))

  // text/plain keeps this a simple request — no CORS preflight, which
  // Apps Script would not answer.
  try {
    const res = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    })
    if (res.ok) return { status: 'ok' }
    return { status: 'error', reason: `Server replied ${res.status}.` }
  } catch {
    // Reading the response was blocked. The request itself may still be
    // deliverable opaquely, so try once more and be honest that we can't
    // confirm what happened to it.
    try {
      await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
      })
      return { status: 'sent-unconfirmed' }
    } catch {
      return { status: 'error', reason: 'Could not reach the feedback service.' }
    }
  }
}
