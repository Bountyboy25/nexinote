import { useCanvasStore, useSettings } from '@/store'
import styles from './SettingsPanel.module.css'

// ─────────────────────────────────────────────────────────────
// SETTINGS PANEL — Modal overlay with app-wide settings
//
// Current settings:
//   • Animate Arrows — toggles the wave animation on connectors
// Settings are persisted to localStorage via the store.
// ─────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const settings = useSettings()
  const { updateSettings } = useCanvasStore.getState()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Animate Arrows */}
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <div className={styles.rowLabel}>Animate Arrows</div>
              <div className={styles.rowDesc}>
                Flowing wave animation on connector lines. When off, arrows are static.
              </div>
            </div>
            <button
              className={`${styles.toggle} ${settings.animateArrows ? styles.toggleOn : ''}`}
              onClick={() => updateSettings({ animateArrows: !settings.animateArrows })}
              aria-label="Toggle arrow animation"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>Settings are saved automatically</span>
        </div>
      </div>
    </div>
  )
}
