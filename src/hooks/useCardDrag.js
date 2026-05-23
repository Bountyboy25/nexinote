import { useCallback, useRef } from 'react';
import { useCanvasStore } from '@/store';
// Native input/button tags we should NOT hijack with a drag.
const INTERACTIVE_TAGS = new Set(['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A']);
export function useCardDrag(card) {
    // Keep a ref to the card so listeners always see the latest position
    // without forcing a fresh useCallback every time x/y change. Refs are
    // stable across renders, so the onMouseDown handler is stable too.
    const cardRef = useRef(card);
    cardRef.current = card;
    const drag = useRef({
        active: false,
        startMouseX: 0,
        startMouseY: 0,
        startCardX: 0,
        startCardY: 0,
    });
    const onMouseDown = useCallback((e) => {
        // Don't start drag if clicking an interactive element
        const target = e.target;
        if (INTERACTIVE_TAGS.has(target.tagName) || target.isContentEditable) {
            return;
        }
        e.stopPropagation(); // Don't let the click bubble to the canvas
        // Read actions fresh — they're stable so this is essentially free.
        const store = useCanvasStore.getState();
        const { id } = cardRef.current;
        // Handle selection
        if (!e.shiftKey)
            store.deselectAll();
        store.selectCard(id, e.shiftKey);
        // Record starting positions from the latest card snapshot
        drag.current = {
            active: true,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startCardX: cardRef.current.x,
            startCardY: cardRef.current.y,
        };
        // Attach move/up to document for reliable tracking
        const onMouseMove = (ev) => {
            const d = drag.current;
            if (!d.active)
                return;
            // Read zoom freshly — it can change mid-drag if a wheel event fires.
            const { zoom } = useCanvasStore.getState().camera;
            // Screen delta → world delta
            const dx = (ev.clientX - d.startMouseX) / zoom;
            const dy = (ev.clientY - d.startMouseY) / zoom;
            useCanvasStore.getState().updateCard(cardRef.current.id, {
                x: d.startCardX + dx,
                y: d.startCardY + dy,
            });
        };
        const onMouseUp = () => {
            drag.current.active = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        // Empty deps — cardRef.current always points to the latest card,
        // and store actions are stable references in zustand.
    }, []);
    return { onMouseDown };
}
