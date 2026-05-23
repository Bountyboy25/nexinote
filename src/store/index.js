import { create } from 'zustand';
import { nanoid } from 'nanoid';
// ─────────────────────────────────────────────────────────────
// STORE — Phase 2: discriminated union cards + connectors
// ─────────────────────────────────────────────────────────────
const CARD_WIDTH = 280;
// Factory — creates a fully-typed card for each variant
function createCard(type, x, y) {
    const base = {
        id: nanoid(),
        x, y,
        width: CARD_WIDTH,
        createdAt: Date.now(),
    };
    switch (type) {
        case 'note':
            return {
                ...base, type: 'note', title: 'Note',
                content: { html: '<p>Start writing…</p>' },
            };
        case 'task':
            return {
                ...base, type: 'task', title: 'Tasks',
                content: {
                    items: [
                        { id: nanoid(), text: 'First task', done: false },
                        { id: nanoid(), text: 'Second task', done: false },
                    ],
                },
            };
        case 'table':
            return {
                ...base, type: 'table', title: 'Table',
                content: {
                    rows: [
                        ['', '', ''],
                        ['', '', ''],
                        ['', '', ''],
                    ],
                },
            };
        case 'media':
            return {
                ...base, type: 'media', title: 'Image',
                content: { src: '', fit: 'cover' },
            };
        case 'link':
            return {
                ...base, type: 'link', title: 'Link',
                content: { url: 'https://', description: '' },
            };
    }
}
export const useCanvasStore = create((set, get) => ({
    // ── INITIAL STATE ──────────────────────────────────────────
    cards: [],
    connectors: [],
    camera: { x: 0, y: 52, zoom: 1 },
    selectedIds: new Set(),
    activeTool: 'select',
    connectFromId: null,
    // ── CARD ACTIONS ───────────────────────────────────────────
    addCard: (type, x, y) => {
        const card = createCard(type, x, y);
        set(state => ({ cards: [...state.cards, card] }));
        return card;
    },
    updateCard: (id, patch) => {
        set(state => ({
            cards: state.cards.map(card => card.id === id ? { ...card, ...patch } : card),
        }));
    },
    deleteCard: (id) => {
        set(state => ({
            cards: state.cards.filter(c => c.id !== id),
            // Remove any connectors touching the deleted card
            connectors: state.connectors.filter(c => c.fromId !== id && c.toId !== id),
            selectedIds: new Set([...state.selectedIds].filter(sid => sid !== id)),
        }));
    },
    deleteSelected: () => {
        const { selectedIds } = get();
        set(state => ({
            cards: state.cards.filter(c => !selectedIds.has(c.id)),
            connectors: state.connectors.filter(c => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)),
            selectedIds: new Set(),
        }));
    },
    duplicateCard: (id) => {
        const original = get().cards.find(c => c.id === id);
        if (!original)
            return;
        // Deep-clone the content so the duplicate is independent
        const dup = {
            ...original,
            content: JSON.parse(JSON.stringify(original.content)),
            id: nanoid(),
            x: original.x + 24,
            y: original.y + 24,
            createdAt: Date.now(),
        };
        set(state => ({ cards: [...state.cards, dup] }));
    },
    clearBoard: () => {
        set({ cards: [], connectors: [], selectedIds: new Set() });
    },
    // ── CONNECTOR ACTIONS ──────────────────────────────────────
    addConnector: (fromId, toId) => {
        // Prevent self-loops and duplicate connectors
        if (fromId === toId)
            return;
        const { connectors } = get();
        if (connectors.some(c => c.fromId === fromId && c.toId === toId))
            return;
        set(state => ({
            connectors: [...state.connectors, { id: nanoid(), fromId, toId }],
        }));
    },
    deleteConnector: (id) => {
        set(state => ({
            connectors: state.connectors.filter(c => c.id !== id),
        }));
    },
    setConnectFrom: (id) => {
        set({ connectFromId: id });
    },
    // ── SELECTION ACTIONS ──────────────────────────────────────
    selectCard: (id, additive = false) => {
        set(state => ({
            selectedIds: additive
                ? new Set([...state.selectedIds, id])
                : new Set([id]),
        }));
    },
    deselectAll: () => set({ selectedIds: new Set() }),
    selectAll: () => set(state => ({ selectedIds: new Set(state.cards.map(c => c.id)) })),
    // ── CAMERA ACTIONS ─────────────────────────────────────────
    setCamera: (patch) => set(state => ({ camera: { ...state.camera, ...patch } })),
    resetView: () => set({ camera: { x: 0, y: 52, zoom: 1 } }),
    zoomTo: (newZoom, originX, originY) => {
        const { camera } = get();
        const clampedZoom = Math.min(4, Math.max(0.1, newZoom));
        const worldX = (originX - camera.x) / camera.zoom;
        const worldY = (originY - camera.y) / camera.zoom;
        set({ camera: { x: originX - worldX * clampedZoom, y: originY - worldY * clampedZoom, zoom: clampedZoom } });
    },
    // ── TOOL ACTIONS ───────────────────────────────────────────
    setActiveTool: (tool) => set({ activeTool: tool }),
}));
// ── SELECTOR HOOKS ────────────────────────────────────────────
export const useCards = () => useCanvasStore(s => s.cards);
export const useCamera = () => useCanvasStore(s => s.camera);
export const useSelectedIds = () => useCanvasStore(s => s.selectedIds);
export const useActiveTool = () => useCanvasStore(s => s.activeTool);
export const useConnectors = () => useCanvasStore(s => s.connectors);
export const useConnectFrom = () => useCanvasStore(s => s.connectFromId);
// Zustand action references are stable for the lifetime of the store, so
// we hoist them into a frozen object instead of returning a fresh literal
// from a selector on every render. The previous implementation looked
// reasonable but caused EVERY consumer to re-render on every state change
// (because the returned object identity differed each call).
const _state = useCanvasStore.getState();
const _actions = Object.freeze({
    addCard: _state.addCard,
    updateCard: _state.updateCard,
    deleteCard: _state.deleteCard,
    deleteSelected: _state.deleteSelected,
    duplicateCard: _state.duplicateCard,
    clearBoard: _state.clearBoard,
    addConnector: _state.addConnector,
    deleteConnector: _state.deleteConnector,
    setConnectFrom: _state.setConnectFrom,
    selectCard: _state.selectCard,
    deselectAll: _state.deselectAll,
    selectAll: _state.selectAll,
    setCamera: _state.setCamera,
    resetView: _state.resetView,
    zoomTo: _state.zoomTo,
    setActiveTool: _state.setActiveTool,
});
export const useCanvasActions = () => _actions;
