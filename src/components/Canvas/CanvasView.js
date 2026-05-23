import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useCallback } from 'react';
import { useCanvasStore, useCards, useCamera } from '@/store';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useCanvasPan } from '@/hooks/useCanvasPan';
import { useCanvasZoom } from '@/hooks/useCanvasZoom';
import { CardNode } from '@/components/Card/CardNode';
import { ConnectorLayer } from './ConnectorLayer';
import { screenToWorld } from '@/utils/canvas';
import styles from './CanvasView.module.css';
// ─────────────────────────────────────────────────────────────
// CANVAS VIEW — Phase 2: mounts ConnectorLayer
//
// Component hierarchy:
//   App
//   └── CanvasView          ← you are here
//       ├── ConnectorLayer  (fixed full-screen SVG, screen space)
//       ├── #grid           (dot background)
//       └── #world          (moves with camera)
//           └── CardNode[]
// ─────────────────────────────────────────────────────────────
export function CanvasView() {
    const cards = useCards();
    const camera = useCamera();
    const { addCard, deselectAll } = useCanvasStore.getState();
    const canvasRef = useRef(null);
    const { spaceHeld } = useKeyboard(canvasRef);
    useCanvasPan(canvasRef, spaceHeld);
    useCanvasZoom(canvasRef);
    const onDoubleClick = useCallback((e) => {
        const target = e.target;
        if (!target.closest('[data-card]')) {
            const worldPos = screenToWorld(e.clientX, e.clientY, camera);
            addCard('note', worldPos.x - 140, worldPos.y - 60);
        }
    }, [camera, addCard]);
    const onMouseDown = useCallback((e) => {
        const target = e.target;
        if (!target.closest('[data-card]') && !spaceHeld.current) {
            deselectAll();
        }
    }, [deselectAll, spaceHeld]);
    const onContextMenu = useCallback((e) => {
        e.preventDefault();
    }, []);
    const worldTransform = {
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        transformOrigin: '0 0',
        willChange: 'transform', // ✅ valid JSX — was will-change="transform"
    };
    const gridSize = 32 * camera.zoom;
    const gridStyle = {
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${camera.x % gridSize}px ${camera.y % gridSize}px`,
    };
    return (_jsxs("div", { ref: canvasRef, className: styles.canvas, onDoubleClick: onDoubleClick, onMouseDown: onMouseDown, onContextMenu: onContextMenu, children: [_jsx(ConnectorLayer, {}), _jsx("div", { className: styles.grid, style: gridStyle }), _jsx("div", { className: styles.world, style: worldTransform, children: cards.map(card => (_jsx(CardNode, { card: card }, card.id))) })] }));
}
