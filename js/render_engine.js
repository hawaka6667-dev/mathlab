/**
 * MathLab High-Performance Canvas Rendering Engine
 */

export const colors = ['#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#f43f5e', '#6366f1'];
export const compColors = ['#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6'];

let draggingTarget = null;
let dragStart = { x: 0, y: 0 };

export function resizeCanvas(cv) {
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  cv.width = rect.width * dpr;
  cv.height = rect.height * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

export function toScreen(cv, v, x, y) {
  const rect = cv.getBoundingClientRect();
  return {
    x: rect.width / 2 + (x - v.xCenter) * v.zoomX,
    y: rect.height / 2 - (y - v.yCenter) * v.zoomY
  };
}

export function toMath(cv, v, sx, sy) {
  const rect = cv.getBoundingClientRect();
  return {
    x: v.xCenter + (sx - rect.width / 2) / v.zoomX,
    y: v.yCenter - (sy - rect.height / 2) / v.zoomY
  };
}

export function calcNiceStep(span) {
  if (span <= 0 || !isFinite(span)) return 1;
  const exp = Math.floor(Math.log10(span));
  const frac = span / Math.pow(10, exp);
  let nice = 1;
  if (frac >= 5) nice = 5;
  else if (frac >= 2) nice = 2;
  else nice = 1;
  return nice * Math.pow(10, exp);
}

export function buildPolylines(cv, v, fn) {
  const rect = cv.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  function getPoint(sx) {
    const mx = toMath(cv, v, sx, 0).x;
    let my;
    try { my = fn(mx); } catch (e) { my = NaN; }
    if (my === null || isNaN(my) || !isFinite(my)) {
      return { mx, my: null, sx, sy: null };
    }
    const s = toScreen(cv, v, mx, my);
    return { mx, my, sx: s.x, sy: s.y };
  }

  function subdivide(p1, p2, depth) {
    if (depth >= 9) return [p2];
    const dx = Math.abs(p2.sx - p1.sx);
    const dy = Math.abs(p2.sy - p1.sy);
    if ((p1.my > 0 && p2.my < 0) || (p1.my < 0 && p2.my > 0)) {
      if (dy > H * 0.85) return [];
    }
    if (dy > 1.5 || dx > 2.0) {
      const midSx = (p1.sx + p2.sx) / 2.0;
      const midP = getPoint(midSx);
      if (midP.my !== null) {
        return subdivide(p1, midP, depth + 1).concat(subdivide(midP, p2, depth + 1));
      }
    }
    return [p2];
  }

  const polylines = [];
  let currentPoly = [];
  const N = Math.min(800, Math.ceil(W * 2.0));
  const step = (W + 40) / N;

  for (let i = 0; i <= N; i++) {
    const sx = -20 + i * step;
    const p = getPoint(sx);
    if (p.my !== null) {
      if (currentPoly.length === 0) {
        currentPoly.push(p);
      } else {
        const lastP = currentPoly[currentPoly.length - 1];
        if ((lastP.my > 0 && p.my < 0) || (lastP.my < 0 && p.my > 0)) {
          if (Math.abs(p.sy - lastP.sy) > H * 0.85) {
            polylines.push(currentPoly);
            currentPoly = [p];
            continue;
          }
        }
        const subPts = subdivide(lastP, p, 0);
        for (let j = 0; j < subPts.length; j++) currentPoly.push(subPts[j]);
      }
    } else {
      if (currentPoly.length > 0) {
        polylines.push(currentPoly);
        currentPoly = [];
      }
    }
  }
  if (currentPoly.length > 0) polylines.push(currentPoly);
  return polylines;
}

export function drawGridAndAxes(cv, ctx, v) {
  const rect = cv.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  ctx.clearRect(0, 0, W, H);

  const mathMin = toMath(cv, v, 0, H);
  const mathMax = toMath(cv, v, W, 0);
  const origin = toScreen(cv, v, 0, 0);

  // Grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  const rawSpanX = 60 / v.zoomX;
  const stepX = calcNiceStep(rawSpanX);
  const rawSpanY = 60 / v.zoomY;
  const stepY = calcNiceStep(rawSpanY);

  const xStart = Math.floor(mathMin.x / stepX) * stepX;
  for (let x = xStart; x <= mathMax.x; x += stepX) {
    const sx = toScreen(cv, v, x, 0).x;
    ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
  }
  const yStart = Math.floor(mathMin.y / stepY) * stepY;
  for (let y = yStart; y <= mathMax.y; y += stepY) {
    const sy = toScreen(cv, v, 0, y).y;
    ctx.moveTo(0, sy); ctx.lineTo(W, sy);
  }
  ctx.stroke();

  // Axes
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, origin.y); ctx.lineTo(W, origin.y);
  ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, H);
  ctx.stroke();

  // Ticks
  ctx.fillStyle = '#64748b';
  ctx.font = '9px monospace';
  const precisionX = stepX < 0.01 ? 4 : (stepX < 1 ? 2 : 1);
  const precisionY = stepY < 0.01 ? 4 : (stepY < 1 ? 2 : 1);

  for (let x = xStart; x <= mathMax.x; x += stepX) {
    if (Math.abs(x) < 1e-7) continue;
    const sx = toScreen(cv, v, x, 0).x;
    if (sx >= 10 && sx <= W - 15) {
      ctx.fillText(Number(x.toFixed(precisionX)), sx - 5, Math.min(H - 4, Math.max(12, origin.y + 11)));
    }
  }
  for (let y = yStart; y <= mathMax.y; y += stepY) {
    if (Math.abs(y) < 1e-7) continue;
    const sy = toScreen(cv, v, 0, y).y;
    if (sy >= 12 && sy <= H - 6) {
      ctx.fillText(Number(y.toFixed(precisionY)), Math.min(W - 32, Math.max(4, origin.x - 28)), sy + 3);
    }
  }
  ctx.fillText('0', origin.x - 9, origin.y + 11);
}

export function renderCurve(cv, ctx, v, fn, color, lineWidth = 2.0, lineDash = []) {
  if (!fn) return;
  const polylines = buildPolylines(cv, v, fn);
  const rect = cv.getBoundingClientRect();
  const H = rect.height;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (lineDash.length) ctx.setLineDash(lineDash);

  polylines.forEach(poly => {
    if (poly.length === 0) return;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const cSy = Math.max(-50, Math.min(H + 50, p.sy));
      const cSx = p.sx;
      if (!started) {
        ctx.moveTo(cSx, cSy);
        started = true;
      } else {
        ctx.lineTo(cSx, cSy);
      }
    }
    ctx.stroke();
  });
  ctx.restore();
}

export function attachPanZoom(cv, getView, setView, onUpdate) {
  cv.addEventListener('mousedown', (e) => {
    draggingTarget = { cv, getView, setView, onUpdate };
    dragStart = { x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = cv.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const v = getView();

    const mathBefore = toMath(cv, v, mouseX, mouseY);
    const factor = e.deltaY < 0 ? 1.15 : 0.87;

    v.zoomX *= factor;
    v.zoomY *= factor;
    v.xCenter = mathBefore.x - (mouseX - rect.width / 2) / v.zoomX;
    v.yCenter = mathBefore.y + (mouseY - rect.height / 2) / v.zoomY;

    setView(v);
    onUpdate();
  }, { passive: false });
}

window.addEventListener('mouseup', () => {
  draggingTarget = null;
});

window.addEventListener('mousemove', (e) => {
  if (draggingTarget) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const v = draggingTarget.getView();
    v.xCenter -= dx / v.zoomX;
    v.yCenter += dy / v.zoomY;
    dragStart = { x: e.clientX, y: e.clientY };
    draggingTarget.setView(v);
    draggingTarget.onUpdate();
  }
});
