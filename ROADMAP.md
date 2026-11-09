# MathLab Engineering Roadmap & Feature Specs

## 1. Global MCP Server Integration (`mcp_server.py`)
- **Objective**: Expose MathLab calculation & state manipulation as a standard Model Context Protocol (MCP) server.
- **Global Config**: Registered in `C:\Users\PC\.gemini\config\mcp_config.json` under `mcpServers.mathlab`.
- **Target Tools**:
  - `mathlab_solve`: Compute symbolic derivatives (order 0-5), critical points, and LaTeX expressions.
  - `mathlab_decompose`: Extract additive, harmonic, and asymptotic components.
  - `mathlab_plot`: Generate curve sample points and suggested viewport parameters.
  - `mathlab_get_state` / `mathlab_set_state`: Synchronize active workbench formula and view with running instance.

## 2. Hierarchical Favorites (Two-Level Categories)
- **Objective**: Replace flat favorite array with classified folder structures.
- **Default Taxonomies**:
  - `default` (基础常备 / Default)
  - `textbook` (教材经典: 如极值驻点、凹凸拐点、渐近线典型例题)
  - `geometry` (几何与物理: 摆线、悬链线、阻尼振荡、驻波)
  - `singularity` (奇点与高频振荡: 类似 $\sin(1/x)$, $x^2 \sin(1/x)$, 狄利克雷近似)
- **Schema**:
  ```json
  {
    "categories": [
      {
        "id": "textbook",
        "name": { "zh": "教材精选", "en": "Textbook Classics" },
        "items": [...]
      }
    ]
  }
  ```

## 3. i18n & Terminology Management (`js/i18n.js`)
- **Objective**: Dynamic locale switching across UI elements, HUD logs, and Copilot labels.
- **Supported Modes**:
  - `zh`: 简体中文 (本地化常用术语)
  - `en`: English (International Standard Mathematical Terms)
  - `zh-en`: High-density Code-Switching (工程师/科研混合语境，如 "1阶 Derivative 导数", "Critical Extrema 极值点")

## 4. One-Click Realtime Launcher (`Run_MathLab.bat`)
- **Objective**: Fast Windows desktop launcher with automatic environment detection.
- **Functionality**:
  - Checks if port 8080 is occupied; starts `server.py` in background if idle.
  - Automatically pops default browser to `http://localhost:8080/`.
  - Silent/minimal window footprint.

## 5. Expanded Copilot Analysis APIs
- **Objective**: Provide granular endpoints for external and internal LLM agents.
  - `/api/math/taylor`: Taylor series expansion around $x_0$.
  - `/api/math/critical`: Root finding for $f'(x) = 0$ (extrema) and $f''(x) = 0$ (inflection).
  - `/api/math/asymptotes`: Slant, horizontal, and vertical asymptote solver.

## 6. GitHub Pages Deployment
- **Objective**: Serverless static web deployment on GitHub Pages.
- **Architecture**:
  - Pure static bundle (`index.html`, `css/`, `js/`).
  - Fallback client-side calculus engine (e.g. `mathjs` / numeric differentiation) when offline/standalone, with optional user-supplied Gemini API key for cloud features.
