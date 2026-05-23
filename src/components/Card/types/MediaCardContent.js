import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useCanvasStore } from '@/store';
import styles from './CardTypes.module.css';
export function MediaCardContent({ card }) {
    const updateCard = useCanvasStore(s => s.updateCard);
    const fileRef = useRef(null);
    const [urlInput, setUrlInput] = useState(card.content.src.startsWith('http') ? card.content.src : '');
    function setSrc(src) {
        updateCard(card.id, { content: { ...card.content, src } });
    }
    function toggleFit() {
        updateCard(card.id, {
            content: {
                ...card.content,
                fit: card.content.fit === 'cover' ? 'contain' : 'cover',
            },
        });
    }
    function onFileChange(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = ev => setSrc(ev.target?.result);
        reader.readAsDataURL(file);
    }
    function onUrlBlur() {
        const trimmed = urlInput.trim();
        if (trimmed)
            setSrc(trimmed);
    }
    const hasImage = !!card.content.src;
    return (_jsx("div", { className: styles.media, onMouseDown: e => e.stopPropagation(), children: hasImage ? (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.mediaImgWrap, children: _jsx("img", { src: card.content.src, alt: card.title, className: styles.mediaImg, style: { objectFit: card.content.fit } }) }), _jsxs("div", { className: styles.mediaControls, children: [_jsx("button", { className: styles.mediaBtn, onClick: toggleFit, title: "Toggle fit", children: card.content.fit === 'cover' ? 'Cover' : 'Contain' }), _jsx("button", { className: styles.mediaBtn, onClick: () => setSrc(''), title: "Remove image", children: "\u2715 Remove" })] })] })) : (_jsxs("div", { className: styles.mediaEmpty, children: [_jsxs("div", { className: styles.mediaUploadZone, onClick: () => fileRef.current?.click(), children: [_jsx("span", { className: styles.mediaUploadIcon, children: "\uD83D\uDDBC\uFE0F" }), _jsx("span", { children: "Click to upload" })] }), _jsx("div", { className: styles.mediaOr, children: "\u2014 or paste URL \u2014" }), _jsx("input", { className: styles.mediaUrlInput, placeholder: "https://\u2026", value: urlInput, onChange: e => setUrlInput(e.target.value), onBlur: onUrlBlur, onKeyDown: e => {
                        if (e.key === 'Enter')
                            onUrlBlur();
                        e.stopPropagation();
                    } }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", className: styles.mediaFileInput, onChange: onFileChange })] })) }));
}
