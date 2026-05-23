import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useCanvasStore } from '@/store';
import styles from './CardTypes.module.css';
export function TaskCardContent({ card }) {
    const updateCard = useCanvasStore(s => s.updateCard);
    const [newText, setNewText] = useState('');
    const newInputRef = useRef(null);
    const items = card.content.items;
    const done = items.filter(i => i.done).length;
    const total = items.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    function save(nextItems) {
        updateCard(card.id, { content: { items: nextItems } });
    }
    function toggle(id) {
        save(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
    }
    function editText(id, text) {
        save(items.map(i => i.id === id ? { ...i, text } : i));
    }
    function remove(id) {
        save(items.filter(i => i.id !== id));
    }
    function addItem() {
        const text = newText.trim();
        if (!text)
            return;
        save([...items, { id: nanoid(), text, done: false }]);
        setNewText('');
        newInputRef.current?.focus();
    }
    return (_jsxs("div", { className: styles.task, onMouseDown: e => e.stopPropagation(), children: [total > 0 && (_jsxs("div", { className: styles.progressWrap, children: [_jsx("div", { className: styles.progressBar, style: { width: `${pct}%` } }), _jsxs("span", { className: styles.progressLabel, children: [done, "/", total] })] })), _jsx("ul", { className: styles.checklist, children: items.map(item => (_jsxs("li", { className: `${styles.checkItem} ${item.done ? styles.checkDone : ''}`, children: [_jsx("input", { type: "checkbox", checked: item.done, onChange: () => toggle(item.id), className: styles.checkbox }), _jsx("input", { className: styles.checkText, value: item.text, onChange: e => editText(item.id, e.target.value), onKeyDown: e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    newInputRef.current?.focus();
                                }
                                if (e.key === 'Backspace' && item.text === '') {
                                    e.preventDefault();
                                    remove(item.id);
                                }
                                e.stopPropagation();
                            } }), _jsx("button", { className: styles.checkRemove, onClick: () => remove(item.id), title: "Remove", children: "\u00D7" })] }, item.id))) }), _jsxs("div", { className: styles.addRow, children: [_jsx("input", { ref: newInputRef, className: styles.addInput, placeholder: "Add item\u2026", value: newText, onChange: e => setNewText(e.target.value), onKeyDown: e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addItem();
                            }
                            e.stopPropagation();
                        } }), _jsx("button", { className: styles.addBtn, onClick: addItem, title: "Add item", children: "+" })] })] }));
}
