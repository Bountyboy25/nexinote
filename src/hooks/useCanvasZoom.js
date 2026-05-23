import { useEffect } from 'react';
import { useCanvasStore } from '@/store';
import { clampZoom } from '@/utils/canvas';
// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK: useCanvasZoom
//
// Handles mouse wheel zooming, zooming toward the cursor.
//
// Key concept: wheel events are passive by default in modern
// browsers (for scroll performance). We need { passive: false }
// to call preventDefault() and prevent page scroll.
// ─────────────────────────────────────────────────────────────
const ZOOM_SENSITIVITY = 0.001; // How much each scroll tick zooms
export function useCanvasZoom(canvasRef) {
    const zoomTo = useCanvasStore(s => s.zoomTo);
    useEffect(() => {
        const el = canvasRef.current;
        if (!el)
            return;
        const onWheel = (e) => {
            e.preventDefault(); // Stop browser from scrolling the page
            const camera = useCanvasStore.getState().camera;
            // deltaY: positive = scroll down = zoom out
            //         negative = scroll up   = zoom in
            const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
            const newZoom = clampZoom(camera.zoom * factor);
            // Zoom toward the mouse cursor position
            zoomTo(newZoom, e.clientX, e.clientY);
        };
        // { passive: false } is required to call preventDefault()
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [canvasRef, zoomTo]);
}
