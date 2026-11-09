#!/usr/bin/env python3
"""
MathLab Server on Port 8080 with Universal LaTeX, Unicode Superscripts, and Multi-Variable Engine
"""

import sys
import os
import re
import json
import math
import time
import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import sympy as sp
from sympy.printing.jscode import jscode
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

PORT = 8080
DOC_ROOT = Path(r"f:\antigravity\math")

transformations = standard_transformations + (implicit_multiplication_application,)

# Gemini API Session Key Store
gemini_session_key = os.environ.get("GEMINI_API_KEY", "")

def normalize_math_text(s: str):
    s = s.strip()
    var_override = None
    trace = []
    trace.append(f"Raw Input: '{s}'")
    
    # 0. Strip leading UI prompt prefixes like "Formula / LaTeX =" or "Formula ="
    s = re.sub(r'^(Formula\s*(/\s*LaTeX\s*)?[:=]\s*)', '', s, flags=re.IGNORECASE).strip()
    
    # 1. Detect function prefix: f(x) =, f(x) -, f(x):, y =, g(t) =, etc.
    # Note: On standard keyboards, '-' is adjacent to '=', leading to frequent mistypes like 'f(x) - expr'
    m_func_pref = re.match(r'^[a-zA-Z]\(([a-zA-Z0-9_])\)\s*[-=:~→]\s*', s)
    if m_func_pref:
        var_override = m_func_pref.group(1)
        s = re.sub(r'^[a-zA-Z]\(([a-zA-Z0-9_])\)\s*[-=:~→]\s*', '', s).strip()
        trace.append(f"Stripped Function Prefix -> Variable Override: '{var_override}', Remaining: '{s}'")
    else:
        m_var_pref = re.match(r'^[a-zA-Z]\s*=\s*', s)
        if m_var_pref:
            s = re.sub(r'^[a-zA-Z]\s*=\s*', '', s).strip()
            trace.append(f"Stripped 'y=' / 'f=' Prefix -> Remaining: '{s}'")

    # 2. Unicode superscripts translation (e.g. h⁻² -> h^(-2))
    superscript_map = str.maketrans({
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
        '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')'
    })
    s = re.sub(r'([a-zA-Z0-9_\)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+)', 
               lambda m: f'{m.group(1)}^({m.group(2).translate(superscript_map)})', s)

    # 3. LaTeX ^{...} -> ^(...)
    while '^{' in s:
        s = re.sub(r'\^\{([^{}]+)\}', r'^(\1)', s)
        
    # 4. Clean LaTeX syntax
    s = s.replace(r'\left', '').replace(r'\right', '')
    while r'\frac' in s:
        s = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', r'((\1)/(\2))', s)
    for fn in ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'ln', 'sqrt']:
        while f'\\{fn}{{' in s:
            s = re.sub(rf'\\{fn}\{{([^{{}}]+)\}}', rf'{fn}(\1)', s)
        s = re.sub(rf'\\{fn}\b', fn, s)
    s = s.replace(r'\cdot', '*').replace(r'\times', '*')
    s = s.replace('^', '**')
    trace.append(f"Normalized AST Expression: '{s}'")
    
    return s, var_override, trace

def parse_cond(c_str: str, x: sp.Symbol):
    c_str = c_str.strip().replace(r'\neq', '!=').replace(r'\le', '<=').replace(r'\ge', '>=').replace(r'\lt', '<').replace(r'\gt', '>')
    c_str = c_str.replace('^', '**')
    if '!=' in c_str:
        l, r = c_str.split('!=')
        return sp.Ne(parse_expr(l.strip()), parse_expr(r.strip()))
    if '==' in c_str:
        l, r = c_str.split('==')
        return sp.Eq(parse_expr(l.strip()), parse_expr(r.strip()))
    if '=' in c_str:
        l, r = c_str.split('=')
        return sp.Eq(parse_expr(l.strip()), parse_expr(r.strip()))
    if '<=' in c_str:
        l, r = c_str.split('<=')
        return sp.Le(parse_expr(l.strip()), parse_expr(r.strip()))
    if '>=' in c_str:
        l, r = c_str.split('>=')
        return sp.Ge(parse_expr(l.strip()), parse_expr(r.strip()))
    if '<' in c_str:
        l, r = c_str.split('<')
        return sp.Lt(parse_expr(l.strip()), parse_expr(r.strip()))
    if '>' in c_str:
        l, r = c_str.split('>')
        return sp.Gt(parse_expr(l.strip()), parse_expr(r.strip()))
    return True

def parse_any_math(raw: str):
    raw = raw.strip()
    raw_no_prefix, var_override, trace = normalize_math_text(raw)
    
    # Check if piecewise latex
    cases_match = re.search(r'\\begin\{cases\}([\s\S]*?)\\end\{cases\}', raw_no_prefix)
    if cases_match:
        content = cases_match.group(1).strip()
        rows = [r.strip() for r in content.split(r'\\') if r.strip()]
        pieces = []
        det_var = sp.Symbol(var_override if var_override else 'x')
        for r in rows:
            parts = [p.strip() for p in r.split('&')]
            if len(parts) >= 2:
                val_part, _, subtrace = normalize_math_text(parts[0].rstrip(','))
                cond_part = parts[1]
            else:
                val_part, _, subtrace = normalize_math_text(parts[0])
                cond_part = 'True'
            e = parse_expr(val_part, transformations=transformations)
            c = parse_cond(cond_part, det_var)
            pieces.append((e, c))
        trace.append(f"Piecewise detected: {len(pieces)} branches")
        return sp.Piecewise(*pieces), True, det_var, trace
    else:
        expr = parse_expr(raw_no_prefix, transformations=transformations)
        # If expression parsed with unwanted free symbols (e.g. user entered 'f' or 'y')
        free = expr.free_symbols
        if var_override:
            det_var = sp.Symbol(var_override)
        elif len(free) == 1:
            det_var = list(free)[0]
        elif sp.Symbol('x') in free:
            det_var = sp.Symbol('x')
        elif len(free) > 1:
            # Check if one symbol is 'f' or 'y' that was multiplied
            common_vars = [s for s in free if str(s) in ['x', 'h', 't', 'u', 'v', 'z']]
            if common_vars:
                det_var = common_vars[0]
            else:
                det_var = sorted(list(free), key=lambda s: str(s))[0]
        else:
            det_var = sp.Symbol('x')
        
        # If extra symbols like 'f' remain (e.g. from f*x when user had f(x) prefix with implicit mul)
        for s in list(free):
            if s != det_var and str(s) in ['f', 'y', 'g']:
                # Substitute dummy coefficient 1
                trace.append(f"Auto-resolved residual symbol '{s}' -> 1")
                expr = expr.subs(s, 1)

        trace.append(f"SymPy AST Parsed Successfully: {expr} (Primary Variable: {det_var})")
        return expr, False, det_var, trace

def compute_symbolic(expr_str: str):
    base_expr, is_piecewise, var, trace = parse_any_math(expr_str)
    var_name = str(var)
    canon_x = sp.Symbol('x')

    labels = [
        f"f({var_name})",
        f"f'({var_name})",
        f"f''({var_name})",
        f"f'''({var_name})",
        f"f⁽⁴⁾({var_name})",
        f"f⁽⁵⁾({var_name})"
    ]

    # Mathematical Properties (Parity & Discontinuity)
    parity = "非奇非偶"
    try:
        if base_expr.subs(var, -var) == base_expr:
            parity = "偶函数 (Even / 对称)"
        elif base_expr.subs(var, -var) == -base_expr:
            parity = "奇函数 (Odd / 反对称)"
    except Exception:
        pass
    trace.append(f"Parity: {parity}")

    formulas = []
    latex_list = []
    js_code_list = []
    zooms = []

    curr = base_expr
    for i in range(6):
        if i > 0:
            curr = sp.diff(curr, var)
        
        # Display Formula
        if is_piecewise and hasattr(curr, 'args') and isinstance(curr, sp.Piecewise):
            main_expr = curr.args[0][0]
            s_str = str(main_expr).replace('**', '^')
            formulas.append(f"{labels[i]} = {s_str}")
            latex_list.append(f"{labels[i]} = {sp.latex(curr)}")
        else:
            s_str = str(curr).replace('**', '^')
            formulas.append(f"{labels[i]} = {s_str}")
            latex_list.append(f"{labels[i]} = {sp.latex(curr)}")

        # JS Codegen normalized to variable 'x' for universal canvas rendering
        curr_in_x = curr.subs(var, canon_x)
        raw_js = jscode(curr_in_x)
        compact_js = ' '.join(raw_js.split())
        js_code_list.append(compact_js)

    # Detect Envelopes for Squeeze Theorem
    envelopes = None
    if base_expr.has(sp.sin(1/var)) or base_expr.has(sp.cos(1/var)):
        try:
            target = base_expr.args[0][0] if is_piecewise else base_expr
            up = target.subs({sp.sin(1/var): 1, sp.cos(1/var): 1})
            low = target.subs({sp.sin(1/var): -1, sp.cos(1/var): -1})
            envelopes = {
                "upper_js": ' '.join(jscode(up.subs(var, canon_x)).split()),
                "lower_js": ' '.join(jscode(low.subs(var, canon_x)).split()),
                "upper_str": f"y = {str(up).replace('**', '^')}",
                "lower_str": f"y = {str(low).replace('**', '^')}"
            }
            trace.append("Squeeze Theorem Envelope detected")
        except Exception:
            envelopes = None

    # Decompose into additive or multiplicative components
    comp_type = 'single'
    components = []
    try:
        target = base_expr.args[0][0] if is_piecewise else base_expr
        if target.is_Add:
            comp_type = 'additive'
            terms = target.as_ordered_terms()
        elif target.is_Mul:
            comp_type = 'multiplicative'
            terms = target.as_ordered_factors()
        else:
            terms = [target]
        for t in terms:
            s_str = str(t).replace('**', '^')
            js = jscode(t.subs(var, canon_x))
            components.append({'str': s_str, 'js': ' '.join(js.split())})
        trace.append(f"Component Decomposition ({comp_type}): {[c['str'] for c in components]}")
    except Exception as e:
        trace.append(f"Decomposition fallback: {e}")
        components = [{'str': str(base_expr).replace('**', '^'), 'js': js_code_list[0] if js_code_list else 'x'}]

    # Intelligent Viewport & Auto-Scale estimation
    suggested_view = {"xCenter": 0.0, "yCenter": 0.0, "zoomX": 45.0, "zoomY": 35.0}
    try:
        # Multi-scale sampling
        sample_pts = [0.02, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 20.0, 30.0]
        pos_vals = []
        for p in sample_pts:
            try:
                v = float(base_expr.subs(var, p).evalf())
                if math.isfinite(v):
                    pos_vals.append((p, v))
            except Exception:
                pass

        if pos_vals:
            ys = [v for _, v in pos_vals]
            max_y = max(ys)
            min_y = min(ys)
            trace.append(f"Domain Sampling Stats: y_min={min_y:.2f}, y_max={max_y:.2f}")

            if max_y < 0.1:  # Micro scale like x^2 sin(1/x)
                suggested_view = {"xCenter": 0.0, "yCenter": 0.0, "zoomX": 600.0, "zoomY": 2600.0}
                zooms = [
                    {"zx": 600.0, "zy": 2600.0},
                    {"zx": 600.0, "zy": 75.0},
                    {"zx": 600.0, "zy": 1.5},
                    {"zx": 600.0, "zy": 0.02},
                    {"zx": 600.0, "zy": 0.0003},
                    {"zx": 600.0, "zy": 0.000005}
                ]
            elif min_y > 200.0:  # High magnitude like x^2 + 4000/x (extrema around x=12.6, y=476)
                # Find point closest to min
                best_x, best_y = min(pos_vals, key=lambda pt: pt[1])
                suggested_view = {
                    "xCenter": float(best_x),
                    "yCenter": float(best_y),
                    "zoomX": 15.0,
                    "zoomY": 0.35
                }
                zooms = [
                    {"zx": 15.0, "zy": 0.35},
                    {"zx": 15.0, "zy": 5.0},
                    {"zx": 15.0, "zy": 20.0},
                    {"zx": 15.0, "zy": 1.0},
                    {"zx": 15.0, "zy": 0.1},
                    {"zx": 15.0, "zy": 0.01}
                ]
            elif max_y > 50.0:  # Rapidly growing or high magnitude like h^-2
                suggested_view = {"xCenter": 0.0, "yCenter": 2.5, "zoomX": 45.0, "zoomY": 25.0}
                zooms = [
                    {"zx": 45.0, "zy": 25.0},
                    {"zx": 45.0, "zy": 15.0},
                    {"zx": 45.0, "zy": 5.0},
                    {"zx": 45.0, "zy": 1.0},
                    {"zx": 45.0, "zy": 0.2},
                    {"zx": 45.0, "zy": 0.05}
                ]
            else:
                suggested_view = {"xCenter": 0.0, "yCenter": 0.0, "zoomX": 45.0, "zoomY": 35.0}
                zooms = [
                    {"zx": 45.0, "zy": 35.0},
                    {"zx": 45.0, "zy": 35.0},
                    {"zx": 45.0, "zy": 25.0},
                    {"zx": 45.0, "zy": 12.0},
                    {"zx": 45.0, "zy": 5.0},
                    {"zx": 45.0, "zy": 2.0}
                ]
        else:
            zooms = [{"zx": 45.0, "zy": 35.0} for _ in range(6)]
    except Exception as e:
        trace.append(f"Auto-scale estimation warning: {e}")
        zooms = [{"zx": 45.0, "zy": 35.0} for _ in range(6)]

    return {
        "fn": expr_str,
        "var": var_name,
        "parity": parity,
        "is_piecewise": is_piecewise,
        "comp_type": comp_type,
        "components": components,
        "formulas": formulas,
        "latex": latex_list,
        "js_code": js_code_list,
        "envelopes": envelopes,
        "zooms": zooms,
        "suggested_view": suggested_view,
        "pipeline_trace": trace,
        "version": 1
    }

server_logs = []

def log_event(level: str, category: str, message: str, meta: dict = None):
    entry = {
        "time": sys.version.split()[0], # timestamp or counter
        "level": level, # INFO, AST, WARN, ERROR
        "category": category, # PARSER, CODEGEN, RUNTIME, API
        "message": message,
        "meta": meta or {}
    }
    server_logs.append(entry)
    if len(server_logs) > 200:
        server_logs.pop(0)

# Gemini AI Copilot Integration
def load_favorites_data():
    fav_file = DOC_ROOT / "favorites.json"
    if not fav_file.exists():
        return {
            "version": "2.0",
            "categories": [{"id": "default", "name": {"zh": "基础常备", "en": "Default Basics", "zh_en": "基础 Basics"}, "items": []}]
        }
    try:
        data = json.loads(fav_file.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return {
                "version": "2.0",
                "categories": [
                    {"id": "default", "name": {"zh": "基础常备", "en": "Default Basics", "zh_en": "基础 Basics"}, "items": data}
                ]
            }
        return data
    except Exception:
        return {"version": "2.0", "categories": []}

def compute_taylor(formula_str: str, x0: float = 0.0, order: int = 4):
    base_expr, _, var, _ = parse_any_math(formula_str)
    x = sp.Symbol('x')
    sub_expr = base_expr.subs(var, x)
    t = sub_expr.series(x, x0, order + 1).removeO()
    return {
        "formula": formula_str,
        "x0": x0,
        "order": order,
        "taylor_expr": str(t),
        "latex": sp.latex(t)
    }

def compute_critical(formula_str: str):
    base_expr, _, var, _ = parse_any_math(formula_str)
    x = sp.Symbol('x')
    f = base_expr.subs(var, x)
    
    extrema = []
    try:
        fp = sp.diff(f, x)
        roots_fp = sp.solve(fp, x)
        for r in roots_fp:
            val_r = r.evalf()
            if val_r.is_real:
                val_x = float(val_r)
                val_y = float(f.subs(x, val_r).evalf())
                fpp_val = sp.diff(fp, x).subs(x, val_r).evalf()
                classification = "minimum" if fpp_val > 0 else ("maximum" if fpp_val < 0 else "stationary")
                extrema.append({"x": val_x, "y": val_y, "type": classification})
    except Exception:
        pass

    inflection = []
    try:
        fpp = sp.diff(f, x, 2)
        roots_fpp = sp.solve(fpp, x)
        for r in roots_fpp:
            val_r = r.evalf()
            if val_r.is_real:
                val_x = float(val_r)
                val_y = float(f.subs(x, val_r).evalf())
                inflection.append({"x": val_x, "y": val_y, "type": "inflection"})
    except Exception:
        pass

    return {
        "formula": formula_str,
        "extrema": extrema[:10],
        "inflection": inflection[:10]
    }

def compute_asymptotes(formula_str: str):
    base_expr, _, var, _ = parse_any_math(formula_str)
    x = sp.Symbol('x')
    f = base_expr.subs(var, x)
    res = []
    
    # Slant and horizontal
    try:
        m_pos = sp.limit(f/x, x, sp.oo)
        if m_pos.is_finite:
            b_pos = sp.limit(f - m_pos*x, x, sp.oo)
            if b_pos.is_finite:
                if m_pos == 0:
                    res.append({"type": "horizontal", "equation": f"y = {b_pos}", "latex": f"y = {sp.latex(b_pos)}", "direction": "+∞"})
                else:
                    slant_eq = m_pos * x + b_pos
                    res.append({"type": "slant", "equation": f"y = {m_pos}*x + {b_pos}", "latex": f"y = {sp.latex(slant_eq)}", "direction": "+∞"})
    except Exception:
        pass

    try:
        m_neg = sp.limit(f/x, x, -sp.oo)
        if m_neg.is_finite:
            b_neg = sp.limit(f - m_neg*x, x, -sp.oo)
            if b_neg.is_finite:
                slant_eq = m_neg * x + b_neg
                eq_str = f"y = {b_neg}" if m_neg == 0 else f"y = {m_neg}*x + {b_neg}"
                if not any(a.get("equation") == eq_str for a in res):
                    res.append({"type": "horizontal" if m_neg == 0 else "slant", "equation": eq_str, "latex": f"y = {sp.latex(slant_eq)}", "direction": "-∞"})
    except Exception:
        pass

    # Vertical asymptotes
    try:
        numer, denom = f.as_numer_denom()
        if denom != 1:
            roots = sp.solve(denom, x)
            for r in roots:
                val_r = r.evalf()
                if val_r.is_real:
                    res.append({"type": "vertical", "equation": f"x = {r}", "latex": f"x = {sp.latex(r)}"})
    except Exception:
        pass

    return {
        "formula": formula_str,
        "asymptotes": res
    }

def handle_ai_chat(message: str, history: list, api_key: str):
    global current_state, gemini_session_key
    key = api_key or gemini_session_key or os.environ.get("GEMINI_API_KEY", "")
    actions_taken = []
    active_mode = None

    def tool_plot(formula: str, mode: str = "superposition"):
        nonlocal active_mode
        global current_state
        active_mode = mode
        new_state = compute_symbolic(formula)
        new_state["version"] = current_state.get("version", 0) + 1
        current_state = new_state
        action = {
            "tool": "plot_function",
            "args": {"formula": formula, "mode": mode},
            "result": f"已成功绘制函数 {formula}，并切换至 {mode} 模态"
        }
        actions_taken.append(action)
        log_event("INFO", "AI_TOOL", f"AI plot_function: {formula} ({mode})")
        return action["result"]

    def tool_viewport(xCenter: float, yCenter: float, zoomX: float = 15.0, zoomY: float = 0.35):
        global current_state
        current_state["suggested_view"] = {
            "xCenter": float(xCenter),
            "yCenter": float(yCenter),
            "zoomX": float(zoomX),
            "zoomY": float(zoomY)
        }
        current_state["version"] = current_state.get("version", 0) + 1
        action = {
            "tool": "adjust_viewport",
            "args": {"xCenter": xCenter, "yCenter": yCenter, "zoomX": zoomX, "zoomY": zoomY},
            "result": f"视窗已聚焦至坐标 ({xCenter}, {yCenter})"
        }
        actions_taken.append(action)
        log_event("INFO", "AI_TOOL", f"AI adjust_viewport: ({xCenter}, {yCenter})")
        return action["result"]

    def tool_bookmark(formula: str, title: str):
        fav_file = DOC_ROOT / "favorites.json"
        favs = []
        if fav_file.exists():
            try: favs = json.loads(fav_file.read_text(encoding="utf-8"))
            except Exception: pass
        if not any(f.get("fn", "").strip() == formula.strip() for f in favs):
            favs.insert(0, {"id": f"fav-{len(favs)+1}", "fn": formula.strip(), "title": title.strip(), "createdAt": "2026-11-09"})
            fav_file.write_text(json.dumps(favs, indent=2, ensure_ascii=False), encoding="utf-8")
        action = {
            "tool": "bookmark_function",
            "args": {"formula": formula, "title": title},
            "result": f"已收藏函数: {title} ({formula})"
        }
        actions_taken.append(action)
        log_event("INFO", "AI_TOOL", f"AI bookmark_function: {formula}")
        return action["result"]

    def tool_density(density: str):
        if density not in ["compact", "dense", "bilingual"]:
            density = "bilingual"
        action = {
            "tool": "set_term_density",
            "args": {"density": density},
            "result": f"已将前端微积分术语密度切换至: {density}"
        }
        actions_taken.append(action)
        log_event("INFO", "AI_TOOL", f"AI set_term_density: {density}")
        return action["result"]

    def tool_theme(theme: str):
        if theme not in ["dark", "oled", "academic", "solarized"]:
            theme = "dark"
        action = {
            "tool": "set_theme",
            "args": {"theme": theme},
            "result": f"已将界面主题切换至: {theme}"
        }
        actions_taken.append(action)
        log_event("INFO", "AI_TOOL", f"AI set_theme: {theme}")
        return action["result"]

    def tool_locale(locale: str):
        if locale not in ["en", "zh", "zh-en"]:
            locale = "en"
        action = {
            "tool": "set_locale",
            "args": {"locale": locale},
            "result": f"已将界面语言切换至: {locale}"
        }
        actions_taken.append(action)
        log_event("INFO", "AI_TOOL", f"AI set_locale: {locale}")
        return action["result"]

    def tool_get_state():
        return {
            "formula": current_state.get("fn", ""),
            "derivatives": current_state.get("formulas", []),
            "parity": current_state.get("parity", ""),
            "components": [c.get("str") for c in current_state.get("components", [])],
            "viewport": current_state.get("suggested_view", {})
        }

    # 1. Attempt Gemini 3.8 Flash via google-genai SDK if key available
    if key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=key)
            system_prompt = (
                "You are MathLab Copilot, an expert applied mathematician and interactive math workbench assistant.\n"
                "You have real-time tools to control the MathLab canvas. You can plot calculus functions, adjust viewports "
                "to critical points (extrema, inflection points, asymptotes), decompose functions into Fourier/harmonic/additive components, "
                "and save bookmarks. Always invoke tools when user asks to plot, examine, or explore functions. "
                "Explain the analytical math intuition clearly using Markdown and LaTeX notation (e.g. $f(x) = x^2$)."
            )

            # Define functions for tool calling
            tools_list = [tool_plot, tool_viewport, tool_bookmark, tool_density, tool_theme, tool_locale, tool_get_state]
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=tools_list,
                temperature=0.2
            )

            # Build conversation history
            contents = []
            for h in (history or []):
                role = "user" if h.get("role") == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.get("content", ""))]))
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=contents,
                config=config
            )

            reply_text = response.text or ""
            # If function calls were generated, process any residual output
            if response.function_calls:
                for fc in response.function_calls:
                    fn_name = fc.name
                    fn_args = dict(fc.args) if fc.args else {}
                    if fn_name == "tool_plot" or fn_name == "plot_function":
                        tool_plot(fn_args.get("formula", ""), fn_args.get("mode", "superposition"))
                    elif fn_name == "tool_viewport" or fn_name == "adjust_viewport":
                        tool_viewport(fn_args.get("xCenter", 0), fn_args.get("yCenter", 0), fn_args.get("zoomX", 15), fn_args.get("zoomY", 0.35))
                    elif fn_name == "tool_bookmark" or fn_name == "bookmark_function":
                        tool_bookmark(fn_args.get("formula", ""), fn_args.get("title", "AI Bookmark"))
                    elif fn_name == "tool_theme" or fn_name == "set_theme":
                        tool_theme(fn_args.get("theme", "dark"))
                    elif fn_name == "tool_locale" or fn_name == "set_locale":
                        tool_locale(fn_args.get("locale", "en"))
                    elif fn_name == "tool_density" or fn_name == "set_term_density":
                        tool_density(fn_args.get("density", "bilingual"))

            if not reply_text:
                if actions_taken:
                    reply_text = f"已完成画布操作：{actions_taken[-1]['result']}。"
                else:
                    reply_text = "操作已就绪。"

            return {
                "reply": reply_text,
                "actions": actions_taken,
                "mode": active_mode,
                "state": current_state,
                "engine": "gemini-3.8-flash"
            }
        except Exception as e:
            log_event("WARN", "GEMINI_API", f"Gemini API invocation fallback: {e}")
            # Fall through to local heuristic planner

    # 2. Local Heuristic Planner (Instant Local Fallback when Key not configured or network issues)
    msg = message.strip()
    reply = ""

    # Check for plot requests
    m_plot = re.search(r'(?:画|绘制|看看|展示|plot|show|graph)\s*[:：=]?\s*([a-zA-Z0-9_\^\+\-\*/\(\)\\\{\}\s]+)', msg, re.I)
    m_mode_deriv = re.search(r'(求导|导数|阶导|derivative)', msg)
    m_mode_super = re.search(r'(分解|叠加|分量|superposition|harmonic|加性)', msg)
    m_bookmark = re.search(r'(收藏|bookmark|存一下)', msg)

    if m_plot:
        fn_candidate = m_plot.group(1).strip()
        # Clean trailing punctuation
        fn_candidate = re.sub(r'[，。！？\s]+$', '', fn_candidate)
        mode = "derivatives" if m_mode_deriv else ("superposition" if m_mode_super else "standard")
        res = tool_plot(fn_candidate, mode)
        reply = (
            f"🎯 已为您在 **{mode}** 模态下绘制函数：`${fn_candidate}$`。\n\n"
            f"- 分析：该函数已通过 SymPy 符号引擎求得 0~5 阶导数与基底分量，画布视窗已自动完成自适应对齐。"
        )
    elif m_mode_deriv:
        active_mode = "derivatives"
        reply = f"🔀 已为您切换至 **逐阶求导矩阵 (Derivatives Mode)**，展示当前函数 `${current_state.get('fn')}$` 的 0 至 5 阶解析导数。"
    elif m_mode_super:
        active_mode = "superposition"
        comps = [c['str'] for c in current_state.get('components', [])]
        reply = (
            f"🧬 已切换至 **分量叠加与分解 (Superposition Mode)**。\n"
            f"当前函数基底分量为：`{', '.join(comps)}`，左侧为实线合成波，右侧为独立基底卡片。"
        )
    elif m_bookmark:
        tool_bookmark(current_state.get('fn', 'x'), f"收藏函数 {current_state.get('fn', 'x')}")
        reply = f"⭐ 已将当前函数 `${current_state.get('fn')}$` 存入您的数学收藏夹。"
    elif re.search(r'(?:泰勒|taylor|展开)', msg, re.I):
        fn_curr = current_state.get('fn', 'x')
        t_res = compute_taylor(fn_curr, 0.0, 4)
        reply = (
            f"📐 **4阶麦克劳林/泰勒展开式 (Taylor Series, $x_0=0$)**:\n\n"
            f"- 原函数：`${fn_curr}$`\n"
            f"- 逼近多项式：`P₄(x) = {t_res['taylor_expr']}`\n"
            f"- LaTeX 形式：`${t_res['latex']}$`\n\n"
            f"> [!TIP]\n"
            f"> 泰勒展开在展开点近邻具备极高代数逼近精度，可用于局部非线性动力学线性化或数值近似。"
        )
    elif re.search(r'(?:极值|驻点|拐点|critical|extrema|inflection)', msg, re.I):
        fn_curr = current_state.get('fn', 'x')
        c_res = compute_critical(fn_curr)
        ext_list = c_res.get('extrema', [])
        inf_list = c_res.get('inflection', [])
        ext_desc = ', '.join([f"({round(p['x'], 3)}, {round(p['y'], 3)}) [{p['type']}]" for p in ext_list]) or "无实数驻点"
        inf_desc = ', '.join([f"({round(p['x'], 3)}, {round(p['y'], 3)})" for p in inf_list]) or "无实数拐点"
        reply = (
            f"🔍 **临界驻点与拐点微积分分析** (`{fn_curr}`):\n\n"
            f"- **一阶导零点 (极值点 $f'(x)=0$)**: {ext_desc}\n"
            f"- **二阶导零点 (凹凸拐点 $f''(x)=0$)**: {inf_desc}\n\n"
            f"> [!NOTE]\n"
            f"> 极值点处切线斜率为 0；拐点处曲线二阶导变号，凹凸凹凸性发生几何反转。"
        )
    elif re.search(r'(?:渐近线|asymptote)', msg, re.I):
        fn_curr = current_state.get('fn', 'x')
        a_res = compute_asymptotes(fn_curr)
        asymps = a_res.get('asymptotes', [])
        asymp_desc = '\n'.join([f"- **{a['type'].capitalize()} ({a.get('direction', 'pole')})**: `{a['equation']}` (`${a['latex']}$`)" for a in asymps]) if asymps else "未检测到标准水平/铅直/斜渐近线"
        reply = (
            f"📐 **渐近线几何探测 (Asymptotes Detection)** (`{fn_curr}`):\n\n"
            f"{asymp_desc}\n\n"
            f"> [!TIP]\n"
            f"> 铅直渐近线源于分母为 0 之代数奇点；水平与斜渐近线由 $x \\to \\pm\\infty$ 极限行为决定。"
        )
    elif re.search(r'(?:皮肤|主题|theme|skin|暗夜|纯黑|oled|学术|academic|深青|solarized)', msg, re.I):
        if re.search(r'(?:oled|纯黑|pitch)', msg, re.I):
            th = "oled"
            th_name = "Pitch Black (OLED)"
        elif re.search(r'(?:学术|academic|纸白|light|浅色)', msg, re.I):
            th = "academic"
            th_name = "Academic Paper (Light)"
        elif re.search(r'(?:深青|solarized)', msg, re.I):
            th = "solarized"
            th_name = "Solarized Dark"
        else:
            th = "dark"
            th_name = "Deep Dark (Default)"
        tool_theme(th)
        reply = (
            f"🎨 **UI 皮肤主题已动态切换为 `{th_name}`** (`{th}`)。\n\n"
            f"- Canvas 画布坐标轴、网格与曲线调色板已自适应重绘。\n"
            f"- 页面容器底色与毛玻璃浮层已同步刷新。"
        )
    elif re.search(r'(?:语言|language|locale|切为英文|切成英文|切为中文|切成中文|英语|english|中文|chinese|双语|混用|code-switching)', msg, re.I):
        if re.search(r'(?:zh-en|双语|混用|code-switching|混合)', msg, re.I):
            loc = "zh-en"
            loc_name = "Code-Switching (zh-en)"
        elif re.search(r'(?:中文|zh|chinese|汉语)', msg, re.I):
            loc = "zh"
            loc_name = "中文 (zh)"
        else:
            loc = "en"
            loc_name = "English (en)"
        tool_locale(loc)
        reply = (
            f"🌐 **界面本地化语言已切换为 `{loc_name}`** (`{loc}`)。\n\n"
            f"- 顶部工具栏、微积分矩阵标签、抽屉与控制台已全部同步更新。\n"
            f"- 动态图例与分量基底卡片已按目标语言就绪。"
        )
    elif re.search(r'(?:密度|density|中英对照|互换|切换术语)', msg, re.I):
        d_mode = "dense" if ("高密度" in msg or "中英对照" in msg) else ("compact" if ("紧凑" in msg or "精简" in msg) else "bilingual")
        tool_density(d_mode)
        reply = (
            f"🌐 **数学术语展示密度已调控为 `{d_mode}`**。\n\n"
            f"- 页面上核心微积分术语已按 `{d_mode}` 呈现。\n"
            f"- 鼠标悬停任意数学术语即可呼出中英对照悬浮气泡，在 `zh-en` 模式下点击术语可原位互换语言形态。"
        )
    else:
        reply = (
            f"👋 您好！我是 MathLab 内置协同助手。\n\n"
            f"您可以用自然语言与我交流，例如：\n"
            f"- *“帮我画 x^2 + 4000/x 并分解加性分量”*\n"
            f"- *“求导分析三次多项式 x^3 - 3*x”*\n"
            f"- *“画一个有可去奇点的 sinc 函数 sin(x)/x”*\n\n"
            f"> [!TIP]\n"
            f"> 您可随时点击右上角 **🔑** 填入您的 Gemini API Key，即可解锁完整多轮复杂数理推演能力。"
        )

    return {
        "reply": reply,
        "actions": actions_taken,
        "mode": active_mode,
        "state": current_state,
        "engine": "local-planner" if not key else "gemini-fallback"
    }

current_state = compute_symbolic(r"f(h) = h^{-2}")
log_event("INFO", "ENGINE", "MathLab Engine Initialized with f(h) = h^-2")

class MathLabHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOC_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.path = "/studio.html"
            return super().do_GET()
        elif self.path.startswith("/api/state"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(current_state).encode("utf-8"))
            return
        elif self.path.startswith("/api/favorites"):
            favs_data = load_favorites_data()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(favs_data).encode("utf-8"))
            return
        elif self.path.startswith("/api/logs"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(server_logs).encode("utf-8"))
            return
        elif self.path.startswith("/api/ai/config"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "hasKey": bool(gemini_session_key or os.environ.get("GEMINI_API_KEY")),
                "model": "gemini-3.8-flash"
            }).encode("utf-8"))
            return
        return super().do_GET()

    def do_POST(self):
        global current_state, server_logs, gemini_session_key
        if self.path == "/api/ai/config":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                new_key = data.get("apiKey", "").strip()
                if new_key:
                    gemini_session_key = new_key
                    log_event("INFO", "AI_CONFIG", "Gemini API Key configured successfully")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "hasKey": bool(gemini_session_key)}).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        if self.path == "/api/ai/chat":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                msg = data.get("message", "").strip()
                hist = data.get("history", [])
                api_k = data.get("apiKey", "").strip()
                if api_k:
                    gemini_session_key = api_k

                log_event("INFO", "AI_CHAT", f"User chat prompt: '{msg}'")
                ai_result = handle_ai_chat(msg, hist, gemini_session_key)

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(ai_result).encode("utf-8"))
                return
            except Exception as e:
                err_msg = str(e)
                log_event("ERROR", "AI_CHAT", f"AI chat exception: {err_msg}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": err_msg}).encode("utf-8"))
                return
        if self.path == "/api/logs/clear":
            server_logs = []
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "cleared"}).encode("utf-8"))
            return

        if self.path == "/api/favorites":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                fav_data = load_favorites_data()
                target_fn = data.get("fn", "").strip()
                target_cat = data.get("category", "default")
                action = data.get("action", "add")

                if action == "remove":
                    for cat in fav_data.get("categories", []):
                        cat["items"] = [item for item in cat.get("items", []) if item.get("fn", "").strip() != target_fn]
                    log_event("INFO", "FAVORITE", f"Removed bookmark '{target_fn}'")
                else:
                    new_item = {
                        "id": f"fav-{int(time.time()*1000)}",
                        "fn": target_fn,
                        "title": data.get("title", target_fn).strip(),
                        "createdAt": datetime.date.today().isoformat()
                    }
                    cat = next((c for c in fav_data.get("categories", []) if c.get("id") == target_cat), None)
                    if not cat:
                        cat = {"id": target_cat, "name": {"zh": target_cat, "en": target_cat, "zh_en": target_cat}, "items": []}
                        fav_data.setdefault("categories", []).append(cat)
                    if not any(item.get("fn", "").strip() == target_fn for item in cat.get("items", [])):
                        cat["items"].insert(0, new_item)
                        log_event("INFO", "FAVORITE", f"Added bookmark '{target_fn}' to '{target_cat}'")

                fav_file = DOC_ROOT / "favorites.json"
                fav_file.write_text(json.dumps(fav_data, indent=2, ensure_ascii=False), encoding="utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(fav_data).encode("utf-8"))
                return
            except Exception as e:
                log_event("ERROR", "FAVORITE", str(e))
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        if self.path == "/api/math/taylor":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                fn = str(data.get("formula", current_state.get("fn", "x"))).strip()
                x0 = float(data.get("x0", 0.0))
                order = int(data.get("order", 4))
                res = compute_taylor(fn, x0, order)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        if self.path == "/api/math/critical":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                fn = str(data.get("formula", current_state.get("fn", "x"))).strip()
                res = compute_critical(fn)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        if self.path == "/api/math/asymptotes":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                fn = str(data.get("formula", current_state.get("fn", "x"))).strip()
                res = compute_asymptotes(fn)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        if self.path == "/api/plot":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                fn = str(data.get("fn", current_state["fn"])).strip()
                log_event("INFO", "API", f"POST /api/plot payload: '{fn}'")

                new_state = compute_symbolic(fn)
                new_state["version"] = current_state.get("version", 0) + 1
                current_state = new_state
                for step in new_state.get("pipeline_trace", []):
                    log_event("AST", "SYMPY", step)
                log_event("INFO", "SOLVER", f"Solved successfully: {new_state['formulas'][0]} (comp_type={new_state['comp_type']})")

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(current_state).encode("utf-8"))
                return
            except Exception as e:
                err_msg = str(e)
                log_event("ERROR", "PARSER", f"Failed parsing formula '{fn}': {err_msg}")
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": err_msg}).encode("utf-8"))
                return

        self.send_response(404)
        self.end_headers()

def run():
    server = HTTPServer(("127.0.0.1", PORT), MathLabHandler)
    print(f"MathLab Engine Running on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    run()
