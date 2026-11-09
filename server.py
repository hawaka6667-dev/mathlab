#!/usr/bin/env python3
"""
MathLab Server on Port 8080 with Universal LaTeX, Unicode Superscripts, and Multi-Variable Engine
"""

import sys
import re
import json
import math
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import sympy as sp
from sympy.printing.jscode import jscode
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

PORT = 8080
DOC_ROOT = Path(r"f:\antigravity\math")

transformations = standard_transformations + (implicit_multiplication_application,)

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
            fav_file = DOC_ROOT / "favorites.json"
            favs = []
            if fav_file.exists():
                try:
                    favs = json.loads(fav_file.read_text(encoding="utf-8"))
                except Exception:
                    pass
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(favs).encode("utf-8"))
            return
        elif self.path.startswith("/api/logs"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(server_logs).encode("utf-8"))
            return
        return super().do_GET()

    def do_POST(self):
        global current_state, server_logs
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
                fav_file = DOC_ROOT / "favorites.json"
                favs = []
                if fav_file.exists():
                    try:
                        favs = json.loads(fav_file.read_text(encoding="utf-8"))
                    except Exception:
                        pass
                
                # Check if remove action
                if data.get("action") == "remove":
                    target_fn = data.get("fn", "").strip()
                    favs = [f for f in favs if f.get("fn", "").strip() != target_fn]
                    log_event("INFO", "FAVORITE", f"Removed bookmark '{target_fn}'")
                else:
                    # Add
                    new_item = {
                        "id": f"fav-{len(favs) + 1}",
                        "fn": data.get("fn", "").strip(),
                        "title": data.get("title", data.get("fn", "")).strip(),
                        "createdAt": "2026-11-09"
                    }
                    if not any(f.get("fn", "").strip() == new_item["fn"] for f in favs):
                        favs.insert(0, new_item)
                        log_event("INFO", "FAVORITE", f"Added bookmark '{new_item['fn']}'")

                fav_file.write_text(json.dumps(favs, indent=2, ensure_ascii=False), encoding="utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(favs).encode("utf-8"))
                return
            except Exception as e:
                log_event("ERROR", "FAVORITE", str(e))
                self.send_response(500)
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
