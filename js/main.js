/**
 * MathLab Application Controller & State Orchestrator
 */

import { getThemeColors, getThemeCompColors, resizeCanvas, toMath, drawGridAndAxes, renderCurve, attachPanZoom } from './render_engine.js';
import { initTheme, updateThemeButtonText } from './theme.js';
import { addLog, openConsole, updateEngineHUD } from './hud_logger.js';
import { initFavorites, updateStarStatus, renderCategoryUI } from './favorites.js';
import { initAICopilot } from './ai_copilot.js';
import { t, getLocale, cycleLocale, applyI18nToDOM } from './i18n.js';
import { solveClientSide } from './client_solver.js';
import { initTermGlossary, updateAllTermElements } from './term_morpher.js';

// DOM References
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const formulaForm = document.getElementById('formulaForm');
const exprInput = document.getElementById('exprInput');
const btnSubmit = document.getElementById('btnSubmit');
const activeInspect = document.getElementById('activeInspect');
const btnResetAll = document.getElementById('btnResetAll');
const btnRandom = document.getElementById('btnRandom');

// Standard mode canvas
const cvStandard = document.getElementById('cvStandard');
const tipStandard = document.getElementById('tipStandard');
const formStandard = document.getElementById('formStandard');

// Derivatives mode canvases
const canvasesDeriv = [0, 1, 2, 3, 4, 5].map(i => document.getElementById('cv' + i));
const tipsDeriv = [0, 1, 2, 3, 4, 5].map(i => document.getElementById('tip' + i));
const formRefsDeriv = [0, 1, 2, 3, 4, 5].map(i => document.getElementById('form' + i));

// Superposition mode canvases
const cvOverlay = document.getElementById('cvOverlay');
const tipOverlay = document.getElementById('tipOverlay');
const formSuperOverlay = document.getElementById('formSuperOverlay');
const overlayLegend = document.getElementById('overlayLegend');
const compCardsContainer = document.getElementById('compCardsContainer');

// Benchmark Function Bank for Random Roll
const randomFunctionBank = [
  { fn: "f(x) = x^2 + 4000/x", desc: { en: "Additive Component Decomposition / Dipole Asymptotes", zh: "加性分量分解 / 双极渐近平衡", "zh-en": "Additive 分量分解 / Asymptote 平衡" } },
  { fn: "g(x) = \\begin{cases} x^2 \\sin\\left(\\frac{1}{x}\\right), & x \\neq 0 \\\\ 0, & x = 0 \\end{cases}", desc: { en: "Oscillatory Squeeze Theorem Singularity", zh: "振荡夹逼奇点 (Squeeze Theorem)", "zh-en": "Oscillatory 振荡夹逼奇点 (Squeeze)" } },
  { fn: "f(h) = h^{-2}", desc: { en: "Even Symmetric Infinite Pole Singularity", zh: "偶函数对称无穷间断点", "zh-en": "Even 偶对称无穷间断点" } },
  { fn: "f(x) = 1 / \\sqrt{x}", desc: { en: "Classical Negative Fractional Power Curve", zh: "经典负分数幂曲线", "zh-en": "Negative Fractional 负分数幂" } },
  { fn: "f(x) = x^3 - 3*x", desc: { en: "Cubic Polynomial Dual Extrema & Inflection", zh: "三次多项式双极值与拐点", "zh-en": "Cubic Polynomial 极值与拐点" } },
  { fn: "f(x) = \\sin(x) / x", desc: { en: "Sinc Sampling Function / Removable Singularity", zh: "Sinc采样函数 / 可去奇点", "zh-en": "Sinc 采样函数 / Removable 奇点" } },
  { fn: "f(x) = x * \\exp(-x^2)", desc: { en: "Gaussian Wavelet Derivative Envelope", zh: "高斯波包导数包络", "zh-en": "Gaussian Wavelet 导数包络" } },
  { fn: "f(x) = 1 / (1 + x^2)", desc: { en: "Witch of Agnesi / Cauchy Distribution Kernel", zh: "阿涅西的女巫 / 柯西分布核", "zh-en": "Witch of Agnesi / Cauchy 核" } },
  { fn: "f(x) = \\tan(x)", desc: { en: "Tangent Periodic Asymptotes", zh: "正切函数周期性渐近线", "zh-en": "Tangent 周期渐近线" } },
  { fn: "f(x) = x^(1/3)", desc: { en: "Cube Root / Vertical Tangent at Origin", zh: "三次方根 / 原点垂直切线", "zh-en": "Cube Root 三次方根 / 垂直切线" } },
  { fn: "f(x) = x^4 - 2*x^2", desc: { en: "Double-Well Quartic Polynomial (W-shape)", zh: "双势阱多项式 (W-shape)", "zh-en": "Double-Well 双势阱 (W-shape)" } },
  { fn: "f(x) = \\ln(1 + x^2)", desc: { en: "Logarithmic Well Smooth Even Function", zh: "对数势阱平滑偶函数", "zh-en": "Log Well 平滑偶函数" } },
  { fn: "f(x) = x / (1 + x^2)", desc: { en: "Bounded Odd Function Oscillating Extrema", zh: "有界奇函数波动极值", "zh-en": "Bounded Odd 有界奇函数极值" } },
  { fn: "f(x) = \\exp(-1/x^2)", desc: { en: "Cauchy Infinitely Flat Smooth Singularity", zh: "柯西无限阶平坦光滑奇点", "zh-en": "Cauchy 无限阶平坦光滑奇点" } },
  { fn: "f(x) = 1 / (x^3 - x)", desc: { en: "Three-Pole Rational Fraction (-1, 0, 1)", zh: "三极点有理分式 (-1, 0, 1)", "zh-en": "Three-Pole 有理分式 (-1, 0, 1)" } }
];

let currentVar = 'x';
let currentParity = '';
let currentTab = 'tab-superposition';
let orderLabels = ["f(x)", "f'(x)", "f''(x)", "f'''(x)", "f⁽⁴⁾(x)", "f⁽⁵⁾(x)"];

// Symbolic compiled expressions
let compiledFns = [];
let components = [];
let compType = 'single';
let envelopes = null;

// Viewports
let viewStandard = { xCenter: 15.0, yCenter: 600.0, zoomX: 12.0, zoomY: 0.25 };
let viewsDeriv = [0, 1, 2, 3, 4, 5].map(() => ({ xCenter: 0.0, yCenter: 0.0, zoomX: 45, zoomY: 35 }));
let viewOverlay = { xCenter: 15.0, yCenter: 600.0, zoomX: 12.0, zoomY: 0.25 };
let viewsComp = [];
let lastKnownVersion = -1;

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.getAttribute('data-tab');
    const targetContent = document.getElementById(currentTab);
    if (targetContent) targetContent.classList.add('active');
    resizeAll();
  });
});

function resizeAll() {
  resizeCanvas(cvStandard);
  canvasesDeriv.forEach(cv => resizeCanvas(cv));
  resizeCanvas(cvOverlay);
  document.querySelectorAll('.cv-comp').forEach(cv => resizeCanvas(cv));
  renderActiveTab();
}

function renderActiveTab() {
  if (currentTab === 'tab-standard') {
    renderStandard();
  } else if (currentTab === 'tab-derivatives') {
    renderDerivatives();
  } else if (currentTab === 'tab-superposition') {
    renderSuperposition();
  }
}

function renderStandard() {
  if (!cvStandard) return;
  const ctx = cvStandard.getContext('2d');
  drawGridAndAxes(cvStandard, ctx, viewStandard);
  if (compiledFns[0]) {
    renderCurve(cvStandard, ctx, viewStandard, compiledFns[0], getThemeColors()[0], 2.4);
  }
}

function renderDerivatives() {
  for (let i = 0; i < 6; i++) {
    const cv = canvasesDeriv[i];
    if (!cv) continue;
    const ctx = cv.getContext('2d');
    const v = viewsDeriv[i];
    drawGridAndAxes(cv, ctx, v);
    if (compiledFns[i]) {
      renderCurve(cv, ctx, v, compiledFns[i], getThemeColors()[i % 6], 2.0);
    }
  }
}

function renderSuperposition() {
  if (cvOverlay) {
    const ctx = cvOverlay.getContext('2d');
    drawGridAndAxes(cvOverlay, ctx, viewOverlay);

    // Draw constituent components in dashed lines
    components.forEach((c, idx) => {
      const cColor = getThemeCompColors()[idx % getThemeCompColors().length];
      renderCurve(cvOverlay, ctx, viewOverlay, c.fn, cColor, 1.6, [4, 4]);
    });

    // Draw Composite function in solid line
    if (compiledFns[0]) {
      renderCurve(cvOverlay, ctx, viewOverlay, compiledFns[0], getThemeColors()[0], 2.6);
    }
  }

  // Standalone Component Canvases
  components.forEach((c, idx) => {
    const cv = document.getElementById('cvComp_' + idx);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const v = viewsComp[idx] || viewOverlay;
    drawGridAndAxes(cv, ctx, v);
    const cColor = getThemeCompColors()[idx % getThemeCompColors().length];
    renderCurve(cv, ctx, v, c.fn, cColor, 2.0);
  });
}

// Pan / Zoom Attachments
if (cvStandard) attachPanZoom(cvStandard, () => viewStandard, (v) => { viewStandard = v; }, renderStandard);
canvasesDeriv.forEach((cv, idx) => {
  if (!cv) return;
  attachPanZoom(cv, () => viewsDeriv[idx], (v) => { viewsDeriv[idx] = v; }, renderDerivatives);
  cv.addEventListener('dblclick', () => {
    viewsDeriv[idx] = { xCenter: 0.0, yCenter: 0.0, zoomX: 45, zoomY: 35 };
    renderDerivatives();
  });
});
if (cvOverlay) attachPanZoom(cvOverlay, () => viewOverlay, (v) => { viewOverlay = v; }, renderSuperposition);

if (btnResetAll) {
  btnResetAll.addEventListener('click', () => {
    viewStandard = { xCenter: 0.0, yCenter: 0.0, zoomX: 45, zoomY: 35 };
    viewsDeriv = [0, 1, 2, 3, 4, 5].map(() => ({ xCenter: 0.0, yCenter: 0.0, zoomX: 45, zoomY: 35 }));
    viewOverlay = { xCenter: 0.0, yCenter: 0.0, zoomX: 45, zoomY: 35 };
    viewsComp = components.map(() => ({ xCenter: 0.0, yCenter: 0.0, zoomX: 45, zoomY: 35 }));
    renderActiveTab();
  });
}

export function submitFormula(explicitVal) {
  const val = explicitVal || (exprInput ? exprInput.value.trim() : '');
  if (!val) return;
  if (btnSubmit) {
    btnSubmit.innerText = '⏳ 求解...';
    btnSubmit.style.opacity = '0.7';
  }

  const t0 = performance.now();
  addLog('INFO', 'API', `POST /api/plot payload: "${val}"`);

  fetch('/api/plot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn: val })
  })
  .then(async r => {
    const elapsed = (performance.now() - t0).toFixed(1);
    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      const errMsg = errData.error || ('HTTP ' + r.status);
      throw new Error(errMsg);
    }
    addLog('INFO', 'API', `Response 200 OK (${elapsed}ms)`);
    return r.json();
  })
  .then(data => {
    if (data.pipeline_trace && Array.isArray(data.pipeline_trace)) {
      data.pipeline_trace.forEach(step => addLog('AST', 'SYMPY', step));
    }
    addLog('INFO', 'SOLVER', `Formula compiled successfully: ${data.formulas ? data.formulas[0] : val}`);
    applyState(data);
  })
  .catch(err => {
    addLog('WARN', 'CLIENT_ENGINE', `Server API unavailable (${err.message}). Engaging client-side numerical differentiation fallback...`);
    try {
      const clientData = solveClientSide(val);
      applyState(clientData);
      addLog('INFO', 'CLIENT_ENGINE', `Client-side curves rendered successfully for "${val}"`);
    } catch (clientErr) {
      addLog('ERROR', 'PARSER', `Client solver exception: ${clientErr.message}`);
      if (activeInspect) {
        activeInspect.innerHTML = `<span style="color:#ef4444;font-weight:bold;">[解析错误] ${clientErr.message}</span>`;
      }
      openConsole();
    }
  })
  .finally(() => {
    if (btnSubmit) {
      btnSubmit.innerText = '↵ 绘制';
      btnSubmit.style.opacity = '1';
    }
  });
}

if (formulaForm) {
  formulaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitFormula();
  });
}

if (exprInput) {
  exprInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitFormula();
    }
  });
}

// Random Roll
let lastRandomIdx = -1;
function rollRandomFunction() {
  let nextIdx;
  do {
    nextIdx = Math.floor(Math.random() * randomFunctionBank.length);
  } while (nextIdx === lastRandomIdx && randomFunctionBank.length > 1);
  lastRandomIdx = nextIdx;
  const pick = randomFunctionBank[nextIdx];
  if (exprInput) exprInput.value = pick.fn;
  if (activeInspect) {
    const loc = getLocale();
    const desc = typeof pick.desc === 'object' ? (pick.desc[loc] || pick.desc.en) : pick.desc;
    const rolledLabel = loc === 'en' ? '[🎲 Rolled]' : (loc === 'zh' ? '[🎲 随机摇中]' : '[🎲 Rolled 摇中]');
    activeInspect.innerHTML = `<span style="color:#a855f7;">${rolledLabel}</span> <span style="color:#fff;">${desc}</span>`;
  }
  submitFormula(pick.fn);
}

if (btnRandom) btnRandom.addEventListener('click', rollRandomFunction);

window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if ((e.key === 'r' || e.key === 'R') && activeTag !== 'input') {
    rollRandomFunction();
  }
});

// State Update
function applyState(data) {
  if (data.version) lastKnownVersion = data.version;
  if (data.var) {
    currentVar = data.var;
    orderLabels = [
      `f(${currentVar})`,
      `f'(${currentVar})`,
      `f''(${currentVar})`,
      `f'''(${currentVar})`,
      `f⁽⁴⁾(${currentVar})`,
      `f⁽⁵⁾(${currentVar})`
    ];
  }
  if (data.parity && activeInspect) {
    currentParity = data.parity;
    activeInspect.innerHTML = `<span style="color:#38bdf8;">[${currentParity}]</span> Hover over plot to inspect`;
  }

  // Update Titles
  if (data.formulas && data.formulas.length >= 6) {
    if (formStandard) formStandard.innerText = data.formulas[0];
    if (formSuperOverlay) formSuperOverlay.innerText = data.formulas[0];
    for (let i = 0; i < 6; i++) {
      if (formRefsDeriv[i]) formRefsDeriv[i].innerText = data.formulas[i];
    }
  }

  // Compile Functions
  if (data.js_code && data.js_code.length >= 6) {
    compiledFns = data.js_code.map(code => {
      try {
        return new Function('x', 'try { return (' + code + '); } catch(e) { return NaN; }');
      } catch (e) {
        return () => NaN;
      }
    });
  }

  // Components Decomposition
  compType = data.comp_type || 'single';
  if (data.components && data.components.length > 0) {
    components = data.components.map(c => ({
      str: c.str,
      js: c.js,
      fn: new Function('x', 'try { return (' + c.js + '); } catch(e) { return NaN; }')
    }));
  } else {
    components = [{ str: data.formulas ? data.formulas[0] : 'f(x)', fn: compiledFns[0] }];
  }

  rebuildComponentCards();

  // Viewports
  if (data.suggested_view) {
    viewStandard = Object.assign({}, data.suggested_view);
    viewOverlay = Object.assign({}, data.suggested_view);
    if (viewsDeriv && viewsDeriv.length > 0) {
      viewsDeriv[0] = Object.assign({}, data.suggested_view);
    }
  } else if (data.zooms && data.zooms.length >= 6) {
    viewStandard = { xCenter: 0.0, yCenter: 0.0, zoomX: data.zooms[0].zx, zoomY: data.zooms[0].zy };
    viewOverlay = Object.assign({}, viewStandard);
  }
  if (data.zooms && data.zooms.length >= 6) {
    viewsDeriv = data.zooms.map((z, idx) => ({
      xCenter: (idx === 0 && data.suggested_view) ? data.suggested_view.xCenter : 0.0,
      yCenter: (idx === 0 && data.suggested_view) ? data.suggested_view.yCenter : 0.0,
      zoomX: z.zx,
      zoomY: z.zy
    }));
    viewsComp = components.map(() => Object.assign({}, viewOverlay));
  }

  updateEngineHUD('AST: READY', currentVar);
  updateStarStatus();
  renderActiveTab();
}

function rebuildComponentCards() {
  if (!compCardsContainer) return;
  compCardsContainer.innerHTML = '';
  const compLabel = t('compositeLegend');
  let legendHtml = `<span style="color:${getThemeColors()[0]};font-weight:bold;">${compLabel}</span> `;
  components.forEach((c, idx) => {
    const cColor = getThemeCompColors()[idx % getThemeCompColors().length];
    const compPrefix = t('componentLegendPrefix');
    legendHtml += `<span style="color:${cColor};margin-left:8px;">${compPrefix} u${idx+1}: ${c.str}</span>`;

    const card = document.createElement('div');
    card.className = 'panel-card';
    card.style.borderTop = `2px solid ${cColor}`;
    card.innerHTML = `
      <div class="panel-header">
        <span class="panel-formula" style="color: ${cColor};">u${idx+1}(${currentVar}) = ${c.str}</span>
        <span style="font-size:10px;color:#64748b;">${t('basisLabel')} ${idx+1}</span>
      </div>
      <div class="canvas-wrap">
        <canvas id="cvComp_${idx}" class="cv-comp"></canvas>
        <div class="mouse-tooltip" id="tipComp_${idx}"></div>
      </div>
    `;
    compCardsContainer.appendChild(card);

    const cv = card.querySelector('.cv-comp');
    resizeCanvas(cv);
    if (!viewsComp[idx]) viewsComp[idx] = Object.assign({}, viewOverlay);
    attachPanZoom(cv, () => viewsComp[idx], (v) => { viewsComp[idx] = v; }, renderSuperposition);
  });
  if (overlayLegend) overlayLegend.innerHTML = legendHtml;
}

async function pollState() {
  if (document.activeElement === exprInput) return;
  try {
    const res = await fetch('/api/state?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data.version !== lastKnownVersion) {
        lastKnownVersion = data.version;
        if (exprInput) exprInput.value = data.fn;
        applyState(data);
      }
    }
  } catch (e) {}
}

window.addEventListener('resize', resizeAll);
setInterval(pollState, 1500);

function switchMode(mode) {
  if (!mode) return;
  const tabMap = {
    'standard': 'tab-standard',
    'derivatives': 'tab-derivatives',
    'superposition': 'tab-superposition'
  };
  const targetId = tabMap[mode] || mode;
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetId}"]`);
  if (targetBtn) targetBtn.click();
}

// Bootstrap
const btnLangToggle = document.getElementById('btnLangToggle');
if (btnLangToggle) {
  btnLangToggle.addEventListener('click', () => {
    cycleLocale(() => {
      renderCategoryUI();
      rebuildComponentCards();
      renderActiveTab();
      updateThemeButtonText();
      updateStarStatus();
      updateAllTermElements();
    });
  });
}
applyI18nToDOM();
updateThemeButtonText();
initTheme(() => {
  rebuildComponentCards();
  renderActiveTab();
});

initTermGlossary();
initFavorites(submitFormula);
initAICopilot((newState) => {
  if (exprInput) exprInput.value = newState.fn;
  applyState(newState);
}, switchMode);

resizeAll();
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => {
    resizeAll();
  });
  const tabViews = document.getElementById('tabViews');
  if (tabViews) ro.observe(tabViews);
}
pollState();
