# MathLab Studio (微积分与符号分析工坊)

> **Dynamic Symbolic Calculus, Higher-Order Derivatives, Superposition Decomposition, and NotebookLM-style AI Copilot Sidecar.**  
> 基于 SymPy 符号代数引擎与纯原生 Canvas 高性能渲染的微积分分析与可视化工作台。

---

## 🌟 Key Features (核心特性)

1. **逐阶求导矩阵 (Derivatives Matrix 0~5th Order)**:
   - 符号引擎一次性解析输出原函数至 5 阶解析导数。
   - 6 格独立高频自适应 Canvas 画布，支持独立视口平移与滚轮缩放 (Pan & Zoom)。
2. **加性与谐波分量叠加 (Superposition & Decomposition)**:
   - 自动拆解多项式、傅里叶波包、振荡项与负分数幂渐近项。
   - 左侧主画布展示虚线独立分量与实线合成曲线，右侧流式展开独立基底分量卡片。
3. **NotebookLM 风格 Gemini AI 伴侣 (Copilot Sidecar)**:
   - 内置 Gemini 3.8 Flash 协同智能体，支持工具调用操纵画布 (`plot_function`, `adjust_viewport`, `bookmark_function`, `taylor_series`, `find_critical_points`, `find_asymptotes`)。
   - 零配置即开即用：无 Key 时无缝回退至本地启发式数学规划器。
4. **分类层级收藏夹 (Hierarchical Favorites v2.0)**:
   - 二级分类架构：`基础常备` (Basics)、`教材精选` (Textbook Classics)、`几何与物理` (Geometry & Waves)、`奇点与振荡` (Singularities)。
   - 支持实时置顶、同步保存至本地持久化文件与浏览器缓存。
5. **多语言管理与术语定制 (i18n & Terminology)**:
   - 针对工程师与科研场景定制三语模态：`zh` (纯中文)、`en` (纯英文)、`zh-en` (高密度专业代码混用，如 *1阶 Derivative 导数*, *Critical Extrema 极值*)。
6. **专业皮肤设计与夜间模式 (Themes & Night Mode Default)**:
   - **深邃暗夜 (Dark - 默认)**: 高对比度护眼暗色，深蓝灰基板 + 荧光青/翡翠绿/霓虹紫曲线。
   - **极致纯黑 (OLED)**: 纯黑 `#000000` 底色，适合 OLED 屏幕超高对比度与极限节能。
   - **学术纸白 (Academic Light)**: 仿学术论文浅色纸底，搭配墨青坐标轴与高对比深色曲线，适合论文导出与投影。
   - **科研深青 (Solarized Dark)**: 经典科学计算深青 `#002b36` 基底，搭载低疲劳色标。
7. **GitHub Pages 纯静态双模自适应**:
   - 部署于 GitHub Pages 静态环境时，自动激活前端数值微分引擎 (`client_solver.js`)，零后端运行微积分曲线探索。
8. **微积分术语悬浮对照与原位互换 (Interactive Term Morphing & Density Control)**:
   - **交互悬浮翻译**: 鼠标悬浮专业微积分术语时展示双语对照浮层（`zh` 模式展示对应地道英文术语，`en` 模式展示中文标准译名，并配有极简微积分物理意义释义）。
   - **原位点击互换 (Click-to-Swap)**: 在 `zh-en` 混用与双语模式下，点击术语可原位即时切换中/英主客次序。
   - **Copilot & MCP 密度调控**: 对外暴露 `window.mathlabSetTermDensity` 与 MCP 工具 `mathlab_set_term_density`，支持 AI 伴侣根据用户习惯远程或指令动态调整页面术语紧凑度 (`compact` / `dense` / `bilingual`)。

---

## 🔌 Global MCP Server (Model Context Protocol 全局服务)

MathLab 原生提供符合标准 JSON-RPC 2.0 stdio 协议的 **MCP 服务端** (`mcp_server.py`)。Antigravity、Claude Desktop、Cursor 等任意兼容 MCP 的 AI 智能体均可将其作为全局外部工具直接调用。

### 1. 全局配置方式 (Configuration)

#### 在 Google Antigravity 中配置
在 `C:\Users\PC\.gemini\config\mcp_config.json` 的 `mcpServers` 中追加：
```json
{
  "mcpServers": {
    "mathlab": {
      "command": "python",
      "args": [
        "F:\\antigravity\\math\\mcp_server.py"
      ]
    }
  }
}
```

#### 在 Claude Desktop 中配置
在 `%APPDATA%\Claude\claude_desktop_config.json` 中配置：
```json
{
  "mcpServers": {
    "mathlab": {
      "command": "python",
      "args": [
        "F:\\antigravity\\math\\mcp_server.py"
      ]
    }
  }
}
```

### 2. 暴露的 MCP 工具列表 (Exposed Tools)

| 工具名称 (Tool) | 参数 (Inputs) | 描述 (Description) |
| :--- | :--- | :--- |
| `mathlab_solve` | `formula` (string), `max_order` (int) | 计算函数 0~5 阶精确符号导数、驻点极值并输出 LaTeX。 |
| `mathlab_decompose` | `formula` (string) | 将复合函数拆解为独立物理/代数基底分量 (基波、谐波、渐近项)。 |
| `mathlab_taylor` | `formula` (string), `x0` (float), `order` (int) | 求解函数在指定点 $x_0$ 处的 $n$ 阶泰勒/麦克劳林展开多项式。 |
| `mathlab_critical` | `formula` (string) | 求解一阶导为 0 的驻点/极值与二阶导变号的拐点坐标。 |
| `mathlab_asymptotes` | `formula` (string) | 探测函数的全部水平、垂直奇点与斜渐近线 ($y = mx + b$)。 |
| `mathlab_get_workbench_state` | *none* | 读取当前屏幕上运行中的 MathLab 画布视窗与当前激活公式。 |
| `mathlab_set_workbench_formula` | `formula` (string) | 远程操纵并更新用户当前屏幕上的 MathLab 绘制公式。 |
| `mathlab_set_term_density` | `density` (string) | 动态调控前端微积分术语展示密度 ('compact', 'dense', 'bilingual')。 |
| `mathlab_set_theme` | `theme` (string) | 远程切换 UI 皮肤主题 ('dark', 'oled', 'academic', 'solarized')。 |
| `mathlab_set_locale` | `locale` (string) | 远程切换界面国际化语言 ('en', 'zh', 'zh-en')。 |

---

## 🚀 运行与启动 (Running MathLab)

### 方式 1：Windows 桌面一键启动 (推荐)
直接双击运行根目录下的脚本：
```cmd
Run_MathLab.bat
```
*自检 8080 端口，若未启动则在后台静默启动 `server.py`，并自动唤起默认浏览器访问 `http://localhost:8080/`。*

### 方式 2：Python 命令行启动
```bash
python server.py
```
终端输出：
```text
MathLab Engine Running on http://127.0.0.1:8080
```
在浏览器中打开 `http://localhost:8080/` 即可进入工作台。

---

## 📡 REST API 端点 (Backend Endpoints)

- `GET /api/state`: 获取当前微积分求解状态（公式、导数、奇偶性、分量、推荐视口）。
- `POST /api/plot`: 提交新公式求解，Body: `{"fn": "x^2 + 4000/x"}`。
- `GET /api/favorites`: 读取两级分类收藏夹。
- `POST /api/favorites`: 添加或删除收藏项，Body: `{"fn": "...", "category": "textbook", "action": "add"}`。
- `POST /api/math/taylor`: 泰勒多项式展开，Body: `{"formula": "sin(x)", "x0": 0, "order": 4}`。
- `POST /api/math/critical`: 驻点与极值求解，Body: `{"formula": "x^3 - 3*x"}`。
- `POST /api/math/asymptotes`: 渐近线探测，Body: `{"formula": "x + 1/x"}`。
- `POST /api/ai/chat`: 与 Gemini Copilot 协同交互，支持双向工具操纵。

---

## 🏗️ 架构与关注点分离 (Separation of Concerns)

```text
mathlab/
├── index.html / studio.html   # 纯语义化 HTML 骨架结构
├── css/
│   └── studio.css             # 高对比度暗色主题、Grid 矩阵、抽屉式面板与 Copilot UI
├── js/
│   ├── main.js                # 应用主控制器与状态轮询调度
│   ├── render_engine.js       # 纯原生 Canvas 视口缩放、网格计算与平滑曲线离散化
│   ├── hud_logger.js          # In-app 诊断控制台 (按 ~ 呼出，捕获 AST 步骤与系统事件)
│   ├── favorites.js           # 二级层级收藏夹交互与本地持久化
│   ├── ai_copilot.js          # NotebookLM 风格 Copilot 侧边栏与 Action 药丸渲染
│   ├── client_solver.js       # GitHub Pages 离线纯前端数值微积分自适应引擎
│   ├── i18n.js                # zh / en / zh-en 术语定制与动态多语言切换
│   ├── theme.js               # 皮肤系统与夜间模式 (Dark 默认 / OLED / Academic / Solarized)
│   └── term_morpher.js        # 交互式术语悬浮对照、原位互换与密度调控
├── server.py                  # Python 高性能后端 (SymPy 符号求解、微积分分析与 Gemini 调度)
├── mcp_server.py              # 全局 stdio JSON-RPC MCP 服务端
├── favorites.json             # 经典函数分析题库 (基础、教材、几何物理、奇点)
├── Run_MathLab.bat            # Windows 一键自检运行脚本
└── .github/workflows/deploy.yml # GitHub Pages 自动部署流程
```

---

## 📄 License & Attribution

- **License**: MIT
- **Author**: Antigravity & User Pair-Programming System
- **Repository**: [https://github.com/hawaka6667-dev/mathlab](https://github.com/hawaka6667-dev/mathlab)
