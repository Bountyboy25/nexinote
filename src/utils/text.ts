// ─────────────────────────────────────────────────────────────
// TEXT UTILITIES
// ─────────────────────────────────────────────────────────────

/** Strip HTML tags and collapse whitespace into a single plain-text line. */
export function htmlToText(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Count words in a chunk of HTML. */
export function wordCount(html: string): number {
  const text = htmlToText(html)
  return text ? text.split(/\s+/).length : 0
}
