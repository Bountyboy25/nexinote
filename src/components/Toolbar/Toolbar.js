import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useCanvasStore, useActiveTool, useCamera, useConnectFrom } from '@/store';
import { getViewportCenter } from '@/utils/canvas';
import { TemplatesModal } from '@/components/UI/TemplatesModal';
import styles from './Toolbar.module.css';
const TOOLS = [
    { id: 'select', icon: '⬚', label: 'Select (V)' },
    { id: 'note', icon: '📝', label: 'Note (N)', isCard: true, cardType: 'note' },
    { id: 'task', icon: '✅', label: 'Task (T)', isCard: true, cardType: 'task' },
    { id: 'table', icon: '📊', label: 'Table', isCard: true, cardType: 'table' },
    { id: 'media', icon: '🖼️', label: 'Image (I)', isCard: true, cardType: 'media' },
    { id: 'link', icon: '🔗', label: 'Link (L)', isCard: true, cardType: 'link' },
    { id: 'connect', icon: '⟶', label: 'Connect (C)' },
];
export function Toolbar() {
    const activeTool = useActiveTool();
    const camera = useCamera();
    const connectFromId = useConnectFrom();
    const [showTemplates, setShowTemplates] = useState(false);
    const { setActiveTool, addCard, selectAll, deleteSelected, clearBoard, resetView, setConnectFrom } = useCanvasStore.getState();
    const handleToolClick = (tool) => {
        setActiveTool(tool.id);
        if (tool.id === 'connect') {
            // Connect mode — user now clicks a card to start connecting
            return;
        }
        if (tool.isCard && tool.cardType) {
            const center = getViewportCenter(camera);
            addCard(tool.cardType, center.x - 140, center.y - 60);
            setActiveTool('select');
        }
        // Switching away from connect mode cancels it
        if (connectFromId)
            setConnectFrom(null);
    };
    const cancelConnect = () => {
        setConnectFrom(null);
        setActiveTool('select');
    };
    return (_jsxs(_Fragment, { children: [connectFromId && (_jsxs("div", { className: styles.connectBanner, children: [_jsx("span", { children: "\uD83D\uDD17 Click a card to connect \u2014 or" }), _jsx("button", { className: styles.connectCancel, onClick: cancelConnect, children: "Cancel" })] })), _jsxs("div", { className: styles.toolbar, children: [_jsx("div", { className: styles.group, children: TOOLS.map(tool => (_jsx("button", { className: [
                                styles.btn,
                                activeTool === tool.id ? styles.active : '',
                                tool.id === 'connect' && connectFromId ? styles.connecting : '',
                            ].filter(Boolean).join(' '), onClick: () => handleToolClick(tool), title: tool.label, children: tool.icon }, tool.id))) }), _jsx("div", { className: styles.sep }), _jsxs("div", { className: styles.group, children: [_jsx("button", { className: styles.btn, onClick: selectAll, title: "Select all (Ctrl+A)", children: "\u229E" }), _jsx("button", { className: styles.btn, onClick: deleteSelected, title: "Delete selected (Del)", children: "\u2715" }), _jsx("button", { className: `${styles.btn} ${styles.danger}`, onClick: () => { if (confirm('Clear the entire board?'))
                                    clearBoard(); }, title: "Clear board", children: "\uD83D\uDDD1\uFE0F" })] }), _jsx("div", { className: styles.sep }), _jsxs("div", { className: styles.group, children: [_jsx("button", { className: styles.btn, onClick: resetView, title: "Reset view (Ctrl+0)", children: "\u2299" }), _jsx("button", { className: styles.btn, onClick: () => setShowTemplates(true), title: "Templates", children: "\u229F" })] })] }), showTemplates && _jsx(TemplatesModal, { onClose: () => setShowTemplates(false) })] }));
}
