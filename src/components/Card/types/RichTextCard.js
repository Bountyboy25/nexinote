import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useCallback, useEffect } from 'react';
import { useCanvasStore } from '@/store';
import styles from './CardTypes.module.css';
function exec(cmd, value) {
    document.execCommand(cmd, false, value);
}
const TOOLBAR_ACTIONS = [
    { label: 'B', title: 'Bold (Ctrl+B)', cmd: 'bold' },
    { label: 'I', title: 'Italic (Ctrl+I)', cmd: 'italic' },
    { label: 'U', title: 'Underline', cmd: 'underline' },
    { label: 'H1', title: 'Heading 1', cmd: 'formatBlock', value: 'h2' },
    { label: 'H2', title: 'Heading 2', cmd: 'formatBlock', value: 'h3' },
    { label: '•', title: 'Bullet list', cmd: 'insertUnorderedList' },
    { label: '1.', title: 'Numbered list', cmd: 'insertOrderedList' },
];
export function RichTextCard({ card }) {
    const updateCard = useCanvasStore(s => s.updateCard);
    const editorRef = useRef(null);
    // Set initial HTML once on mount — after that the user owns the DOM
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML === '') {
            editorRef.current.innerHTML = card.content.html;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const save = useCallback(() => {
        if (editorRef.current) {
            updateCard(card.id, {
                content: { html: editorRef.current.innerHTML },
            });
        }
    }, [card.id, updateCard]);
    const applyFormat = useCallback((cmd, value) => {
        editorRef.current?.focus();
        exec(cmd, value);
        // Save after format so the store stays in sync
        setTimeout(save, 0);
    }, [save]);
    return (_jsxs("div", { className: styles.richText, children: [_jsx("div", { className: styles.richToolbar, onMouseDown: e => e.preventDefault(), children: TOOLBAR_ACTIONS.map(a => (_jsx("button", { className: styles.fmtBtn, title: a.title, onMouseDown: e => {
                        e.preventDefault();
                        applyFormat(a.cmd, a.value);
                    }, children: a.label }, a.label))) }), _jsx("div", { ref: editorRef, className: styles.richEditor, contentEditable: true, suppressContentEditableWarning: true, onBlur: save, onMouseDown: e => e.stopPropagation(), onKeyDown: e => e.stopPropagation(), "data-placeholder": "Start writing\u2026" })] }));
}
