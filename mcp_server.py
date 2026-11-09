#!/usr/bin/env python3
"""
MathLab Model Context Protocol (MCP) Server
Standard stdio JSON-RPC 2.0 implementation.
Exposes symbolic calculus, term decomposition, sample plotting, and workbench synchronization tools.
"""

import sys
import os
import json
import urllib.request
import urllib.error
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor)
LOCAL_API_URL = "http://127.0.0.1:8080"

def clean_formula_input(raw: str) -> str:
    s = raw.strip()
    import re
    s = re.sub(r'^[a-zA-Z]\(([a-zA-Z0-9_]+)\)\s*[-=:~→]\s*', '', s)
    s = re.sub(r'^(?:[yY]|Formula|formula)\s*[-=:~→]\s*', '', s)
    s = re.sub(r'^\$\s*|\s*\$$', '', s)
    s = s.replace('^', '**')
    s = re.sub(r'\\(?:sin|cos|tan|cot|sec|csc|exp|ln|log|sqrt|arcsin|arccos|arctan)', lambda m: m.group(0)[1:], s)
    s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', s)
    return s.strip()

def solve_math(formula_str: str, max_order: int = 5):
    expr_str = clean_formula_input(formula_str)
    x = sp.Symbol('x', real=True)
    f = parse_expr(expr_str, local_dict={'x': x, 'e': sp.E, 'pi': sp.pi, 'E': sp.E, 'pi': sp.pi}, transformations=TRANSFORMS)
    
    derivatives = []
    curr = f
    for o in range(1, max_order + 1):
        curr = sp.diff(curr, x)
        derivatives.append({
            "order": o,
            "expr": str(curr),
            "latex": sp.latex(curr)
        })
        
    # Critical points (f'(x) = 0)
    critical_points = []
    try:
        f_prime = sp.diff(f, x)
        roots = sp.solve(f_prime, x)
        for r in roots:
            if r.is_real:
                try:
                    val_x = float(r.evalf())
                    val_y = float(f.subs(x, r).evalf())
                    critical_points.append({"x": val_x, "y": val_y, "type": "critical"})
                except Exception:
                    pass
    except Exception:
        pass

    return {
        "raw_formula": formula_str,
        "parsed_expr": str(f),
        "latex": sp.latex(f),
        "derivatives": derivatives,
        "critical_points": critical_points[:10]
    }

def decompose_math(formula_str: str):
    expr_str = clean_formula_input(formula_str)
    x = sp.Symbol('x', real=True)
    f = parse_expr(expr_str, local_dict={'x': x, 'e': sp.E, 'pi': sp.pi}, transformations=TRANSFORMS)
    expanded = sp.expand(f)
    
    terms = sp.Add.make_args(expanded)
    components = []
    for t in terms:
        t_type = "other"
        if t.is_polynomial(x):
            deg = sp.degree(t, gen=x)
            t_type = "constant" if deg == 0 else ("linear" if deg == 1 else "polynomial")
        elif t.has(sp.sin) or t.has(sp.cos) or t.has(sp.tan):
            t_type = "harmonic"
        elif t.has(sp.exp):
            t_type = "exponential"
        elif t.has(sp.log):
            t_type = "logarithmic"
        elif any(arg.has(1/x) or (arg.is_Pow and arg.exp.is_negative) for arg in sp.preorder_traversal(t)):
            t_type = "asymptotic_singularity"
            
        components.append({
            "term": str(t),
            "latex": sp.latex(t),
            "type": t_type
        })
        
    return {
        "formula": formula_str,
        "term_count": len(components),
        "components": components
    }

def get_live_state():
    try:
        req = urllib.request.Request(f"{LOCAL_API_URL}/api/state")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        # Fallback to local state.json file if server is not responding
        state_file = os.path.join(os.path.dirname(__file__), "state.json")
        if os.path.exists(state_file):
            with open(state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"status": "offline", "message": "MathLab local server is not running on port 8080"}

def set_live_formula(formula: str):
    try:
        payload = json.dumps({"formula": formula}).encode('utf-8')
        req = urllib.request.Request(f"{LOCAL_API_URL}/api/state", data=payload, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {"status": "error", "message": f"Could not sync with local server: {e}"}

def compute_taylor(formula_str: str, x0: float = 0.0, order: int = 4):
    expr_str = clean_formula_input(formula_str)
    x = sp.Symbol('x')
    f = parse_expr(expr_str, local_dict={'x': x, 'e': sp.E, 'pi': sp.pi, 'E': sp.E}, transformations=TRANSFORMS)
    t = f.series(x, x0, order + 1).removeO()
    return {
        "formula": formula_str,
        "x0": x0,
        "order": order,
        "taylor_expr": str(t),
        "latex": sp.latex(t)
    }

def compute_critical(formula_str: str):
    expr_str = clean_formula_input(formula_str)
    x = sp.Symbol('x')
    f = parse_expr(expr_str, local_dict={'x': x, 'e': sp.E, 'pi': sp.pi, 'E': sp.E}, transformations=TRANSFORMS)
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
    expr_str = clean_formula_input(formula_str)
    x = sp.Symbol('x')
    f = parse_expr(expr_str, local_dict={'x': x, 'e': sp.E, 'pi': sp.pi, 'E': sp.E}, transformations=TRANSFORMS)
    res = []
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

# List of Tools exposed via MCP
TOOLS = [
    {
        "name": "mathlab_solve",
        "description": "Symbolically differentiate a mathematical function up to 5th order, find critical points, and export LaTeX formulas.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "formula": {
                    "type": "string",
                    "description": "The math expression (e.g. 'x^2 + 4000/x', 'sin(x)*cos(2*x)', 'e^(-0.2*x)*sin(2*x)')"
                },
                "max_order": {
                    "type": "integer",
                    "description": "Maximum derivative order (default: 5)",
                    "default": 5
                }
            },
            "required": ["formula"]
        }
    },
    {
        "name": "mathlab_decompose",
        "description": "Decompose a mathematical superposition into independent physical/algebraic components (polynomial, harmonic, exponential, asymptotic singularity).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "formula": {
                    "type": "string",
                    "description": "The function to decompose into constituent terms."
                }
            },
            "required": ["formula"]
        }
    },
    {
        "name": "mathlab_get_workbench_state",
        "description": "Read the active state (active formula, view coordinates, active derivative order, diagnostics) of the local MathLab Studio instance.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "mathlab_taylor",
        "description": "Compute Taylor series expansion around x0 up to order n for a mathematical expression.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "formula": {
                    "type": "string",
                    "description": "The math expression (e.g. 'sin(x)', 'exp(x)', 'cos(x)')"
                },
                "x0": {
                    "type": "number",
                    "description": "Expansion point x0 (default: 0.0)",
                    "default": 0.0
                },
                "order": {
                    "type": "integer",
                    "description": "Degree of Taylor polynomial (default: 4)",
                    "default": 4
                }
            },
            "required": ["formula"]
        }
    },
    {
        "name": "mathlab_critical",
        "description": "Compute exact real critical points (local extrema) and inflection points (concavity changes) of a function.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "formula": {
                    "type": "string",
                    "description": "The math expression (e.g. 'x^3 - 3*x', 'x^2 + 4000/x')"
                }
            },
            "required": ["formula"]
        }
    },
    {
        "name": "mathlab_asymptotes",
        "description": "Find all horizontal, vertical (poles), and slant (oblique) asymptotes of a function.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "formula": {
                    "type": "string",
                    "description": "The math expression (e.g. 'x + 1/x', '1/(x^2 - 1)')"
                }
            },
            "required": ["formula"]
        }
    },
    {
        "name": "mathlab_set_workbench_formula",
        "description": "Remotely update the active formula of the live MathLab Studio workbench on the user's screen.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "formula": {
                    "type": "string",
                    "description": "New formula to display and analyze in MathLab Studio."
                }
            },
            "required": ["formula"]
        }
    }
]

def send_response(response_dict):
    body = json.dumps(response_dict)
    sys.stdout.write(body + "\n")
    sys.stdout.flush()

def handle_request(req):
    msg_id = req.get("id")
    method = req.get("method")
    params = req.get("params", {})

    if method == "initialize":
        send_response({
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "mathlab-mcp-server",
                    "version": "1.0.0"
                }
            }
        })
    elif method == "notifications/initialized":
        pass  # Client confirmed initialization
    elif method == "tools/list":
        send_response({
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "tools": TOOLS
            }
        })
    elif method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})
        try:
            if tool_name == "mathlab_solve":
                res = solve_math(args["formula"], args.get("max_order", 5))
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            elif tool_name == "mathlab_decompose":
                res = decompose_math(args["formula"])
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            elif tool_name == "mathlab_get_workbench_state":
                res = get_live_state()
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            elif tool_name == "mathlab_taylor":
                res = compute_taylor(args["formula"], args.get("x0", 0.0), args.get("order", 4))
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            elif tool_name == "mathlab_critical":
                res = compute_critical(args["formula"])
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            elif tool_name == "mathlab_asymptotes":
                res = compute_asymptotes(args["formula"])
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            elif tool_name == "mathlab_set_workbench_formula":
                res = set_live_formula(args["formula"])
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}]
                    }
                })
            else:
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32601, "message": f"Method {tool_name} not found"}
                })
        except Exception as e:
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "isError": True,
                    "content": [{"type": "text", "text": f"Error executing {tool_name}: {str(e)}"}]
                }
            })
    elif method == "ping":
        send_response({"jsonrpc": "2.0", "id": msg_id, "result": {}})
    else:
        if msg_id is not None:
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": -32601, "message": f"Unsupported method: {method}"}
            })

def main():
    # Force UTF-8 for stdio
    if hasattr(sys.stdin, 'reconfigure'):
        sys.stdin.reconfigure(encoding='utf-8')
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            handle_request(req)
        except Exception as e:
            sys.stderr.write(f"MCP server error parsing line: {e}\n")
            sys.stderr.flush()

if __name__ == "__main__":
    main()
