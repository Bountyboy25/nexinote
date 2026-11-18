import { THEME_LIST } from '../theme/themes';
import { useThemeStore } from '../store/useThemeStore';
import styles from './ThemeSwitcher.module.css';

/**
 * Four-core theme picker. Drop into your settings modal or board menu.
 * Reads/writes the persisted theme slice, so choice survives reloads.
 */
export function ThemeSwitcher() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className={styles.row} role="radiogroup" aria-label="Color theme">
      {THEME_LIST.map((t) => (
        <button
          key={t.key}
          role="radio"
          aria-checked={themeKey === t.key}
          title={t.desc}
          className={`${styles.chip} ${themeKey === t.key ? styles.active : ''}`}
          onClick={() => setTheme(t.key)}
        >
          <span
            className={styles.swatch}
            style={{ background: t.vars['--nx-core'], boxShadow: `0 0 8px ${t.vars['--nx-core']}` }}
          />
          {t.label}
        </button>
      ))}
    </div>
  );
}
