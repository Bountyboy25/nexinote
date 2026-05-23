import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCanvasStore } from '@/store';
import styles from './CardTypes.module.css';
export function LinkCardContent({ card }) {
    const updateCard = useCanvasStore(s => s.updateCard);
    const { url, description } = card.content;
    function setUrl(val) {
        updateCard(card.id, { content: { ...card.content, url: val } });
    }
    function setDesc(val) {
        updateCard(card.id, { content: { ...card.content, description: val } });
    }
    const isValid = url.startsWith('http');
    return (_jsxs("div", { className: styles.link, onMouseDown: e => e.stopPropagation(), children: [_jsx("div", { className: styles.linkIcon, children: "\uD83D\uDD17" }), _jsx("input", { className: styles.linkUrl, value: url, onChange: e => setUrl(e.target.value), onKeyDown: e => e.stopPropagation(), placeholder: "https://\u2026", spellCheck: false }), _jsx("textarea", { className: styles.linkDesc, value: description, onChange: e => setDesc(e.target.value), onKeyDown: e => e.stopPropagation(), placeholder: "Description (optional)", rows: 2 }), isValid && (_jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: styles.linkOpen, onMouseDown: e => e.stopPropagation(), children: "Open \u2197" }))] }));
}
