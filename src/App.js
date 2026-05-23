import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { CanvasView } from '@/components/Canvas/CanvasView';
import { TopBar } from '@/components/TopBar/TopBar';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { MiniMap } from '@/components/MiniMap/MiniMap';
import { useCanvasStore } from '@/store';
import { nanoid } from 'nanoid';
// ─────────────────────────────────────────────────────────────
// APP — Root component (Phase 2)
//
// Demo cards now use the discriminated union content shapes.
// ConnectorLayer and TemplatesModal are mounted inside their
// respective child components (CanvasView and Toolbar).
// ─────────────────────────────────────────────────────────────
const DEMO_CARDS = [
    {
        id: nanoid(), type: 'note', x: 80, y: 80, width: 280, title: 'Welcome to Nexinote 👋', createdAt: Date.now(),
        content: { html: '<p>This is your infinite canvas.</p><ul><li>Double-click to add a note</li><li>Scroll to zoom · Space+drag to pan</li><li>Use the toolbar below to add cards</li><li>Click <strong>⟶</strong> on a card to connect it</li></ul>' },
    },
    {
        id: nanoid(), type: 'task', x: 400, y: 80, width: 260, title: 'Phase 2 Checklist', createdAt: Date.now(),
        content: { items: [
                { id: nanoid(), text: 'Rich text cards', done: true },
                { id: nanoid(), text: 'Task cards', done: true },
                { id: nanoid(), text: 'Table cards', done: true },
                { id: nanoid(), text: 'Media cards', done: true },
                { id: nanoid(), text: 'Connector arrows', done: true },
                { id: nanoid(), text: 'Templates modal', done: true },
            ] },
    },
    {
        id: nanoid(), type: 'table', x: 80, y: 320, width: 300, title: 'Sample Spreadsheet', createdAt: Date.now(),
        content: { rows: [
                ['Q1', '12400', '=B1*1.1'],
                ['Q2', '15800', '=B2*1.1'],
                ['Q3', '18200', '=B3*1.1'],
                ['Total', '=SUM(B1:B3)', '=SUM(C1:C3)'],
            ] },
    },
    {
        id: nanoid(), type: 'link', x: 420, y: 320, width: 240, title: 'Phase 3 →', createdAt: Date.now(),
        content: { url: 'https://github.com', description: 'Real-time collab · AI assist · Export · PWA' },
    },
];
export function App() {
    useEffect(() => {
        // Seed demo cards directly into the store (avoids double-render via addCard)
        useCanvasStore.setState(state => ({
            cards: state.cards.length === 0 ? DEMO_CARDS : state.cards,
        }));
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(TopBar, {}), _jsx(CanvasView, {}), _jsx(Toolbar, {}), _jsx(MiniMap, {})] }));
}
