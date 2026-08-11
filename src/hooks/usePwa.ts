import { useCallback, useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK: usePwa
//
// Two separate concerns, both about the installed-app experience:
//
//   canInstall / install()  — the browser's own install prompt. It can
//     only be shown from a user gesture, and only once per captured
//     `beforeinstallprompt` event, so the event is stashed and replayed
//     when the user actually clicks something.
//
//   updateReady / update()  — a new build has been precached. The app is
//     registered with registerType: 'prompt' rather than autoUpdate on
//     purpose: this is a note-taking canvas, and silently swapping the
//     running code under someone mid-sentence risks losing an unsaved
//     contentEditable that has not blurred yet. The user picks the moment.
// ─────────────────────────────────────────────────────────────

// Not in the DOM lib — Chromium-only, and still the only way in.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwa() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)

  // ── Install prompt plumbing ──
  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Chrome shows its own mini-infobar unless the event is cancelled;
      // suppressing it keeps the invitation inside Settings where it has
      // context, instead of a bar over the canvas.
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // Already running as an installed app? Then there is nothing to offer.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari's non-standard flag
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) setInstalled(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // ── Service worker registration ──
  useEffect(() => {
    // registerSW is a no-op in dev (devOptions.enabled === false), so this
    // is safe to call unconditionally.
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdateReady(true)
        setApplyUpdate(() => () => updateSW(true))
      },
      onOfflineReady() {
        setOfflineReady(true)
      },
    })
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return 'unavailable' as const
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    // The captured event is single-use; drop it either way so the button
    // can't be clicked into a no-op.
    setPromptEvent(null)
    return outcome
  }, [promptEvent])

  const update = useCallback(() => {
    applyUpdate?.()
  }, [applyUpdate])

  return {
    /** A browser install prompt is available right now. */
    canInstall: promptEvent !== null && !installed,
    /** Running as an installed app, or install already completed. */
    installed,
    /** The shell is precached — the app will now open with no network. */
    offlineReady,
    updateReady,
    install,
    update,
  }
}
