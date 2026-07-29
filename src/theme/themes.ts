/**
 * Nuclear Nexus theme definitions for Nexinote.
 * Each theme is a set of CSS custom properties (--nx-*) applied
 * to document.documentElement by applyTheme().
 */

export type ThemeKey = 'cherenkov' | 'reactor' | 'meltdown' | 'isotope';

export interface NuclearTheme {
  key: ThemeKey;
  label: string;
  desc: string;
  vars: Record<string, string>;
}

export const THEMES: Record<ThemeKey, NuclearTheme> = {
  cherenkov: {
    key: 'cherenkov',
    label: 'Cherenkov',
    desc: 'Deep-water reactor blue — the glow of radiation in coolant pools',
    vars: {
      '--nx-bg': '#060b14',
      '--nx-bg-raised': '#0c1524',
      '--nx-bg-panel': '#101c30',
      '--nx-ink': '#dbe9ff',
      '--nx-ink-dim': '#7e93b8',
      '--nx-core': '#3ec6ff',
      '--nx-core-hot': '#8fe3ff',
      '--nx-core-soft': 'rgba(62,198,255,0.14)',
      '--nx-core-glow': 'rgba(62,198,255,0.45)',
      '--nx-hazard': '#ffb454',
      '--nx-danger': '#ff5470',
      '--nx-line': 'rgba(126,147,184,0.22)',
      '--nx-grid': 'rgba(62,198,255,0.05)',
    },
  },
  reactor: {
    key: 'reactor',
    label: 'Reactor Core',
    desc: 'Control-rod green on graphite black — classic geiger glow',
    vars: {
      '--nx-bg': '#0a0e0a',
      '--nx-bg-raised': '#111a12',
      '--nx-bg-panel': '#152217',
      '--nx-ink': '#e2f5e4',
      '--nx-ink-dim': '#83a189',
      '--nx-core': '#5dfc8d',
      '--nx-core-hot': '#b1ffc9',
      '--nx-core-soft': 'rgba(93,252,141,0.13)',
      '--nx-core-glow': 'rgba(93,252,141,0.4)',
      '--nx-hazard': '#ffe066',
      '--nx-danger': '#ff6b57',
      '--nx-line': 'rgba(131,161,137,0.22)',
      '--nx-grid': 'rgba(93,252,141,0.05)',
    },
  },
  meltdown: {
    key: 'meltdown',
    label: 'Meltdown',
    desc: 'Corium ember — heat bleeding through containment',
    vars: {
      '--nx-bg': '#120a08',
      '--nx-bg-raised': '#1d110d',
      '--nx-bg-panel': '#241612',
      '--nx-ink': '#ffe9dd',
      '--nx-ink-dim': '#b08d7d',
      '--nx-core': '#ff7a3d',
      '--nx-core-hot': '#ffb38a',
      '--nx-core-soft': 'rgba(255,122,61,0.14)',
      '--nx-core-glow': 'rgba(255,122,61,0.45)',
      '--nx-hazard': '#ffd23f',
      '--nx-danger': '#ff3d5a',
      '--nx-line': 'rgba(176,141,125,0.22)',
      '--nx-grid': 'rgba(255,122,61,0.05)',
    },
  },
  isotope: {
    key: 'isotope',
    label: 'Isotope Lab',
    desc: 'Clean-room light mode — uranium glass violet on white enamel',
    vars: {
      '--nx-bg': '#f2f3f7',
      '--nx-bg-raised': '#ffffff',
      '--nx-bg-panel': '#e9ebf2',
      '--nx-ink': '#1c2030',
      '--nx-ink-dim': '#6a7288',
      '--nx-core': '#7c4dff',
      '--nx-core-hot': '#5a2fe0',
      '--nx-core-soft': 'rgba(124,77,255,0.10)',
      '--nx-core-glow': 'rgba(124,77,255,0.30)',
      '--nx-hazard': '#e09a00',
      '--nx-danger': '#e0355c',
      '--nx-line': 'rgba(28,32,48,0.14)',
      '--nx-grid': 'rgba(124,77,255,0.05)',
    },
  },
};

export const THEME_LIST: NuclearTheme[] = Object.values(THEMES);
