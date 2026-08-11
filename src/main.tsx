import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// Leaflet's own stylesheet — required for map cards to lay out their
// tiles and controls. Loaded globally so every map card shares it.
import './styles/nuclear-base.css'
import './styles/global.css'
import { initTheme } from './store/useThemeStore'

// Hydrate the persisted Nuclear Nexus theme onto <html> before first paint
initTheme()

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

const rootEl = document.getElementById('root')!

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
