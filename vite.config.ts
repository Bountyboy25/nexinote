import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Single source of truth for the version. Feedback rows are stamped with
// it, so a hardcoded copy in the app would quietly start reporting the
// wrong build the first time package.json was bumped.
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// Where the app will be served from. GitHub Pages puts a project site at
// /<repo>/, not the domain root, and a service worker can only control
// URLs at or below its own path — so this has to be right or an installed
// copy silently fails to find its own assets.
//
// Set BASE_PATH=/nexinote/ for a Pages build; anything served from a
// domain root (Netlify, Cloudflare Pages, a custom domain) needs nothing.
const base = process.env.BASE_PATH ?? '/'

// ─────────────────────────────────────────────────────────────
// The `@` alias is declared HERE and in tsconfig.json — changing one
// requires changing the other.
//
// PWA: the app is already a zero-backend, localStorage-only SPA, so
// making it installable is mostly a matter of declaring it. Workbox
// precaches the built assets, which means it launches and runs with no
// network at all; only OpenStreetMap tiles (map cards) need one.
// ─────────────────────────────────────────────────────────────

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nexinote',
        short_name: 'Nexinote',
        description:
          'A Milanote-style infinite canvas for visual note-taking — boards, cards, sketches and connectors, saved locally in your browser.',
        // Launches in its own window with no browser chrome, so an
        // installed copy reads as an application rather than a tab.
        display: 'standalone',
        orientation: 'any',
        // Must track `base`: an installed app launches start_url directly,
        // and a scope that doesn't cover the app's own URLs stops the
        // service worker from controlling it.
        start_url: base,
        scope: base,
        // Matches --nx-bg / --nx-core from the default Cherenkov theme,
        // so the splash screen and title bar don't flash a foreign color
        // before the app paints.
        background_color: '#060b14',
        theme_color: '#3ec6ff',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            // Android crops this one to whatever shape the launcher
            // uses, so it is drawn full-bleed with the art inset.
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Board data lives in localStorage, so there is nothing to sync
        // — precaching the shell is the whole offline story.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // The Leaflet chunk is ~154KB and split out on purpose; leaving
        // it above the default limit would silently drop it from the
        // precache and break map cards offline-first.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: base + 'index.html',
        runtimeCaching: [
          {
            // Map tiles: show what has already been seen when offline,
            // but always prefer a fresh tile when the network is there.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Keep the service worker out of `npm run dev` — a stale
        // precache during development is a confusing way to lose an edit.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
