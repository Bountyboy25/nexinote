import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useCanvasStore, useCards, useCamera, useConnectors } from '@/store';
import { worldToScreen } from '@/utils/canvas';
import styles from './ConnectorLayer.module.css';
// ─────────────────────────────────────────────────────────────
// CONNECTOR LAYER — Full-screen SVG bezier arrows
//
// Architecture: this SVG is OUTSIDE the #world div, rendered
// in SCREEN space. Card positions (world space) are converted
// to screen positions before drawing. This means the SVG is
// unaffected by the world's CSS transform — bezier curves always
// stay pixel-perfect over their cards.
//
// Each connector is:
//   - A <path> using cubic bezier (C command)
//   - A transparent wider <path> as a click target
//   - An arrowhead <marker>
//
// Click any line to delete that connector.
// ─────────────────────────────────────────────────────────────
const CARD_HEIGHT_ESTIMATE = 160; // Used to find approximate card center-Y
export function ConnectorLayer() {
    const cards = useCards();
    const camera = useCamera();
    const connectors = useConnectors();
    const deleteConnector = useCanvasStore(s => s.deleteConnector);
    // Build a quick lookup: id → card. Memoized so we don't rebuild a Map
    // for every render (this layer re-renders on every camera tick during
    // a pan/zoom, but the card list rarely changes mid-pan).
    const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);
    const handleDelete = useCallback((id, e) => {
        e.stopPropagation();
        deleteConnector(id);
    }, [deleteConnector]);
    return (_jsxs("svg", { className: styles.layer, style: { pointerEvents: 'none' }, children: [_jsx("defs", { children: _jsx("marker", { id: "arrow", markerWidth: "8", markerHeight: "8", refX: "6", refY: "3", orient: "auto", children: _jsx("path", { d: "M0,0 L0,6 L8,3 z", fill: "var(--connector-color, #7c6af5)" }) }) }), connectors.map(conn => {
                const from = cardMap.get(conn.fromId);
                const to = cardMap.get(conn.toId);
                if (!from || !to)
                    return null;
                // Card center in world space
                const fx = from.x + from.width / 2;
                const fy = from.y + CARD_HEIGHT_ESTIMATE / 2;
                const tx = to.x + to.width / 2;
                const ty = to.y + CARD_HEIGHT_ESTIMATE / 2;
                // Convert to screen space
                const fScreen = worldToScreen(fx, fy, camera);
                const tScreen = worldToScreen(tx, ty, camera);
                // Cubic bezier control points — horizontal tangents
                const dx = Math.abs(tScreen.x - fScreen.x);
                const cpOffset = Math.max(60, dx * 0.5);
                const d = [
                    `M ${fScreen.x} ${fScreen.y}`,
                    `C ${fScreen.x + cpOffset} ${fScreen.y}`,
                    `  ${tScreen.x - cpOffset} ${tScreen.y}`,
                    `  ${tScreen.x} ${tScreen.y}`,
                ].join(' ');
                return (_jsxs("g", { style: { pointerEvents: 'auto' }, children: [_jsx("path", { d: d, fill: "none", stroke: "transparent", strokeWidth: "12", style: { cursor: 'pointer' }, onClick: e => handleDelete(conn.id, e) }), _jsx("path", { d: d, fill: "none", stroke: "var(--connector-color, #7c6af5)", strokeWidth: "1.5", strokeOpacity: "0.7", markerEnd: "url(#arrow)", style: { pointerEvents: 'none' } })] }, conn.id));
            })] }));
}
