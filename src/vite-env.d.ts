/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Build-time configuration. Set these in a local `.env` file (see
// .env.example) — Vite inlines anything prefixed VITE_ into the bundle,
// so only put values here that are safe to ship publicly.
interface ImportMetaEnv {
  /**
   * Google Apps Script web-app URL that receives feedback submissions and
   * appends them to a spreadsheet. See feedback/README.md for setup.
   * When unset, the feedback form still works but falls back to letting
   * the user copy their message out instead of sending it.
   */
  readonly VITE_FEEDBACK_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** package.json version, injected by vite.config.ts `define`. */
declare const __APP_VERSION__: string
