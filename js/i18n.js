/**
 * MathLab Internationalization & Terminology Management (i18n)
 * Supports 'zh' (Chinese), 'en' (English), and 'zh-en' (Code-Switching Engineering Jargon)
 */

export const DICTIONARY = {
  zh: {
    appTitle: "MathLab Studio",
    subtitle: "符号微积分与动态数学探索工坊",
    placeholderExpr: "输入函数，支持 LaTeX、Unicode、分段函数 (例: x^2 + 4000/x, sin(x), x^3-3x)...",
    btnRoll: "🎲 随机探索",
    btnStar: "☆ 收藏",
    btnStarred: "★ 已收藏",
    btnFavs: "⭐ 收藏夹",
    btnResetView: "🎯 居中重置",
    btnHud: "💻 诊断控制台 (~)",
    btnCopilot: "✨ Copilot",
    tabDerivatives: "逐阶求导矩阵 (0~5th)",
    tabSuperposition: "分量叠加与基底分解",
    parityLabel: "对称奇偶性",
    parityEven: "偶函数 (Even: f(-x) = f(x))",
    parityOdd: "奇函数 (Odd: f(-x) = -f(x))",
    parityNeither: "非奇非偶 (Neither)",
    basisLabel: "独立代数/谐波基底",
    favTitle: "数学收藏夹 (分类层级)",
    favEmpty: "该分类下暂无收藏公式",
    copilotTitle: "NotebookLM Copilot 协同助手",
    copilotStatusReady: "引擎就绪 (Ready)",
    copilotPlaceholder: "输入自然语言，如'做4阶泰勒展开'、'求极值与拐点'...",
    chipTaylor: "4阶泰勒展开",
    chipCritical: "极值驻点与拐点",
    chipAsymptote: "探测全部渐近线",
    chipFourier: "方波傅里叶合成",
    langName: "🌐 中文 (zh)"
  },
  en: {
    appTitle: "MathLab Studio",
    subtitle: "Symbolic Calculus & Dynamic Math Exploration Workbench",
    placeholderExpr: "Enter formula, supports LaTeX, Unicode, Piecewise (e.g. x^2 + 4000/x, sin(x), x^3-3x)...",
    btnRoll: "🎲 Random",
    btnStar: "☆ Bookmark",
    btnStarred: "★ Bookmarked",
    btnFavs: "⭐ Bookmarks",
    btnResetView: "🎯 Reset View",
    btnHud: "💻 Diagnostic HUD (~)",
    btnCopilot: "✨ Copilot",
    tabDerivatives: "Derivatives Matrix (0~5th)",
    tabSuperposition: "Superposition & Decomposition",
    parityLabel: "Symmetry Parity",
    parityEven: "Even Function (f(-x) = f(x))",
    parityOdd: "Odd Function (f(-x) = -f(x))",
    parityNeither: "Neither Even nor Odd",
    basisLabel: "Independent Basis Terms",
    favTitle: "Mathematical Bookmarks (Categories)",
    favEmpty: "No bookmarks in this category",
    copilotTitle: "NotebookLM Copilot Assistant",
    copilotStatusReady: "Engine Ready",
    copilotPlaceholder: "Ask anything, e.g. 'Taylor series order 4', 'find critical points'...",
    chipTaylor: "Taylor Series (O4)",
    chipCritical: "Extrema & Inflection",
    chipAsymptote: "Find Asymptotes",
    chipFourier: "Fourier Wave Superposition",
    langName: "🌐 English (en)"
  },
  "zh-en": {
    appTitle: "MathLab Studio",
    subtitle: "Symbolic Calculus 符号微积分工坊",
    placeholderExpr: "输入 Formula, 支持 LaTeX, Unicode, Piecewise (例: x^2 + 4000/x, sin(x))...",
    btnRoll: "🎲 Random 探索",
    btnStar: "☆ Bookmark 收藏",
    btnStarred: "★ Bookmarked 已存",
    btnFavs: "⭐ Bookmarks 库",
    btnResetView: "🎯 Reset Viewport",
    btnHud: "💻 HUD Console (~)",
    btnCopilot: "✨ Gemini Copilot",
    tabDerivatives: "逐阶求导 Matrix (0~5th Order)",
    tabSuperposition: "Superposition 叠加态与 Decomposition",
    parityLabel: "Symmetry 奇偶对称性",
    parityEven: "Even 偶函数 (f(-x)=f(x))",
    parityOdd: "Odd 奇函数 (f(-x)=-f(x))",
    parityNeither: "Neither 非奇非偶",
    basisLabel: "Independent Basis 分量",
    favTitle: "Math Bookmarks 收藏层级",
    favEmpty: "当前 Category 暂无收藏项",
    copilotTitle: "NotebookLM Copilot 协同助手",
    copilotStatusReady: "Engine Ready 就绪",
    copilotPlaceholder: "输入 Prompt, 如'展开4阶 Taylor'、'求 Critical Extrema'...",
    chipTaylor: "4阶 Taylor 展开",
    chipCritical: "Critical 极值与 Inflection 拐点",
    chipAsymptote: "Asymptotes 渐近线",
    chipFourier: "Fourier 傅里叶合成",
    langName: "🌐 Code-Switching (zh-en)"
  }
};

let currentLocale = localStorage.getItem('mathlab_locale') || 'zh-en';

export function getLocale() {
  return currentLocale;
}

export function t(key) {
  const dict = DICTIONARY[currentLocale] || DICTIONARY['zh-en'];
  return dict[key] || key;
}

export function setLocale(locale, onLocaleChange) {
  if (DICTIONARY[locale]) {
    currentLocale = locale;
    localStorage.setItem('mathlab_locale', locale);
    applyI18nToDOM();
    if (onLocaleChange) onLocaleChange(currentLocale);
  }
}

export function cycleLocale(onLocaleChange) {
  const locales = ['zh-en', 'zh', 'en'];
  const nextIdx = (locales.indexOf(currentLocale) + 1) % locales.length;
  setLocale(locales[nextIdx], onLocaleChange);
  return locales[nextIdx];
}

export function applyI18nToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const trans = t(k);
    if (trans) {
      if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
        el.setAttribute('placeholder', trans);
      } else {
        el.innerText = trans;
      }
    }
  });

  const langBtn = document.getElementById('btnLangToggle');
  if (langBtn) {
    langBtn.innerText = t('langName');
  }
}
