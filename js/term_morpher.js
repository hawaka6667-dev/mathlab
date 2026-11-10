/**
 * MathLab Mathematical Terminology Glossary & Tooltip Engine
 * Pure non-intrusive hover tooltips for bilingual translation without click hijacking.
 */

import { getLocale } from './i18n.js';

export const TERMS_GLOSSARY = {
  derivatives: {
    key: "derivatives",
    zh: "逐阶求导",
    en: "Derivatives Matrix",
    desc: {
      zh: "各阶解析导数矩阵 f'(x) ~ f⁽⁵⁾(x)，表征瞬时变化率与高阶动力学曲率",
      en: "Higher-order analytical derivative suite representing instantaneous rates of change and dynamic curvature"
    }
  },
  superposition: {
    key: "superposition",
    zh: "分量叠加",
    en: "Superposition",
    desc: {
      zh: "独立物理/代数基底波包的线性求和，揭示宏观曲线的微观组成",
      en: "Linear summation of constituent basis wavelets and polynomial modes"
    }
  },
  standard: {
    key: "standard",
    zh: "基础单图",
    en: "Standard Single Plot",
    desc: {
      zh: "原函数全局视窗，提供大范围平移与自适应视口探测",
      en: "Primary function global viewport with adaptive crosshair zoom"
    }
  },
  critical: {
    key: "critical",
    zh: "极值驻点",
    en: "Critical Points",
    desc: {
      zh: "一阶导数为零或不存在的点 (f'(x) = 0)，切线水平，对应局部极值",
      en: "Points where f'(x) = 0 or undefined; horizontal tangent slope"
    }
  },
  inflection: {
    key: "inflection",
    zh: "拐点",
    en: "Inflection Points",
    desc: {
      zh: "二阶导数变号的点 (f''(x) = 0)，曲线凹凸性发生几何反转",
      en: "Points where f''(x) = 0 and concavity changes sign"
    }
  },
  asymptote: {
    key: "asymptote",
    zh: "渐近线",
    en: "Asymptotes",
    desc: {
      zh: "当 x 趋于无穷或代数奇点时曲线趋近的直线 (y = mx + b 或 x = c)",
      en: "Lines approached asymptotically as x approaches infinity or rational poles"
    }
  },
  basis: {
    key: "basis",
    zh: "基底分量",
    en: "Basis Components",
    desc: {
      zh: "不可约加性/谐波分量 (多项式、傅里叶波包、奇点项)",
      en: "Irreducible additive or harmonic components composing the parent function"
    }
  },
  parity: {
    key: "parity",
    zh: "奇偶对称性",
    en: "Symmetry Parity",
    desc: {
      zh: "函数在原点或纵轴的几何对称特性 (f(-x) = ±f(x))",
      en: "Geometric symmetry reflection across y-axis or origin point"
    }
  },
  taylor: {
    key: "taylor",
    zh: "泰勒级数展开",
    en: "Taylor Series Expansion",
    desc: {
      zh: "在指定坐标邻域内基于各阶导数的多项式局部近似逼近",
      en: "Local polynomial approximation based on derivative coefficients at x0"
    }
  }
};

let tooltipEl = null;

export function initTermGlossary() {
  createTooltipElement();
  attachTermListeners();
  
  // Clean legacy overrides
  localStorage.removeItem('mathlab_term_overrides');
  
  // Expose inspection helper
  window.mathlabGetGlossaryState = () => ({
    locale: getLocale(),
    glossaryKeys: Object.keys(TERMS_GLOSSARY)
  });
  window.mathlabSetTermDensity = (mode) => ({ status: "ok", density: mode });
}

function createTooltipElement() {
  if (tooltipEl) return;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'termTooltip';
  tooltipEl.className = 'term-hover-tooltip';
  document.body.appendChild(tooltipEl);
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

    el.addEventListener('mouseenter', () => {
      showTermTooltip(el, term);
    });

    el.addEventListener('mouseleave', () => {
      hideTermTooltip();
    });
  });
}

function showTermTooltip(targetEl, term) {
  if (!tooltipEl) return;
  const locale = getLocale();

  let primary = "";
  let counter = "";
  let desc = "";

  if (locale === 'zh') {
    primary = term.zh;
    counter = term.en;
    desc = term.desc.zh;
  } else {
    // en mode
    primary = term.en;
    counter = term.zh;
    desc = term.desc.en;
  }

  tooltipEl.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-primary">${primary}</span>
      <span class="tooltip-counter">${counter}</span>
    </div>
    <div class="tooltip-desc">${desc}</div>
    <div class="tooltip-hint">💡 [Hover Translation]: 术语双语对照与物理释义</div>
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

export function updateSingleTermElement(termKey) {
  const el = document.querySelector(`[data-term="${termKey}"]`);
  if (!el) return;
  const term = TERMS_GLOSSARY[termKey];
  if (!term) return;

  const locale = getLocale();
  const icon = el.getAttribute('data-icon') || '';
  el.innerText = `${icon}${locale === 'en' ? term.en : term.zh}`;
}

export function updateAllTermElements() {
  Object.keys(TERMS_GLOSSARY).forEach(k => updateSingleTermElement(k));
}
