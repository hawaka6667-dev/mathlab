/**
 * SymStudio Internationalization & Terminology Management (i18n)
 * Dual-Mode: 'en' (Default English) <-> 'zh' (Chinese).
 * 'zh-en' has been deprecated.
 */

export const DICTIONARY = {
  en: {
    appTitle: "SymStudio",
    subtitle: "Symbolic Calculus & Dynamic Math Exploration Workbench",
    placeholderExpr: "Enter formula, supports LaTeX, Unicode, Piecewise (e.g. x^2 + 4000/x, sin(x), x^3-3x)...",
    btnSubmit: "↵ Plot",
    btnSubmitTitle: "Execute Plot (Enter)",
    btnStar: "☆ Bookmark",
    btnStarred: "★ Bookmarked",
    btnStarTitle: "Bookmark / Unbookmark active function",
    btnFavs: "📑 Bookmarks",
    btnFavsTitle: "Open Mathematical Bookmarks",
    btnResetAll: "🎯 Reset All",
    btnResetAllTitle: "Reset all viewports to coordinate origin",
    btnConsole: "📟 Console",
    btnConsoleTitle: "Open/Collapse Diagnostic Console (Shortcut: ~)",
    btnAI: "🤖 AI Copilot",
    btnAITitle: "Open NotebookLM-style Gemini AI Copilot",
    btnRandom: "🎲 Roll Function",
    btnRandomTitle: "Roll a classic calculus benchmark (Shortcut: R)",
    inspectLabel: "Inspection:",
    inspectHint: "(Hover over plot)",
    tabSuperposition: "🧬 Superposition",
    tabDerivatives: "🔀 Derivatives Matrix",
    tabStandard: "📈 Standard Single Plot",
    compositeLegend: "— Composite f(x)",
    componentLegendPrefix: "·· Component",
    basisLabel: "Basis Component",
    superOverlayTitle: "[Composite Curve & Basis Superposition]",
    favModalTitle: "⭐ Mathematical Bookmarks",
    favEmpty: "No bookmarks in this category",
    favPlotBtn: "⚡ Plot",
    hudTitle: "SymStudio HUD Diagnostics & Runtime Logger",
    hudTabAll: "All Logs",
    hudTabAst: "AST Syntax Tree",
    hudTabSolver: "Calculus Solver",
    hudTabApi: "Network API",
    hudTabErrors: "Errors / Warnings",
    hudRefresh: "🔄 Refresh",
    hudClear: "🗑️ Clear",
    hudCopy: "📋 Copy",
    aiWelcome: "👋 Welcome to <b>SymStudio Gemini AI Copilot</b>!<br>Chat in natural language to manipulate viewports, switch tabs, compute Taylor series, or decompose basis wavelets.",
    chipTaylor: "✨ Taylor Series (O4)",
    chipCritical: "🔍 Extrema & Inflection",
    chipAsymptote: "📐 Find Asymptotes",
    chipWave: "🌊 Damped Wave Decay",
    chipDecomp: "🧩 Decompose x^2 + 4000/x",
    chipBookmark: "⭐ Save to Bookmarks",
    aiInputPlaceholder: "Send instruction to Gemini: manipulate plot, Taylor series, extrema...",
    btnSendAI: "Send",
    apiKeyTitle: "🔑 Configure Gemini API Key",
    apiKeyDesc: "Enter your Google Gemini API Key (stored securely in browser session storage, never sent elsewhere).",
    btnSaveKey: "Save & Apply",
    langName: "🌐 English (en)"
  },
  zh: {
    appTitle: "SymStudio",
    subtitle: "符号微积分与动态数学探索工坊",
    placeholderExpr: "输入函数，支持 LaTeX、Unicode、分段函数 (例: x^2 + 4000/x, sin(x), x^3-3x)...",
    btnSubmit: "↵ 绘制",
    btnSubmitTitle: "执行绘制 (Enter)",
    btnStar: "☆ 收藏",
    btnStarred: "★ 已收藏",
    btnStarTitle: "收藏/取消收藏当前函数",
    btnFavs: "📑 收藏夹",
    btnFavsTitle: "打开数学收藏夹",
    btnResetAll: "🎯 居中重置",
    btnResetAllTitle: "重置全部视角为中心十字轴",
    btnConsole: "📟 控制台",
    btnConsoleTitle: "打开/折叠诊断控制台 (快捷键: ~)",
    btnAI: "🤖 AI 伴侣",
    btnAITitle: "打开 NotebookLM 风格 Gemini AI 伴侣",
    btnRandom: "🎲 随机摇函数",
    btnRandomTitle: "随机摇一个经典分析学/微积分函数 (快捷键: R)",
    inspectLabel: "视口探测:",
    inspectHint: "(鼠标悬停画布)",
    tabSuperposition: "🧬 分量叠加",
    tabDerivatives: "🔀 逐阶求导",
    tabStandard: "📈 基础单图",
    compositeLegend: "— 合成 f(x)",
    componentLegendPrefix: "·· 分量",
    basisLabel: "分量基底",
    superOverlayTitle: "[合成曲线 & 分量基底叠加]",
    favModalTitle: "⭐ 我的数学收藏夹 (Favorites)",
    favEmpty: "该分类下暂无收藏公式",
    favPlotBtn: "⚡ 绘制",
    hudTitle: "SymStudio 运行诊断与系统日志",
    hudTabAll: "全部 (All)",
    hudTabAst: "AST 符号树",
    hudTabSolver: "微积分求解",
    hudTabApi: "网络请求",
    hudTabErrors: "错误/告警",
    hudRefresh: "🔄 刷新",
    hudClear: "🗑️ 清空",
    hudCopy: "📋 复制",
    aiWelcome: "👋 欢迎使用 <b>SymStudio Gemini 智能伴侣</b>！<br>您可直接用自然语言让我操纵画布、切换模态、解释加性/乘性基底或聚焦极值奇点。",
    chipTaylor: "✨ 4阶泰勒展开",
    chipCritical: "🔍 极值与拐点求解",
    chipAsymptote: "📐 探测全部渐近线",
    chipWave: "🌊 阻尼波动衰减",
    chipDecomp: "🧩 x^2 + 4000/x 分解",
    chipBookmark: "⭐ 存入收藏夹",
    aiInputPlaceholder: "向 Gemini 发送指令，操纵画布或数学解析...",
    btnSendAI: "发送",
    apiKeyTitle: "🔑 配置 Gemini API Key",
    apiKeyDesc: "填入您的 Google Gemini API Key（本地私密保存于浏览器与运行时会话中，绝不上报第三方）。",
    btnSaveKey: "保存并生效",
    langName: "🌐 中文 (zh)"
  }
};

// Strict dual-mode: default to 'en', fallback if legacy 'zh-en' was stored
let savedLocale = localStorage.getItem('mathlab_locale');
if (savedLocale === 'zh-en' || !['en', 'zh'].includes(savedLocale)) {
  savedLocale = 'en';
  localStorage.setItem('mathlab_locale', 'en');
}
let currentLocale = savedLocale;

export function getLocale() {
  return currentLocale;
}

export function t(key) {
  const dict = DICTIONARY[currentLocale] || DICTIONARY['en'];
  return dict[key] || key;
}

export function setLocale(locale, onLocaleChange) {
  const target = locale === 'zh' ? 'zh' : 'en';
  currentLocale = target;
  localStorage.setItem('mathlab_locale', target);
  applyI18nToDOM();
  if (onLocaleChange) onLocaleChange(currentLocale);
}

export function cycleLocale(onLocaleChange) {
  const next = currentLocale === 'en' ? 'zh' : 'en';
  setLocale(next, onLocaleChange);
  return next;
}

export function applyI18nToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const trans = t(k);
    if (trans) {
      if (el.tagName === 'INPUT' && el.getAttribute('placeholder') !== null) {
        el.setAttribute('placeholder', trans);
      } else {
        el.innerHTML = trans;
      }
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const k = el.getAttribute('data-i18n-title');
    const trans = t(k);
    if (trans) {
      el.setAttribute('title', trans);
    }
  });

  const langBtn = document.getElementById('btnLangToggle');
  if (langBtn) {
    langBtn.innerText = t('langName');
  }
}
