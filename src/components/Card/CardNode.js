import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCanvasStore, useSelectedIds, useConnectFrom } from '@/store';
import { useCardDrag } from '@/hooks/useCardDrag';
import { RichTextCard } from './types/RichTextCard';
import { TaskCardContent } from './types/TaskCardContent';
import { TableCardContent } from './types/TableCardContent';
import { MediaCardContent } from './types/MediaCardContent';
import { LinkCardContent } from './types/LinkCardContent';
import styles from './CardNode.module.css';
// ─────────────────────────────────────────────────────────────
// CARD NODE — Shell + CardFactory pattern
//
// This component owns:
//   - Position, size, selection ring
//   - Drag handle (via useCardDrag)
//   - Header (title + connect button)
//   - Footer (duplicate / delete)
//
// It delegates content rendering to the CardFactory switch.
// Adding a new card type = add one case in CardContent below.
// ─────────────────────────────────────────────────────────────
const CARD_ICONS = {
    note: '📝',
    task: '✅',
    table: '📊',
    media: '🖼️',
    link: '🔗',
};
// ── CardFactory — dispatches to the right content component ──
function CardContent({ card }) {
    switch (card.type) {
        case 'note': return _jsx(RichTextCard, { card: card });
        case 'task': return _jsx(TaskCardContent, { card: card });
        case 'table': return _jsx(TableCardContent, { card: card });
        case 'media': return _jsx(MediaCardContent, { card: card });
        case 'link': return _jsx(LinkCardContent, { card: card });
    }
}
export function CardNode({ card }) {
    const selectedIds = useSelectedIds();
    const connectFromId = useConnectFrom();
    const { updateCard, deleteCard, duplicateCard, addConnector, setConnectFrom, setActiveTool, } = useCanvasStore.getState();
    const { onMouseDown } = useCardDrag(card);
    const isSelected = selectedIds.has(card.id);
    const isConnectMode = connectFromId !== null;
    const isConnectSource = connectFromId === card.id;
    // Click while in connect mode → complete the connection
    const onCardClick = (e) => {
        if (!isConnectMode)
            return;
        e.stopPropagation();
        if (isConnectSource) {
            // Click source again → cancel
            setConnectFrom(null);
            setActiveTool('select');
            return;
        }
        addConnector(connectFromId, card.id);
        setConnectFrom(null);
        setActiveTool('select');
    };
    // Connector tool button in card header
    const onConnectBtnClick = (e) => {
        e.stopPropagation();
        setConnectFrom(card.id);
        setActiveTool('connect');
    };
    const classNames = [
        styles.card,
        styles[card.type],
        isSelected ? styles.selected : '',
        isConnectSource ? styles.connectSource : '',
        isConnectMode && !isConnectSource ? styles.connectTarget : '',
    ].filter(Boolean).join(' ');
    return (_jsxs("div", { className: classNames, "data-card": card.id, style: { left: card.x, top: card.y, width: card.width }, onMouseDown: onMouseDown, onClick: isConnectMode ? onCardClick : undefined, children: [_jsxs("div", { className: styles.header, children: [_jsx("span", { className: styles.icon, children: CARD_ICONS[card.type] }), _jsx("input", { className: styles.title, defaultValue: card.title, onChange: e => updateCard(card.id, { title: e.target.value }), onMouseDown: e => e.stopPropagation(), spellCheck: false }), _jsx("button", { className: styles.connectBtn, onClick: onConnectBtnClick, onMouseDown: e => e.stopPropagation(), title: "Connect to another card", children: "\u27F6" })] }), _jsx("div", { className: styles.body, children: _jsx(CardContent, { card: card }) }), _jsxs("div", { className: styles.footer, children: [_jsx("button", { className: styles.btn, onClick: e => { e.stopPropagation(); duplicateCard(card.id); }, children: "Duplicate" }), _jsx("button", { className: `${styles.btn} ${styles.btnDanger}`, onClick: e => { e.stopPropagation(); deleteCard(card.id); }, children: "Delete" })] })] }));
}
