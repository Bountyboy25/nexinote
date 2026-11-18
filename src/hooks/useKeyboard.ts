import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store'

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK: useKeyboard
//
// Manages all global keyboard shortcuts.
//
// Returns a ref to whether Space is currently held — other hooks
// use this to know if they should activate pan mode.
//
// Important: we check e.target to avoid triggering shortcuts
// when the user is typing in an input or contenteditable area.
// ─────────────────────────────────────────────────────────────

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'
}

export function useKeyboard(canvasRef: React.RefObject<HTMLElement | null>) {
  const spaceHeld = useRef(false)

  const { deleteSelected, selectAll, deselectAll, resetView, toggleLock } =
    useCanvasStore.getState()

  useEffect(() => {
    const el = canvasRef.current

    const onKeyDown = (e: KeyboardEvent) => {
      // Space → pan mode
      if (e.code === 'Space' && !isTyping(e)) {
        e.preventDefault()
        spaceHeld.current = true
        if (el) el.style.cursor = 'grab'
        return
      }

      // Escape → cancel connect mode first, otherwise deselect all
      if (e.code === 'Escape') {
        const { connectFromId, setConnectFrom, setActiveTool } = useCanvasStore.getState()
        if (connectFromId) {
          setConnectFrom(null)
          setActiveTool('select')
        } else {
          deselectAll()
        }
        return
      }

      // Skip shortcuts if user is typing
      if (isTyping(e)) return

      // Delete / Backspace → delete selected cards
      if (e.code === 'Delete' || e.code === 'Backspace') {
        deleteSelected()
        return
      }

      // Treat Ctrl (Win/Linux) and Cmd (macOS) the same way
      const mod = e.ctrlKey || e.metaKey

      // Ctrl/Cmd+A → select all
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        selectAll()
        return
      }

      // Ctrl/Cmd+0 → reset view
      if (mod && e.key === '0') {
        e.preventDefault()
        resetView()
        return
      }

      // Ctrl/Cmd+L → lock / unlock the selected cards in place
      if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        toggleLock()
        return
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        if (el) el.style.cursor = 'default'
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [canvasRef, deleteSelected, selectAll, deselectAll, resetView, toggleLock])

  return { spaceHeld }
}
