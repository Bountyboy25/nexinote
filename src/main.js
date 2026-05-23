import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
// ─────────────────────────────────────────────────────────────
// ENTRY POINT — The very first file that runs
//
// createRoot() targets the <div id="root"> in index.html
// and mounts our entire React component tree into it.
//
// StrictMode is a development tool that:
//   - Double-invokes renders to catch side effects
//   - Warns about deprecated APIs
//   - Has ZERO effect in production builds
// ─────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
createRoot(rootEl).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
