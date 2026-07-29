import { useState } from 'react'
import { useActiveBoardId, useCanvasStore } from '@/store'
import { CanvasView }   from '@/components/Canvas/CanvasView'
import { TopBar }       from '@/components/TopBar/TopBar'
import { Toolbar }      from '@/components/Toolbar/Toolbar'
import { MiniMap }      from '@/components/MiniMap/MiniMap'
import { SideTaskbar }  from '@/components/SideTaskbar/SideTaskbar'
import { BoardsView }   from '@/components/Boards/BoardsView'
import { SettingsPanel } from '@/components/UI/SettingsPanel'
import { TemplatesModal } from '@/components/UI/TemplatesModal'
import { DocumentEditorModal } from '@/components/UI/DocumentEditorModal'

// ─────────────────────────────────────────────────────────────
// APP — Phase 3 root
//
// Routing is handled by activeBoardId in the store:
//   null        → BoardsView (gallery)
//   <boardId>   → Canvas (editor)
//
// The SideTaskbar is mounted globally (inside canvas view)
// and shows context-specific tools for the selected card.
//
// Templates are offered here rather than from a toolbar button: the
// useful moment to choose a starting layout is when you first walk into
// an empty board, not later from a menu. Deliberate access lives in
// Settings for when you want to re-template an existing board.
// ─────────────────────────────────────────────────────────────

export function App() {
  const activeBoardId = useActiveBoardId()
  const [showSettings, setShowSettings]   = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Selector returns a BOOLEAN, not the board object. persistActiveBoard
  // rewrites `boards` on every keystroke, so subscribing to the board
  // itself would re-render the whole app tree while you type.
  const needsTemplateOffer = useCanvasStore(s => {
    const board = s.boards.find(b => b.id === s.activeBoardId)
    return !!board && !board.templatePrompted
  })

  // Whether it was accepted or declined, a board is only ever asked once.
  const dismissTemplateOffer = () => {
    const id = useCanvasStore.getState().activeBoardId
    if (id) useCanvasStore.getState().markTemplatePrompted(id)
  }

  if (!activeBoardId) {
    return (
      <>
        <BoardsView onOpenSettings={() => setShowSettings(true)} />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </>
    )
  }

  return (
    <>
      <TopBar onOpenSettings={() => setShowSettings(true)} />
      <SideTaskbar />
      <CanvasView />
      <Toolbar />
      <MiniMap />
      <DocumentEditorModal />

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onOpenTemplates={() => {
            // Swap panels rather than stacking them — the templates modal
            // is a full decision of its own, not a settings sub-step.
            setShowSettings(false)
            setShowTemplates(true)
          }}
        />
      )}

      {/* First entry into this board — offer a starting layout. */}
      {needsTemplateOffer && (
        <TemplatesModal mode="welcome" onClose={dismissTemplateOffer} />
      )}

      {/* Deliberately opened from Settings. */}
      {showTemplates && (
        <TemplatesModal mode="menu" onClose={() => setShowTemplates(false)} />
      )}
    </>
  )
}
