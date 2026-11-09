/**
 * MathLab Mathematical Terminology Glossary & Morphing Engine
 * Supports cross-hover tooltips, click-to-swap language morphing, and Copilot density control.
 */

import { getLocale } from './i18n.js';

export const TERMS_GLOSSARY = {
  derivatives: {
    key: "derivatives",
    zh: "逐阶导数",
    en: "Derivatives Matrix",
    zh_en: "逐阶 Derivatives",
    desc: {
      zh: "各阶解析导数矩阵 f'(x) ~ f⁽⁵⁾(x)，表征瞬时变化率与高阶动力学曲率",
      en: "Higher-order analytical derivative suite representing instantaneous rates of change and dynamic curvature"
    }
  },
  superposition: {
    key: "superposition",
    zh: "分量叠加",
    en: "Superposition",
    zh_en: "Superposition 叠加态",
    desc: {
      zh: "独立物理/代数基底波包的线性求和，揭示宏观曲线的微观组成",
      en: "Linear summation of constituent basis wavelets and polynomial modes"
    }
  },
  standard: {
    key: "standard",
    zh: "基础单图",
    en: "Standard Single Plot",
    zh_en: "Standard 单图",
    desc: {
      zh: "原函数全局视窗，提供大范围平移与自适应视口探测",
      en: "Primary function global viewport with adaptive crosshair zoom"
    }
  },
  critical: {
    key: "critical",
    zh: "极值驻点",
    en: "Critical Points",
    zh_en: "Critical 极值驻点",
    desc: {
      zh: "一阶导数为零或不存在的点 (f'(x) = 0)，切线水平，对应局部极值",
      en: "Points where f'(x) = 0 or undefined; horizontal tangent slope"
    }
  },
  inflection: {
    key: "inflection",
    zh: "拐点",
    en: "Inflection Points",
    zh_en: "Inflection 拐点",
    desc: {
      zh: "二阶导数变号的点 (f''(x) = 0)，曲线凹凸性发生几何反转",
      en: "Points where f''(x) = 0 and concavity changes sign"
    }
  },
  asymptote: {
    key: "asymptote",
    zh: "渐近线",
    en: "Asymptotes",
    zh_en: "Asymptotes 渐近线",
    desc: {
      zh: "当 x 趋于无穷或代数奇点时曲线趋近的直线 (y = mx + b 或 x = c)",
      en: "Lines approached asymptotically as x approaches infinity or rational poles"
    }
  },
  basis: {
    key: "basis",
    zh: "基底分量",
    en: "Basis Components",
    zh_en: "Basis 分量",
    desc: {
      zh: "不可约加性/谐波分量 (多项式、傅里叶波包、奇点项)",
      en: "Irreducible additive or harmonic components composing the parent function"
    }
  },
  parity: {
    key: "parity",
    zh: "奇偶对称性",
    en: "Symmetry Parity",
    zh_en: "Symmetry 奇偶性",
    desc: {
      zh: "函数在原点或纵轴的几何对称特性 (f(-x) = ±f(x))",
      en: "Geometric symmetry reflection across y-axis or origin point"
    }
  },
  taylor: {
    key: "taylor",
    zh: "泰勒级数展开",
    en: "Taylor Series Expansion",
    zh_en: "Taylor 泰勒展开",
    desc: {
      zh: "在指定坐标邻域内基于各阶导数的多项式局部近似逼近",
      en: "Local polynomial approximation based on derivative coefficients at x0"
    }
  }
};

let currentDensityMode = localStorage.getItem('mathlab_term_density') || 'bilingual'; // 'compact', 'dense', 'bilingual'
let termOverrides = {}; // termKey -> forced language ('zh' | 'en')

let tooltipEl = null;

export function initTermGlossary() {
  createTooltipElement();
  attachTermListeners();
  
  // Expose global controller to window for Copilot and MCP control
  window.mathlabSetTermDensity = setTermDensity;
  window.mathlabToggleTerm = toggleSingleTerm;
  window.mathlabGetGlossaryState = () => ({
    density: currentDensityMode,
    overrides: termOverrides,
    glossaryKeys: Object.keys(TERMS_GLOSSARY)
  });
}

function createTooltipElement() {
  if (tooltipEl) return;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'termTooltip';
  tooltipEl.className = 'term-hover-tooltip';
  document.body.appendChild(tooltipEl);
}

export function setTermDensity(mode) {
  if (['compact', 'dense', 'bilingual'].includes(mode)) {
    currentDensityMode = mode;
    localStorage.setItem('mathlab_term_density', mode);
    updateAllTermElements();
    return { status: "ok", density: currentDensityMode };
  }
  return { status: "error", message: `Unknown mode: ${mode}` };
}

export function toggleSingleTerm(termKey) {
  const term = TERMS_GLOSSARY[termKey];
  if (!term) return { status: "error", message: `Unknown term: ${termKey}` };

  const current = termOverrides[termKey] || (getLocale() === 'en' ? 'en' : 'zh');
  termOverrides[termKey] = current === 'zh' ? 'en' : 'zh';
  updateSingleTermElement(termKey);
  return { status: "ok", term: termKey, activeLang: termOverrides[termKey] };
}

export function attachTermListeners() {
  document.querySelectorAll('[data-term]').forEach(el => {
    const termKey = el.getAttribute('data-term');
    const term = TERMS_GLOSSARY[termKey];
    if (!term) return;

    el.classList.add('interactive-term');
    const initialText = el.innerText.trim();
    const emojiMatch = initialText.match(/^([\p{Extended_Pictographic}\u2600-\u27BF\uFE0F\u200D]+)\s*/u);
    if (emojiMatch && !el.hasAttribute('data-icon')) {
      el.setAttribute('data-icon', emojiMatch[1] + ' ');
    }

    el.addEventListener('mouseenter', (e) => {
      showTermTooltip(el, term);
    });

    el.addEventListener('mouseleave', () => {
      hideTermTooltip();
    });

    el.addEventListener('click', (e) => {
      const locale = getLocale();
      if (locale === 'zh-en' || currentDensityMode === 'bilingual') {
        e.stopPropagation();
        toggleSingleTerm(termKey);
        showTermTooltip(el, term); // Refresh tooltip
      }
    });
  });
}

function showTermTooltip(targetEl, term) {
  if (!tooltipEl) return;
  const locale = getLocale();
  const override = termOverrides[term.key];

  let primary = "";
  let counter = "";
  let desc = "";

  if (locale === 'zh') {
    primary = term.zh;
    counter = term.en;
    desc = term.desc.zh;
  } else if (locale === 'en') {
    primary = term.en;
    counter = term.zh;
    desc = term.desc.en;
  } else {
    // zh-en mode
    if (override === 'en') {
      primary = term.en;
      counter = `⇄ ${term.zh} (点击切回中文)`;
    } else {
      primary = term.zh;
      counter = `⇄ ${term.en} (点击切为英文)`;
    }
    desc = `${term.desc.zh} · ${term.desc.en}`;
  }

  tooltipEl.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-primary">${primary}</span>
      <span class="tooltip-counter">${counter}</span>
    </div>
    <div class="tooltip-desc">${desc}</div>
    <div class="tooltip-hint">⚡ [交互提示]: ${locale === 'zh-en' ? '点击术语即可原位语言互换' : '在 zh-en 模式下支持原位点击互换'}</div>
  `;

  const rect = targetEl.getBoundingClientRect();
  tooltipEl.style.display = 'block';
  const tipRect = tooltipEl.getBoundingClientRect();

  let top = rect.bottom + 8;
  let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

  // Boundary checks
  if (left < 10) left = 10;
  if (left + tipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tipRect.width - 10;
  }
  if (top + tipRect.height > window.innerHeight - 10) {
    top = rect.top - tipRect.height - 8;
  }

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}

function hideTermTooltip() {
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}

function updateSingleTermElement(termKey) {
  const el = document.querySelector(`[data-term="${termKey}"]`);
  if (!el) return;
  const term = TERMS_GLOSSARY[termKey];
  if (!term) return;

  const locale = getLocale();
  const override = termOverrides[termKey];

  const icon = el.getAttribute('data-icon') || '';
  if (override) {
    el.innerText = `${icon}${override === 'en' ? term.en : term.zh}`;
    return;
  }

  if (currentDensityMode === 'compact') {
    el.innerText = `${icon}${locale === 'en' ? term.en : term.zh}`;
  } else if (currentDensityMode === 'dense') {
    el.innerText = `${icon}${term.zh} (${term.en})`;
  } else {
    // default
    el.innerText = `${icon}${locale === 'en' ? term.en : (locale === 'zh' ? term.zh : (term.zh_en || `${term.zh} ${term.en}`))}`;
  }
}

export function updateAllTermElements() {
  Object.keys(TERMS_GLOSSARY).forEach(k => updateSingleTermElement(k));
}
