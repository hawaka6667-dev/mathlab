/**
 * MathLab Theme & Skin Engine
 * Defaults to 'dark' (Night Mode) with persistent storage and Canvas palette dispatch.
 */

export const THEMES = {
  dark: {
    id: "dark",
    name: { zh: "深邃暗夜 (默认)", en: "Deep Dark (Default)", "zh-en": "Deep Dark 暗夜 (默认)" },
    canvas: {
      grid: "rgba(255, 255, 255, 0.05)",
      axes: "rgba(255, 255, 255, 0.35)",
      ticks: "#64748b",
      colors: ['#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#f43f5e', '#6366f1'],
      compColors: ['#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6']
    }
  },
  oled: {
    id: "oled",
    name: { zh: "极致纯黑 (OLED)", en: "Pitch Black (OLED)", "zh-en": "Pitch OLED 纯黑" },
    canvas: {
      grid: "rgba(255, 255, 255, 0.08)",
      axes: "rgba(255, 255, 255, 0.50)",
      ticks: "#94a3b8",
      colors: ['#00f0ff', '#00ff88', '#d000ff', '#ffb700', '#ff0055', '#7b00ff'],
      compColors: ['#d000ff', '#00ff88', '#ffb700', '#ff0055', '#ff00aa', '#00e5ff']
    }
  },
  academic: {
    id: "academic",
    name: { zh: "学术纸白 (Light)", en: "Academic Paper (Light)", "zh-en": "Academic 纸白 (Light)" },
    canvas: {
      grid: "rgba(0, 0, 0, 0.06)",
      axes: "rgba(0, 0, 0, 0.45)",
      ticks: "#475569",
      colors: ['#0284c7', '#059669', '#7c3aed', '#d97706', '#dc2626', '#4f46e5'],
      compColors: ['#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0d9488']
    }
  },
  solarized: {
    id: "solarized",
    name: { zh: "科研深青 (Solarized)", en: "Solarized Dark", "zh-en": "Solarized 深青" },
    canvas: {
      grid: "rgba(147, 161, 161, 0.08)",
      axes: "rgba(147, 161, 161, 0.38)",
      ticks: "#839496",
      colors: ['#2aa198', '#859900', '#6c71c4', '#b58900', '#cb4b16', '#268bd2'],
      compColors: ['#6c71c4', '#859900', '#b58900', '#cb4b16', '#d33682', '#2aa198']
    }
  }
};

let currentThemeId = localStorage.getItem('mathlab_theme') || 'dark';

export function getActiveTheme() {
  return THEMES[currentThemeId] || THEMES.dark;
}

export function setTheme(themeId, onThemeChange) {
  if (THEMES[themeId]) {
    currentThemeId = themeId;
    localStorage.setItem('mathlab_theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    updateThemeButtonText();
    if (onThemeChange) onThemeChange(THEMES[themeId]);
  }
}

export function cycleTheme(onThemeChange) {
  const keys = Object.keys(THEMES);
  const nextIdx = (keys.indexOf(currentThemeId) + 1) % keys.length;
  const nextTheme = keys[nextIdx];
  setTheme(nextTheme, onThemeChange);
  return THEMES[nextTheme];
}

export function initTheme(onThemeChange) {
  document.documentElement.setAttribute('data-theme', currentThemeId);
  updateThemeButtonText();
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      cycleTheme(onThemeChange);
    });
  }
}

export function updateThemeButtonText() {
  const btn = document.getElementById('btnThemeToggle');
  if (!btn) return;
  const theme = getActiveTheme();
  const locale = localStorage.getItem('mathlab_locale') || 'en';
  const name = theme.name[locale] || theme.name['zh-en'] || theme.id;
  btn.innerText = `🎨 ${name}`;
}
