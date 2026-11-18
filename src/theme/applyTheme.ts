import type { NuclearTheme } from './themes';

/**
 * Writes a theme's CSS variables onto <html>. Everything styled with
 * var(--nx-*) re-colors in place. The .nx-theme-transition class turns
 * on a global 0.6s color transition just for the swap, then removes
 * itself so drag/zoom interactions stay snappy.
 */
export function applyTheme(theme: NuclearTheme): void {
  const root = document.documentElement;
  root.classList.add('nx-theme-transition');
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
  root.dataset.nxTheme = theme.key;
  window.setTimeout(() => root.classList.remove('nx-theme-transition'), 650);
}
