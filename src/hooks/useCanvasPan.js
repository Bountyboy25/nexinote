import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store';
export function useCanvasPan(canvasRef, spaceHeld) {
    // useRef stores mutable values that DON'T trigger re-renders.
    // Perfect for tracking drag state — we don't want to re-render
    // on every mouse move.
    const panState = useRef({ active: false, lastX: 0, lastY: 0 });
    useEffect(() => {
        const el = canvasRef.current;
        if (!el)
            return;
        const setCursor = (cursor) => {
            el.style.cursor = cursor;
        };
        const onMouseDown = (e) => {
            // Pan on: space+left click OR middle mouse button
            if ((spaceHeld.current && e.button === 0) || e.button === 1) {
                e.preventDefault();
                panState.current = { active: true, lastX: e.clientX, lastY: e.clientY };
                setCursor('grabbing');
            }
        };
        const onMouseMove = (e) => {
            const pan = panState.current;
            if (!pan.active)
                return;
            const dx = e.clientX - pan.lastX;
            const dy = e.clientY - pan.lastY;
            pan.lastX = e.clientX;
            pan.lastY = e.clientY;
            // Functional update — read current camera from the store and add
            // the delta. Avoids any stale-closure issues that would arise from
            // capturing camera in this listener's scope.
            useCanvasStore.setState(state => ({
                camera: {
                    ...state.camera,
                    x: state.camera.x + dx,
                    y: state.camera.y + dy,
                },
            }));
        };
        const onMouseUp = () => {
            if (!panState.current.active)
                return;
            panState.current.active = false;
            setCursor(spaceHeld.current ? 'grab' : 'default');
        };
        // Attach move/up to the document, NOT the element, so that fast
        // mouse movements that leave the element still register.
        el.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        // canvasRef and spaceHeld are stable refs; ref identity does not
        // change, so this effect runs once on mount.
    }, [canvasRef, spaceHeld]);
}
