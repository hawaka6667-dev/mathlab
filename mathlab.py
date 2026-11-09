#!/usr/bin/env python3
"""
MathLab CLI Controller
Pushes formulas and derivative order toggles directly to http://localhost:8080/
"""

import sys
import json
import urllib.request
import argparse
from pathlib import Path

PORT = 8080
API_URL = f"http://127.0.0.1:{PORT}/api/plot"
STATE_FILE = Path(r"f:\antigravity\math\state.json")

def push(fn: str, orders=None):
    payload = {"fn": fn}
    if orders is not None:
        payload["orders"] = orders

    # 1. Try sending to local live server
    try:
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print(f"[MathLab Live] Successfully pushed to http://localhost:{PORT}/ : {payload}")
            return
    except Exception:
        pass

    # 2. Fallback to state.json
    s = {"fn": fn, "orders": orders or [0, 1, 2], "version": 1}
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                old = json.load(f)
                s["version"] = old.get("version", 0) + 1
        except Exception:
            pass
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(s, f, indent=2)
    print(f"[MathLab File] Saved to {STATE_FILE}: {payload}")

def main():
    parser = argparse.ArgumentParser(description="MathLab Fast Dispatcher")
    parser.add_argument("fn", type=str, help="Math expression e.g. '1/sqrt(x)'")
    parser.add_argument("-o", "--orders", nargs="+", type=int, default=None,
                        help="Orders to display, e.g. 0 1 2")
    args = parser.parse_args()
    push(args.fn, args.orders)

if __name__ == "__main__":
    main()
