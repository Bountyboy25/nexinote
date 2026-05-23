import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store';
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
function isTyping(e) {
    const t = e.target;
    return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA';
}
export function useKeyboard(canvasRef) {
    const spaceHeld = useRef(false);
    const { deleteSelected, selectAll, deselectAll, resetView } = useCanvasStore.getState();
    useEffect(() => {
        const el = canvasRef.current;
        const onKeyDown = (e) => {
            // Space → pan mode
            if (e.code === 'Space' && !isTyping(e)) {
                e.preventDefault();
                spaceHeld.current = true;
                if (el)
                    el.style.cursor = 'grab';
                return;
            }
            // Escape → deselect all
            if (e.code === 'Escape') {
                deselectAll();
                return;
            }
            // Skip shortcuts if user is typing
            if (isTyping(e))
                return;
            // Delete / Backspace → delete selected cards
            if (e.code === 'Delete' || e.code === 'Backspace') {
                deleteSelected();
                return;
            }
            // Treat Ctrl (Win/Linux) and Cmd (macOS) the same way
            const mod = e.ctrlKey || e.metaKey;
            // Ctrl/Cmd+A → select all
            if (mod && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                selectAll();
                return;
            }
            // Ctrl/Cmd+0 → reset view
            if (mod && e.key === '0') {
                e.preventDefault();
                resetView();
                return;
            }
        };
        const onKeyUp = (e) => {
            if (e.code === 'Space') {
                spaceHeld.current = false;
                if (el)
                    el.style.cursor = 'default';
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, [canvasRef, deleteSelected, selectAll, deselectAll, resetView]);
    return { spaceHeld };
}
