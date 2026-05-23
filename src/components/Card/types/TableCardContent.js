import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/store';
import styles from './CardTypes.module.css';
// ── Formula evaluator ─────────────────────────────────────────
//
// Each `evaluateCell` call carries a recursion depth so circular
// references (e.g. A1 = "=A1") return NaN instead of looping forever.
const MAX_DEPTH = 32;
const REF_RE = /^([A-Za-z])(\d+)$/;
const RANGE_RE = /^([A-Za-z]\d+):([A-Za-z]\d+)$/;
const SUM_RE = /^SUM\(([A-Za-z]\d+:[A-Za-z]\d+)\)$/i;
const AVG_RE = /^AVG\(([A-Za-z]\d+:[A-Za-z]\d+)\)$/i;
const BINOP_RE = /^([A-Za-z]\d+|[\d.]+)\s*([+\-*/])\s*([A-Za-z]\d+|[\d.]+)$/;
function colIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}
function parseRef(ref, rows, depth) {
    const m = REF_RE.exec(ref);
    if (!m)
        return NaN;
    const c = colIndex(m[1]);
    const r = parseInt(m[2], 10) - 1;
    return evaluateCell(rows[r]?.[c] ?? '', rows, depth + 1);
}
function parseRange(ref, rows, depth) {
    const m = RANGE_RE.exec(ref);
    if (!m)
        return [];
    const sm = REF_RE.exec(m[1]);
    const em = REF_RE.exec(m[2]);
    const r1 = parseInt(sm[2], 10) - 1;
    const r2 = parseInt(em[2], 10) - 1;
    const c1 = colIndex(sm[1]);
    const c2 = colIndex(em[1]);
    const vals = [];
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            vals.push(evaluateCell(rows[r]?.[c] ?? '', rows, depth + 1));
        }
    }
    return vals;
}
function evaluateCell(raw, rows, depth = 0) {
    if (depth > MAX_DEPTH)
        return NaN; // circular reference guard
    if (!raw.startsWith('='))
        return parseFloat(raw) || 0;
    const expr = raw.slice(1).trim();
    const sumM = SUM_RE.exec(expr);
    if (sumM)
        return parseRange(sumM[1], rows, depth).reduce((a, b) => a + b, 0);
    const avgM = AVG_RE.exec(expr);
    if (avgM) {
        const vals = parseRange(avgM[1], rows, depth);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    // Simple binary op: =A1+B2, =A1*3, etc.
    const opM = BINOP_RE.exec(expr);
    if (opM) {
        const left = /^[A-Za-z]/.test(opM[1]) ? parseRef(opM[1], rows, depth) : parseFloat(opM[1]);
        const right = /^[A-Za-z]/.test(opM[3]) ? parseRef(opM[3], rows, depth) : parseFloat(opM[3]);
        switch (opM[2]) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return right !== 0 ? left / right : NaN;
        }
    }
    return NaN;
}
function displayValue(raw, rows) {
    if (!raw.startsWith('='))
        return raw;
    const result = evaluateCell(raw, rows);
    return Number.isNaN(result) ? '#ERR' : String(+result.toFixed(6));
}
// ── Component ─────────────────────────────────────────────────
export function TableCardContent({ card }) {
    const updateCard = useCanvasStore(s => s.updateCard);
    const rows = card.content.rows;
    // Pre-compute display strings for any formula cells once per render
    // instead of calling displayValue 2–3× per cell inline (it's recursive
    // and calls itself across the whole grid for every reference).
    const displayed = useMemo(() => {
        return rows.map(row => row.map(cell => (cell.startsWith('=') ? displayValue(cell, rows) : cell)));
    }, [rows]);
    const setCell = useCallback((r, c, value) => {
        const next = rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row);
        updateCard(card.id, { content: { rows: next } });
    }, [card.id, rows, updateCard]);
    const addRow = () => {
        const cols = rows[0]?.length ?? 3;
        updateCard(card.id, { content: { rows: [...rows, Array(cols).fill('')] } });
    };
    const addCol = () => {
        updateCard(card.id, { content: { rows: rows.map(r => [...r, '']) } });
    };
    return (_jsxs("div", { className: styles.table, onMouseDown: e => e.stopPropagation(), children: [_jsx("div", { className: styles.tableScroll, children: _jsxs("table", { className: styles.tableEl, children: [_jsx("thead", { children: _jsx("tr", { children: rows[0]?.map((_, ci) => (_jsx("th", { className: styles.colHeader, children: String.fromCharCode(65 + ci) }, ci))) }) }), _jsx("tbody", { children: rows.map((row, ri) => (_jsx("tr", { children: row.map((cell, ci) => {
                                    const isFormula = cell.startsWith('=');
                                    const result = isFormula ? displayed[ri][ci] : '';
                                    return (_jsxs("td", { className: styles.cell, children: [_jsx("input", { className: styles.cellInput, value: cell, title: isFormula ? result : undefined, placeholder: isFormula ? result : '', onChange: e => setCell(ri, ci, e.target.value), onKeyDown: e => e.stopPropagation() }), isFormula && _jsx("span", { className: styles.cellResult, children: result })] }, ci));
                                }) }, ri))) })] }) }), _jsxs("div", { className: styles.tableActions, children: [_jsx("button", { className: styles.tableBtn, onClick: addRow, children: "+ Row" }), _jsx("button", { className: styles.tableBtn, onClick: addCol, children: "+ Col" })] })] }));
}
