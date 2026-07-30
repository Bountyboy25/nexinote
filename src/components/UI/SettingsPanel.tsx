import { useState } from 'react'
import { useCanvasStore, useSettings, useCards, useConnectors } from '@/store'
import { usePwa } from '@/hooks/usePwa'
import { FeedbackPanel } from './FeedbackPanel'
import { APP_VERSION } from '@/utils/feedback'
import { ThemeSwitcher } from '@/UI/ThemeSwitcher'
import { ReactorGauge } from '@/UI/ReactorGauge'
import { Toggle } from '@/UI/Toggle'
import { useThemeStore } from '@/store/useThemeStore'
import { THEMES } from '@/theme/themes'
import styles from './SettingsPanel.module.css'

// ─────────────────────────────────────────────────────────────
// SETTINGS PANEL — Modal overlay with app-wide settings
//
// Current sections:
//   • Reactor status — Nuclear Nexus gauge fed by real board load
//   • Theme Core     — 4-core Nuclear Nexus theme picker
//   • Animate Arrows — toggles the wave animation on connectors
//   • Templates      — only when a board is open (see onOpenTemplates)
// Settings are persisted to localStorage via the store.
// ─────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  /**
   * Opens the templates modal. Omitted from the boards gallery, where
   * there is no active board for a template to be applied to.
   */
  onOpenTemplates?: () => void
}

export function SettingsPanel({ onClose, onOpenTemplates }: Props) {
  const [showFeedback, setShowFeedback] = useState(false)
  const { canInstall, installed, offlineReady, updateReady, install, update } = usePwa()
  const settings = useSettings()
  const cards = useCards()
  const connectors = useConnectors()
  const themeKey = useThemeStore(s => s.themeKey)
  const { updateSettings } = useCanvasStore.getState()

  const theme = THEMES[themeKey]

  // "Reactor output" = how loaded the current board is.
  // Cards weigh more than connectors; clamped so the core never idles at 0.
  const output = Math.max(6, Math.min(98, cards.length * 4 + connectors.length * 2))
  const status = output >= 85 ? 'critical' : output >= 60 ? 'caution' : 'stable'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Reactor status — board load on the active core */}
          <ReactorGauge
            value={output}
            title={`${theme.label} core online`}
            subtitle={`${theme.desc}. ${cards.length} card${cards.length === 1 ? '' : 's'} · ${connectors.length} connector${connectors.length === 1 ? '' : 's'} drawing from this palette.`}
            status={status}
            statusLabel={status}
          />

          {/* Theme core */}
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <div className={styles.rowLabel}>Theme Core</div>
              <div className={styles.rowDesc}>
                Nuclear Nexus color core. Re-colors the whole app in one pass.
              </div>
            </div>
          </div>
          <ThemeSwitcher />

          {/* Animate Arrows */}
          <Toggle
            checked={settings.animateArrows}
            onChange={next => updateSettings({ animateArrows: next })}
            label="Animate Arrows"
            description="Flowing wave animation on connector lines. When off, arrows are static."
          />

          {/* Templates — board-scoped, so hidden in the gallery */}
          {onOpenTemplates && (
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowLabel}>Templates</div>
                <div className={styles.rowDesc}>
                  Start this board from a preset layout. New boards are offered
                  one automatically; use this to re-template an existing board.
                  {cards.length > 0 && ' Applying one erases what is here now.'}
                </div>
              </div>
              <button className={styles.rowAction} onClick={onOpenTemplates}>
                Browse
              </button>
            </div>
          )}

          {/* ── Feedback ── */}
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <div className={styles.rowLabel}>Send feedback</div>
              <div className={styles.rowDesc}>
                Report a bug, suggest an idea, or say what felt confusing.
                Nothing you wrote on a board is ever included.
              </div>
            </div>
            <button className={styles.rowAction} onClick={() => setShowFeedback(true)}>
              Feedback
            </button>
          </div>

          {/* ── Install ──
              Only offered when the browser actually has a prompt to show.
              Firefox and desktop Safari don't, so a permanently dead
              "Install" button would be worse than none. */}
          {canInstall && (
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowLabel}>Install Nexinote</div>
                <div className={styles.rowDesc}>
                  Adds it to your machine as a standalone app with its own window
                  and icon. Works fully offline — your boards already live on this
                  device.
                </div>
              </div>
              <button className={styles.rowAction} onClick={install}>
                Install
              </button>
            </div>
          )}

          {/* ── Update ──
              registerType is 'prompt', not 'autoUpdate': swapping the
              running code under someone mid-sentence risks losing an
              unsaved editor that hasn't blurred yet. */}
          {updateReady && (
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowLabel}>Update available</div>
                <div className={styles.rowDesc}>
                  A newer version is downloaded and ready. Reloading now is safe —
                  your boards are stored on this device, not in the app bundle.
                </div>
              </div>
              <button className={styles.rowAction} onClick={update}>
                Reload
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>Settings are saved automatically</span>
          <span className={styles.footerNote}>
            v{APP_VERSION}
            {installed && ' · installed'}
            {offlineReady && ' · offline ready'}
          </span>
        </div>
      </div>

      {showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}
    </div>
  )
}
