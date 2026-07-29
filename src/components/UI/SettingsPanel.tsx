import { useCanvasStore, useSettings, useCards, useConnectors } from '@/store'
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
// Settings are persisted to localStorage via the store.
// ─────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
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
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>Settings are saved automatically</span>
        </div>
      </div>
    </div>
  )
}
