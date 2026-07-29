import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useCanvasStore, useOpenDocId, findCardDeep } from '@/store'
import { wordCount } from '@/utils/text'
import type { DocumentCard } from '@/types'
import styles from './DocumentEditorModal.module.css'

// ─────────────────────────────────────────────────────────────
// DOCUMENT EDITOR MODAL — full-page writing view
//
// A word-processor style editor (Google Docs / Word / LibreOffice
// Writer inspired) with:
//   • Undo / redo
//   • Paragraph style, font family and font size pickers
//   • Bold / italic / underline / strikethrough
//   • Text color + highlight color
//   • Alignment (left/center/right/justify), lists, indent/outdent
//   • Line spacing, links, blockquote, horizontal rule
//   • Clear formatting
//   • Keyboard shortcuts (Ctrl/Cmd+B, I, U, K, Shift+X)
//   • Toolbar buttons reflect the formatting at the caret
//   • Autosaves to the store (debounced) and on close
// ─────────────────────────────────────────────────────────────

const FONTS = [
  { label: 'Georgia',        value: 'Georgia, serif' },
  { label: 'Arial',          value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Verdana',        value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS',   value: "'Trebuchet MS', sans-serif" },
  { label: 'Garamond',       value: 'Garamond, serif' },
  { label: 'Courier New',    value: "'Courier New', monospace" },
]

// execCommand fontSize takes 1–7; label them like a word processor.
const FONT_SIZES = [
  { label: '10', value: '1' },
  { label: '13', value: '2' },
  { label: '16', value: '3' },
  { label: '18', value: '4' },
  { label: '24', value: '5' },
  { label: '32', value: '6' },
  { label: '48', value: '7' },
]

const BLOCKS = [
  { label: 'Normal text', value: 'p' },
  { label: 'Heading 1',   value: 'h1' },
  { label: 'Heading 2',   value: 'h2' },
  { label: 'Heading 3',   value: 'h3' },
  { label: 'Quote',       value: 'blockquote' },
  { label: 'Code block',  value: 'pre' },
]

const LINE_SPACINGS = ['1', '1.15', '1.5', '1.7', '2', '2.5']

type ActiveState = {
  bold: boolean; italic: boolean; underline: boolean; strike: boolean
  ul: boolean; ol: boolean
  justifyLeft: boolean; justifyCenter: boolean; justifyRight: boolean; justifyFull: boolean
  block: string; fontName: string; fontSize: string
}

const EMPTY_ACTIVE: ActiveState = {
  bold: false, italic: false, underline: false, strike: false,
  ul: false, ol: false,
  justifyLeft: false, justifyCenter: false, justifyRight: false, justifyFull: false,
  block: 'p', fontName: '', fontSize: '3',
}

export function DocumentEditorModal() {
  const openDocId = useOpenDocId()
  // findCardDeep, not cards.find — a document card dropped into a column
  // is no longer a top-level card, but it must still open in this editor.
  const card = useCanvasStore(
    s => findCardDeep(s.cards, s.openDocId) as DocumentCard | undefined
  )
  const { updateCard, closeDocument } = useCanvasStore.getState()

  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [words, setWords]   = useState(0)
  const [chars, setChars]   = useState(0)
  const [dirty, setDirty]   = useState(false)
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE)

  const recount = useCallback(() => {
    const el = editorRef.current
    setWords(el ? wordCount(el.innerHTML) : 0)
    setChars(el ? (el.textContent ?? '').length : 0)
  }, [])

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (editorRef.current && openDocId) {
      updateCard(openDocId, { content: { html: editorRef.current.innerHTML } })
      setDirty(false)
    }
  }, [openDocId, updateCard])

  const scheduleSave = useCallback(() => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, 400)
  }, [saveNow])

  const close = useCallback(() => {
    saveNow()
    closeDocument()
  }, [saveNow, closeDocument])

  // Reflect the formatting at the caret in the toolbar.
  const refreshActive = useCallback(() => {
    const el = editorRef.current
    if (!el || !document.activeElement || !el.contains(window.getSelection()?.anchorNode ?? null)) return
    let block = ''
    try { block = String(document.queryCommandValue('formatBlock')).toLowerCase() } catch { /* noop */ }
    let fontName = ''
    try { fontName = String(document.queryCommandValue('fontName')).replace(/["']/g, '') } catch { /* noop */ }
    let fontSize = '3'
    try { fontSize = String(document.queryCommandValue('fontSize')) || '3' } catch { /* noop */ }
    setActive({
      bold:          document.queryCommandState('bold'),
      italic:        document.queryCommandState('italic'),
      underline:     document.queryCommandState('underline'),
      strike:        document.queryCommandState('strikeThrough'),
      ul:            document.queryCommandState('insertUnorderedList'),
      ol:            document.queryCommandState('insertOrderedList'),
      justifyLeft:   document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight:  document.queryCommandState('justifyRight'),
      justifyFull:   document.queryCommandState('justifyFull'),
      block: block || 'p',
      fontName,
      fontSize,
    })
  }, [])

  // Load content + focus when a document opens (or a different one).
  useEffect(() => {
    if (!openDocId || !editorRef.current) return
    try { document.execCommand('styleWithCSS', false, 'true') } catch { /* noop */ }
    editorRef.current.innerHTML = card?.content.html ?? ''
    recount()
    setDirty(false)
    editorRef.current.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDocId])

  // Track caret/selection so the toolbar shows active formatting.
  useEffect(() => {
    if (!openDocId) return
    document.addEventListener('selectionchange', refreshActive)
    return () => document.removeEventListener('selectionchange', refreshActive)
  }, [openDocId, refreshActive])

  // Flush any pending save if the editor unmounts.
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // Seed the color pickers from the active theme tokens
  // (input[type=color] needs a literal #rrggbb, so resolve at mount;
  //  fallbacks mirror the Cherenkov defaults in nuclear-base.css)
  const pickerDefaults = useMemo(() => {
    const css = getComputedStyle(document.documentElement)
    const pick = (name: string, fallback: string) => {
      const v = css.getPropertyValue(name).trim()
      return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback
    }
    return { ink: pick('--nx-ink', '#dbe9ff'), hazard: pick('--nx-hazard', '#ffb454') }
  }, [])

  if (!openDocId || !card) return null

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    recount()
    refreshActive()
    scheduleSave()
  }

  function insertLink() {
    const sel = window.getSelection()
    const current = sel?.anchorNode?.parentElement?.closest('a')?.getAttribute('href') ?? ''
    const url = window.prompt('Link URL:', current || 'https://')
    if (url === null) return
    if (url === '' || url === 'https://') exec('unlink')
    else exec('createLink', url)
  }

  // Apply line spacing to the block elements touched by the selection.
  function setLineSpacing(spacing: string) {
    const el = editorRef.current
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const blocks = new Set<HTMLElement>()
    const findBlock = (node: Node | null): HTMLElement | null => {
      let n: Node | null = node
      while (n && n !== el) {
        if (n instanceof HTMLElement && /^(P|H1|H2|H3|H4|LI|BLOCKQUOTE|PRE|DIV)$/.test(n.tagName)) return n
        n = n.parentNode
      }
      return null
    }
    const startB = findBlock(range.startContainer)
    const endB   = findBlock(range.endContainer)
    if (startB) blocks.add(startB)
    if (endB)   blocks.add(endB)
    // Include blocks fully between start and end.
    el.querySelectorAll('p, h1, h2, h3, h4, li, blockquote, pre, div').forEach(b => {
      if (range.intersectsNode(b)) blocks.add(b as HTMLElement)
    })
    if (blocks.size === 0) { el.style.lineHeight = spacing; scheduleSave(); return }
    blocks.forEach(b => { b.style.lineHeight = spacing })
    editorRef.current?.focus()
    scheduleSave()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return
    const k = e.key.toLowerCase()
    if (k === 'b') { e.preventDefault(); exec('bold') }
    else if (k === 'i') { e.preventDefault(); exec('italic') }
    else if (k === 'u') { e.preventDefault(); exec('underline') }
    else if (k === 'k') { e.preventDefault(); insertLink() }
    else if (k === 'x' && e.shiftKey) { e.preventDefault(); exec('strikeThrough') }
  }

  // Small helpers to keep the toolbar JSX tidy.
  const keepSel = (e: React.MouseEvent | React.PointerEvent) => e.preventDefault()
  const Btn = ({ label, title, on, onClick, wide }: {
    label: React.ReactNode; title: string; on?: boolean; onClick: () => void; wide?: boolean
  }) => (
    <button
      type="button"
      className={`${styles.toolBtn} ${on ? styles.toolBtnActive : ''} ${wide ? styles.toolBtnWide : ''}`}
      title={title}
      onMouseDown={keepSel}
      onClick={onClick}
    >
      {label}
    </button>
  )
  const Sep = () => <span className={styles.sep} aria-hidden="true" />

  const currentFont =
    FONTS.find(f => f.value.toLowerCase().includes(active.fontName.toLowerCase()) && active.fontName)?.value ?? FONTS[0].value

  return (
    <div
      className={styles.overlay}
      onMouseDown={close}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); close() }
      }}
    >
      <div className={styles.page} onMouseDown={e => e.stopPropagation()}>
        {/* ── Header — title + close ── */}
        <div className={styles.header}>
          <span className={styles.docIcon}>📄</span>
          <input
            className={styles.titleInput}
            value={card.title}
            onChange={e => updateCard(openDocId!, { title: e.target.value })}
            placeholder="Untitled document"
            spellCheck={false}
          />
          <button className={styles.close} onClick={close} title="Close (Esc)">✕</button>
        </div>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
          {/* Undo / redo */}
          <Btn label="↶" title="Undo (Ctrl+Z)" onClick={() => exec('undo')} />
          <Btn label="↷" title="Redo (Ctrl+Y)" onClick={() => exec('redo')} />
          <Sep />

          {/* Paragraph style */}
          <select
            className={styles.toolSelect}
            title="Paragraph style"
            value={BLOCKS.some(b => b.value === active.block) ? active.block : 'p'}
            onMouseDown={e => e.stopPropagation()}
            onChange={e => exec('formatBlock', `<${e.target.value}>`)}
          >
            {BLOCKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>

          {/* Font family */}
          <select
            className={styles.toolSelect}
            title="Font"
            value={currentFont}
            onMouseDown={e => e.stopPropagation()}
            onChange={e => exec('fontName', e.target.value)}
          >
            {FONTS.map(f => (
              <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>

          {/* Font size */}
          <select
            className={`${styles.toolSelect} ${styles.toolSelectNarrow}`}
            title="Font size"
            value={FONT_SIZES.some(s => s.value === active.fontSize) ? active.fontSize : '3'}
            onMouseDown={e => e.stopPropagation()}
            onChange={e => exec('fontSize', e.target.value)}
          >
            {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Sep />

          {/* Inline styles */}
          <Btn label={<b>B</b>} title="Bold (Ctrl+B)"      on={active.bold}      onClick={() => exec('bold')} />
          <Btn label={<i>I</i>} title="Italic (Ctrl+I)"    on={active.italic}    onClick={() => exec('italic')} />
          <Btn label={<u>U</u>} title="Underline (Ctrl+U)" on={active.underline} onClick={() => exec('underline')} />
          <Btn label={<s>S</s>} title="Strikethrough (Ctrl+Shift+X)" on={active.strike} onClick={() => exec('strikeThrough')} />

          {/* Colors */}
          <label className={styles.colorWrap} title="Text color" onMouseDown={keepSel}>
            <span className={styles.colorLabel}>A</span>
            <input
              type="color"
              className={styles.colorInput}
              defaultValue={pickerDefaults.ink}
              onChange={e => exec('foreColor', e.target.value)}
            />
          </label>
          <label className={styles.colorWrap} title="Highlight color" onMouseDown={keepSel}>
            <span className={`${styles.colorLabel} ${styles.highlightLabel}`}>A</span>
            <input
              type="color"
              className={styles.colorInput}
              defaultValue={pickerDefaults.hazard}
              onChange={e => exec('hiliteColor', e.target.value)}
            />
          </label>
          <Sep />

          {/* Alignment */}
          <Btn label="⯇" title="Align left"    on={active.justifyLeft}   onClick={() => exec('justifyLeft')} />
          <Btn label="≡" title="Align center"  on={active.justifyCenter} onClick={() => exec('justifyCenter')} />
          <Btn label="⯈" title="Align right"   on={active.justifyRight}  onClick={() => exec('justifyRight')} />
          <Btn label="☰" title="Justify"       on={active.justifyFull}   onClick={() => exec('justifyFull')} />
          <Sep />

          {/* Lists + indent */}
          <Btn label="•≡" title="Bullet list"   on={active.ul} onClick={() => exec('insertUnorderedList')} wide />
          <Btn label="1≡" title="Numbered list" on={active.ol} onClick={() => exec('insertOrderedList')} wide />
          <Btn label="⇤" title="Decrease indent" onClick={() => exec('outdent')} />
          <Btn label="⇥" title="Increase indent" onClick={() => exec('indent')} />

          {/* Line spacing */}
          <select
            className={`${styles.toolSelect} ${styles.toolSelectNarrow}`}
            title="Line spacing"
            defaultValue="1.7"
            onMouseDown={e => e.stopPropagation()}
            onChange={e => setLineSpacing(e.target.value)}
          >
            {LINE_SPACINGS.map(s => <option key={s} value={s}>↕ {s}</option>)}
          </select>
          <Sep />

          {/* Insert / misc */}
          <Btn label="🔗" title="Insert link (Ctrl+K)" onClick={insertLink} />
          <Btn label="―" title="Horizontal rule" onClick={() => exec('insertHorizontalRule')} />
          <Btn label="Tx" title="Clear formatting" onClick={() => { exec('removeFormat'); exec('unlink') }} wide />
        </div>

        {/* ── The writing surface ── */}
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { recount(); scheduleSave() }}
          onKeyDown={onKeyDown}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onBlur={saveNow}
          data-placeholder="Start writing…"
        />

        {/* ── Footer — counts + save state ── */}
        <div className={styles.footer}>
          <span>{words} {words === 1 ? 'word' : 'words'} · {chars} characters</span>
          <span className={styles.saveState}>{dirty ? 'Saving…' : 'Saved'}</span>
        </div>
      </div>
    </div>
  )
}
