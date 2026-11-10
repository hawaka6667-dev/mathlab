/**
 * MathLab Mathematical Concept & Calculus Intuition Tooltip Engine
 * Specializes strictly in mathematical concept intuition, geometric properties,
 * and analytical formulas. UI translation is 100% delegated to i18n.js.
 * This engine NEVER mutates DOM element innerText or interferes with tab navigation.
 */

import { getLocale } from './i18n.js';

export const TERMS_GLOSSARY = {
  derivatives: {
    key: "derivatives",
    zh: "逐阶求导",
    en: "Derivatives Matrix",
    tag: { zh: "微积分变化率", en: "Calculus Dynamics" },
    formula: "f'(x) ~ f⁽⁵⁾(x) = dⁿy/dxⁿ",
    desc: {
      zh: "瞬时变化率与高阶动力学曲率矩阵；表征切线斜率、凹凸加速度与高频突变。",
      en: "Suite of higher-order analytical derivatives representing instantaneous velocity, acceleration, and curvature."
    }
  },
  superposition: {
    key: "superposition",
    zh: "分量叠加",
    en: "Superposition",
    tag: { zh: "基底解构", en: "Decomposition" },
    formula: "f(x) = ∑ uᵢ(x)",
    desc: {
      zh: "独立物理/代数基底波包与单项式的线性求和；揭示宏观复合曲线的微观物理构成。",
      en: "Linear summation of constituent polynomial modes, harmonic wavelets, and rational asymptotic poles."
    }
  },
  standard: {
    key: "standard",
    zh: "基础单图",
    en: "Standard Single Plot",
    tag: { zh: "全局视窗", en: "Global Viewport" },
    formula: "y = f(x)",
    desc: {
      zh: "原函数全景连续视窗；支持大范围十字准星连续追踪探测与自适应视口平移缩放。",
      en: "Panoramic parent function curve offering continuous crosshair probing and adaptive viewport zoom."
    }
  },
  critical: {
    key: "critical",
    zh: "极值驻点",
    en: "Critical Points",
    tag: { zh: "局部极值", en: "Local Extrema" },
    formula: "f'(x) = 0 ∨ ∄",
    desc: {
      zh: "一阶导数为零或不可导奇点；切线呈水平状态，对应势阱平衡态与局部极值峰谷。",
      en: "Stationary points with zero slope (horizontal tangent) or non-differentiable peaks indicating local extrema."
    }
  },
  inflection: {
    key: "inflection",
    zh: "拐点",
    en: "Inflection Points",
    tag: { zh: "几何凹凸性", en: "Concavity Flip" },
    formula: "f''(x) = 0 ∧ f''(x)变号",
    desc: {
      zh: "二阶导数变号零点；曲线凸度发生几何反转，上凸与下凹分界，曲率中心对调。",
      en: "Points where concavity flips between convex and concave; curvature sign transitions across zero."
    }
  },
  asymptote: {
    key: "asymptote",
    zh: "渐近线",
    en: "Asymptotes",
    tag: { zh: "极限边界", en: "Asymptotics" },
    formula: "y = mx + b ∨ x = c",
    desc: {
      zh: "曲线沿无穷远或代数奇点逼近的直线；包含分母零点铅直渐近线与极限水平/斜渐近线。",
      en: "Linear boundaries approached asymptotically as x → ±∞ or at rational algebraic denominator poles."
    }
  },
  basis: {
    key: "basis",
    zh: "基底分量",
    en: "Basis Components",
    tag: { zh: "代数基底", en: "Basis Wavelet" },
    formula: "uₖ(x) ∈ Span{B}",
    desc: {
      zh: "不可约加性/谐波分量；作为独立代数基底合成原函数宏观形态。",
      en: "Irreducible constituent additive or harmonic components composing the parent mathematical system."
    }
  },
  parity: {
    key: "parity",
    zh: "奇偶对称性",
    en: "Symmetry Parity",
    tag: { zh: "镜像变换", en: "Symmetry" },
    formula: "f(-x) = ±f(x)",
    desc: {
      zh: "几何镜像对称特性；偶函数关于纵轴对称 (f(-x)=f(x))，奇函数关于原点中心对称 (f(-x)=-f(x))。",
      en: "Geometric reflection invariance: even symmetry across y-axis or odd rotational symmetry about the origin."
    }
  },
  taylor: {
    key: "taylor",
    zh: "泰勒级数展开",
    en: "Taylor Series",
    tag: { zh: "多项式逼近", en: "Approximation" },
    formula: "∑ [fⁿ(x₀)/n!] (x - x₀)ⁿ",
    desc: {
      zh: "在指定坐标邻域内基于导数矩阵的多项式渐近逼近；以代数多项式逼近超越函数形态。",
      en: "Local polynomial approximation at x0 governed by higher-order derivative coefficients."
    }
  }
};

let tooltipEl = null;

export function initTermGlossary() {
  createTooltipElement();
  attachTermListeners();

  // Clean any legacy term overrides from previous sessions
  try {
    localStorage.removeItem('mathlab_term_overrides');
    localStorage.removeItem('mathlab_term_density');
  } catch (e) {}

  // Expose inspection helper for Copilot and tests
  window.mathlabGetGlossaryState = () => ({
    locale: getLocale(),
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

export function attachTermListeners() {
  document.querySelectorAll('[data-term]').forEach(el => {
    const termKey = el.getAttribute('data-term');
    const term = TERMS_GLOSSARY[termKey];
    if (!term) return;

    el.classList.add('interactive-term');

    // ONLY hover listeners - NEVER intercept click, NEVER mutate innerText
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
  const rawLocale = getLocale();
  const locale = rawLocale === 'zh' ? 'zh' : 'en';

  const title = locale === 'zh' ? term.zh : term.en;
  const tag = term.tag ? (term.tag[locale] || term.tag.en) : 'CALCULUS';
  const desc = term.desc[locale] || term.desc.en;
  const formulaHtml = term.formula ? `<div class="tooltip-formula">${term.formula}</div>` : '';

  tooltipEl.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-primary">${title}</span>
      <span class="tooltip-tag">${tag}</span>
    </div>
    <div class="tooltip-desc">${desc}</div>
    ${formulaHtml}
  `;

  const rect = targetEl.getBoundingClientRect();
  tooltipEl.style.display = 'block';
  const tipRect = tooltipEl.getBoundingClientRect();

  let top = rect.bottom + 8;
  let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

  // Viewport boundary clamping
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

/**
 * UI text translation is 100% owned by applyI18nToDOM().
 * updateAllTermElements is kept as a safe no-op to prevent duplicate/conflicting DOM mutations.
 */
export function updateSingleTermElement(termKey) {
  // Pure no-op: element text is governed solely by i18n dictionary.
}

export function updateAllTermElements() {
  // Pure no-op: element text is governed solely by i18n dictionary.
}
