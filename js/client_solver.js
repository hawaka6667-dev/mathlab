/**
 * MathLab Client-Side Fallback Engine
 * Enables standalone offline / GitHub Pages static execution without Python backend.
 */

export function solveClientSide(rawFormula) {
  let s = rawFormula.trim();
  s = s.replace(/^[a-zA-Z]\(([a-zA-Z0-9_]+)\)\s*[-=:~→]\s*/, '');
  s = s.replace(/^(?:[yY]|Formula|formula)\s*[-=:~→]\s*/, '');
  s = s.replace(/^\$\s*|\s*\$$/g, '');
  
  // Transform LaTeX
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');
  s = s.replace(/\\(?:sin|cos|tan|cot|sec|csc|exp|ln|log|sqrt)/g, (m) => m.slice(1));
  s = s.replace(/\^/g, '**');

  // Convert to JS Math methods
  let jsExpr = s
    .replace(/\b(sin|cos|tan|exp|log|sqrt|abs|sinh|cosh|tanh|asin|acos|atan)\b/g, 'Math.$1')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E');

  let f0;
  try {
    f0 = new Function('x', `try { return (${jsExpr}); } catch(e) { return NaN; }`);
    // Test point
    f0(1.0);
  } catch (e) {
    throw new Error(`Client syntax error: ${e.message}`);
  }

  // Numerical differentiation via central difference
  const h = 1e-4;
  const f1 = (x) => (f0(x + h) - f0(x - h)) / (2 * h);
  const f2 = (x) => (f0(x + h) - 2 * f0(x) + f0(x - h)) / (h * h);
  const f3 = (x) => (f2(x + h) - f2(x - h)) / (2 * h);
  const f4 = (x) => (f2(x + h) - 2 * f2(x) + f2(x - h)) / (h * h);
  const f5 = (x) => (f4(x + h) - f4(x - h)) / (2 * h);

  // Parity detection
  let parity = "非奇非偶 (Neither)";
  try {
    const testPoints = [0.5, 1.2, 2.5, 4.0];
    let isEven = true;
    let isOdd = true;
    for (const xp of testPoints) {
      const pos = f0(xp);
      const neg = f0(-xp);
      if (isNaN(pos) || isNaN(neg)) continue;
      if (Math.abs(pos - neg) > 1e-3) isEven = false;
      if (Math.abs(pos + neg) > 1e-3) isOdd = false;
    }
    if (isEven) parity = "偶函数 (Even Function)";
    else if (isOdd) parity = "奇函数 (Odd Function)";
  } catch (e) {}

  // Basic additive term splitting
  const rawTerms = s.split(/(?=[+-])/).map(t => t.trim()).filter(Boolean);
  const components = rawTerms.map((t) => {
    let tJs = t.replace(/\b(sin|cos|tan|exp|log|sqrt|abs)\b/g, 'Math.$1')
               .replace(/\bpi\b/gi, 'Math.PI')
               .replace(/\be\b/g, 'Math.E');
    return {
      str: t,
      js: tJs,
      fn: new Function('x', `try { return (${tJs}); } catch(e) { return NaN; }`)
    };
  });

  return {
    fn: rawFormula,
    var: 'x',
    parity,
    formulas: [
      s,
      `d/dx (${s}) [数值导数]`,
      `d²/dx² (${s}) [数值导数]`,
      `d³/dx³ (${s}) [数值导数]`,
      `d⁴/dx⁴ (${s}) [数值导数]`,
      `d⁵/dx⁵ (${s}) [数值导数]`
    ],
    js_code: [
      jsExpr,
      `(${f1.toString()})(x)`,
      `(${f2.toString()})(x)`,
      `(${f3.toString()})(x)`,
      `(${f4.toString()})(x)`,
      `(${f5.toString()})(x)`
    ],
    components,
    comp_type: components.length > 1 ? "additive_superposition" : "single",
    suggested_view: { xCenter: 0.0, yCenter: 0.0, zoomX: 45.0, zoomY: 35.0 },
    zooms: [
      { zx: 45, zy: 35 },
      { zx: 45, zy: 35 },
      { zx: 45, zy: 35 },
      { zx: 45, zy: 35 },
      { zx: 45, zy: 35 },
      { zx: 45, zy: 35 }
    ]
  };
}
