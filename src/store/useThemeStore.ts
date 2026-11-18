import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES, type ThemeKey } from '../theme/themes';
import { applyTheme } from '../theme/applyTheme';

interface ThemeState {
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

/**
 * Standalone theme slice, persisted to localStorage under
 * "nexinote-theme". Follows the same subscribe-to-slices pattern
 * as the main canvas store:
 *
 *   const themeKey = useThemeStore((s) => s.themeKey);
 *   const setTheme = useThemeStore((s) => s.setTheme);
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeKey: 'cherenkov',
      setTheme: (key) => {
        applyTheme(THEMES[key]);
        set({ themeKey: key });
      },
    }),
    { name: 'nexinote-theme' },
  ),
);

/** Call once in main.tsx before render so CSS vars exist on first paint. */
export function initTheme(): void {
  applyTheme(THEMES[useThemeStore.getState().themeKey]);
}
