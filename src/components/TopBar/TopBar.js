import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCards, useCamera, useCanvasStore } from '@/store';
import { fitCameraToCards } from '@/utils/canvas';
import styles from './TopBar.module.css';
// ─────────────────────────────────────────────────────────────
// TOP BAR — The navigation bar at the top
//
// Notice: this component only subscribes to `cards.length`
// (via useCards) and `camera` (via useCamera).
// It does NOT subscribe to selectedIds or activeTool.
//
// This is intentional — components should only subscribe to
// the state they actually need. Subscribing to everything
// causes unnecessary re-renders.
// ─────────────────────────────────────────────────────────────
export function TopBar() {
    const cards = useCards();
    const camera = useCamera();
    const { resetView, setCamera } = useCanvasStore.getState();
    const fitToScreen = () => {
        const newCamera = fitCameraToCards(cards, window.innerWidth, window.innerHeight - 52);
        setCamera(newCamera);
    };
    return (_jsxs("header", { className: styles.topbar, children: [_jsxs("div", { className: styles.left, children: [_jsx("span", { className: styles.logo, children: "Canvas" }), _jsx("span", { className: styles.sep, children: "/" }), _jsx("input", { className: styles.boardName, defaultValue: "Untitled Board", spellCheck: false })] }), _jsxs("div", { className: styles.right, children: [_jsxs("span", { className: styles.badge, children: [cards.length, " ", cards.length === 1 ? 'card' : 'cards'] }), _jsxs("button", { className: styles.zoomBtn, onClick: resetView, title: "Reset zoom (Ctrl+0)", children: [Math.round(camera.zoom * 100), "%"] }), _jsx("button", { className: styles.btn, onClick: fitToScreen, title: "Fit to screen", children: "Fit" })] })] }));
}
