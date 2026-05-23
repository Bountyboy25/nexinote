import { useState } from 'react'
import { useActiveBoardId } from '@/store'
import { CanvasView }   from '@/components/Canvas/CanvasView'
import { TopBar }       from '@/components/TopBar/TopBar'
import { Toolbar }      from '@/components/Toolbar/Toolbar'
import { MiniMap }      from '@/components/MiniMap/MiniMap'
import { SideTaskbar }  from '@/components/SideTaskbar/SideTaskbar'
import { BoardsView }   from '@/components/Boards/BoardsView'
import { SettingsPanel } from '@/components/UI/SettingsPanel'

// ─────────────────────────────────────────────────────────────
// APP — Phase 3 root
//
// Routing is handled by activeBoardId in the store:
//   null        → BoardsView (gallery)
//   <boardId>   → Canvas (editor)
//
// The SideTaskbar is mounted globally (inside canvas view)
// and shows context-specific tools for the selected card.
// ─────────────────────────────────────────────────────────────

export function App() {
  const activeBoardId = useActiveBoardId()
  const [showSettings, setShowSettings] = useState(false)

  // Auto-open the first board on first launch (fresh localStorage)
  // Comment this out if you want to always start on the gallery.
  // useEffect(() => {
  //   const boards = useCanvasStore.getState().boards
  //   if (boards.length > 0 && !activeBoardId) {
  //     useCanvasStore.getState().openBoard(boards[0].id)
  //   }
  // }, [])

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
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  )
}
