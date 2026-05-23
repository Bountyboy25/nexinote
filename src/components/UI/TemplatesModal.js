import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { nanoid } from 'nanoid';
import { useCanvasStore } from '@/store';
import { fitCameraToCards } from '@/utils/canvas';
import styles from './TemplatesModal.module.css';
const TEMPLATES = [
    {
        id: 'blank',
        name: 'Blank Board',
        emoji: '⬜',
        desc: 'Start fresh with an empty canvas.',
        cards: () => [],
    },
    {
        id: 'project',
        name: 'Project Plan',
        emoji: '🗂️',
        desc: 'Backlog, in-progress, and done columns.',
        cards: () => [
            { id: nanoid(), type: 'note', x: 60, y: 80, width: 240, title: 'Project Goal', createdAt: Date.now(), content: { html: '<p>Define your project objective here.</p>' } },
            { id: nanoid(), type: 'task', x: 60, y: 260, width: 240, title: 'Backlog', createdAt: Date.now(), content: { items: [
                        { id: nanoid(), text: 'Research', done: false },
                        { id: nanoid(), text: 'Design', done: false },
                        { id: nanoid(), text: 'Build', done: false },
                    ] } },
            { id: nanoid(), type: 'task', x: 340, y: 260, width: 240, title: 'In Progress', createdAt: Date.now(), content: { items: [
                        { id: nanoid(), text: 'Setup repo', done: false },
                    ] } },
            { id: nanoid(), type: 'task', x: 620, y: 260, width: 240, title: 'Done', createdAt: Date.now(), content: { items: [
                        { id: nanoid(), text: 'Project kick-off', done: true },
                    ] } },
            { id: nanoid(), type: 'note', x: 340, y: 80, width: 520, title: 'Timeline', createdAt: Date.now(), content: { html: '<p><strong>Week 1:</strong> Research &amp; planning<br><strong>Week 2:</strong> Design &amp; prototyping<br><strong>Week 3–4:</strong> Build &amp; test</p>' } },
        ],
    },
    {
        id: 'brainstorm',
        name: 'Brainstorm',
        emoji: '🧠',
        desc: 'Central idea surrounded by branches.',
        cards: () => [
            { id: nanoid(), type: 'note', x: 280, y: 200, width: 200, title: 'Central Idea', createdAt: Date.now(), content: { html: '<p>Your big idea goes here</p>' } },
            { id: nanoid(), type: 'note', x: 60, y: 60, width: 200, title: 'Branch 1', createdAt: Date.now(), content: { html: '<p>First angle or theme</p>' } },
            { id: nanoid(), type: 'note', x: 540, y: 60, width: 200, title: 'Branch 2', createdAt: Date.now(), content: { html: '<p>Second angle or theme</p>' } },
            { id: nanoid(), type: 'note', x: 60, y: 360, width: 200, title: 'Branch 3', createdAt: Date.now(), content: { html: '<p>Third angle or theme</p>' } },
            { id: nanoid(), type: 'note', x: 540, y: 360, width: 200, title: 'Branch 4', createdAt: Date.now(), content: { html: '<p>Fourth angle or theme</p>' } },
            { id: nanoid(), type: 'note', x: 280, y: 420, width: 200, title: 'Next Steps', createdAt: Date.now(), content: { html: '<ul><li>Action 1</li><li>Action 2</li></ul>' } },
        ],
    },
    {
        id: 'moodboard',
        name: 'Mood Board',
        emoji: '🎨',
        desc: 'Visual inspiration with image placeholders.',
        cards: () => [
            { id: nanoid(), type: 'note', x: 60, y: 60, width: 260, title: 'Theme', createdAt: Date.now(), content: { html: '<p>Describe the mood, palette, and aesthetic you\'re going for.</p>' } },
            { id: nanoid(), type: 'media', x: 360, y: 60, width: 200, title: 'Image 1', createdAt: Date.now(), content: { src: '', fit: 'cover' } },
            { id: nanoid(), type: 'media', x: 600, y: 60, width: 200, title: 'Image 2', createdAt: Date.now(), content: { src: '', fit: 'cover' } },
            { id: nanoid(), type: 'media', x: 360, y: 280, width: 200, title: 'Image 3', createdAt: Date.now(), content: { src: '', fit: 'cover' } },
            { id: nanoid(), type: 'note', x: 60, y: 280, width: 260, title: 'Color Palette', createdAt: Date.now(), content: { html: '<p>Primary: #<br>Secondary: #<br>Accent: #<br>Background: #</p>' } },
            { id: nanoid(), type: 'link', x: 600, y: 280, width: 200, title: 'Inspiration', createdAt: Date.now(), content: { url: 'https://', description: 'Reference link' } },
        ],
    },
    {
        id: 'meeting',
        name: 'Meeting Notes',
        emoji: '📋',
        desc: 'Agenda, notes, and action items.',
        cards: () => [
            { id: nanoid(), type: 'note', x: 60, y: 60, width: 280, title: 'Meeting Info', createdAt: Date.now(), content: { html: '<p><strong>Date:</strong> <br><strong>Attendees:</strong> <br><strong>Goal:</strong> </p>' } },
            { id: nanoid(), type: 'task', x: 60, y: 260, width: 280, title: 'Agenda', createdAt: Date.now(), content: { items: [
                        { id: nanoid(), text: 'Introductions', done: false },
                        { id: nanoid(), text: 'Review last week', done: false },
                        { id: nanoid(), text: 'This week\'s plan', done: false },
                        { id: nanoid(), text: 'Open questions', done: false },
                    ] } },
            { id: nanoid(), type: 'note', x: 380, y: 60, width: 280, title: 'Notes', createdAt: Date.now(), content: { html: '<p>Key discussion points…</p>' } },
            { id: nanoid(), type: 'task', x: 380, y: 260, width: 280, title: 'Action Items', createdAt: Date.now(), content: { items: [
                        { id: nanoid(), text: 'Owner: Task description', done: false },
                    ] } },
        ],
    },
];
// ── Component ──────────────────────────────────────────────────
export function TemplatesModal({ onClose }) {
    const { clearBoard, setCamera, resetView } = useCanvasStore.getState();
    function applyTemplate(templateCards) {
        if (templateCards.length === 0) {
            clearBoard();
            resetView();
            onClose();
            return;
        }
        // Replace the board's cards in a SINGLE store update — the previous
        // implementation called setState once per card, which triggered an
        // O(N) cascade of re-renders.
        useCanvasStore.setState({
            cards: templateCards,
            connectors: [],
            selectedIds: new Set(),
        });
        // Fit camera to new cards
        setCamera(fitCameraToCards(templateCards, window.innerWidth, window.innerHeight - 52));
        onClose();
    }
    // Backdrop click closes modal
    const onBackdropClick = (e) => {
        if (e.target === e.currentTarget)
            onClose();
    };
    return (_jsx("div", { className: styles.backdrop, onClick: onBackdropClick, children: _jsxs("div", { className: styles.modal, children: [_jsxs("div", { className: styles.header, children: [_jsx("h2", { className: styles.title, children: "Choose a template" }), _jsx("button", { className: styles.closeBtn, onClick: onClose, children: "\u2715" })] }), _jsx("div", { className: styles.grid, children: TEMPLATES.map(t => (_jsxs("button", { className: styles.card, onClick: () => applyTemplate(t.cards()), children: [_jsx("span", { className: styles.emoji, children: t.emoji }), _jsx("span", { className: styles.name, children: t.name }), _jsx("span", { className: styles.desc, children: t.desc })] }, t.id))) })] }) }));
}
