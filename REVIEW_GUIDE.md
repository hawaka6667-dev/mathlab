# 📋 MathLab v1.4.2 晨间 Review 指南 (Morning Review Guide)

> **项目地址**: `F:\antigravity\math`  
> **本地服务**: [http://localhost:8080](http://localhost:8080) (双击 `Run_MathLab.bat` 亦可启动)  
> **GitHub Remote**: [https://github.com/hawaka6667-dev/mathlab](https://github.com/hawaka6667-dev/mathlab)  
> **最新发布 Tag**: [`v1.4.2-copilot-theme-locale`](https://github.com/hawaka6667-dev/mathlab/releases/tag/v1.4.2-copilot-theme-locale)

---

## 🎯 快速验收核心清单 (Checklist for Review)

### 1. 默认纯英文与双语平滑切换 (i18n & Default English)
- [ ] **冷启动缺省验证**: 首次或无缓存打开页面，顶部导航、公式占位符、操作按钮与图例均为纯地道 English：
  - 顶部按钮：`↵ Plot`, `☆ Bookmark`, `🤖 AI Copilot`, `📟 Console 0`, `📑 Bookmarks (13)`, `🎲 Roll Function`, `🎯 Reset All`。
  - 皮肤指示：`🎨 Deep Dark (Default)`。
  - 语言指示：`🌐 English (en)`。
- [ ] **双语无缝切换**: 点击右上角 `🌐 English (en)`，按 `en` $\to$ `zh` (纯中文) $\to$ `zh-en` (工程代码混用) $\to$ `en` 循环切换，检查有无任何残留未翻译词。

### 2. 微积分专业术语悬浮与原位互换 (Term Tooltip & Morphing)
- [ ] **双语互悬浮 (Cross Hover)**:
  - 在 `en` 模式下，鼠标悬停至 `Superposition` 或 `Derivatives Matrix`，浮层显示中文译名 `分量叠加` 与微积分物理释义。
  - 在 `zh` 模式下，鼠标悬停显示英文对照 `Superposition` / `Derivatives Matrix`。
- [ ] **原位点击互换 (Click-to-Swap)**:
  - 切换到 `zh-en` 模式，直接点击 `🧬 Superposition 叠加态` 或 `🔀 逐阶求导 Matrix`，观察中英文词位原位翻转。

### 3. NotebookLM 风格 AI Copilot 侧边栏全功能测试
- [ ] **自然语言操纵皮肤主题**:
  - 在 Copilot 对话框输入：`帮我把皮肤切换为纯黑OLED` $\to$ 观察画布与 UI 底色是否即刻变为 `#000000` 纯黑。
  - 输入：`切换到学术纸白主题` $\to$ 观察是否变为适合导出与投影的浅色纸白底色。
  - 输入：`换回默认深邃暗夜` $\to$ 恢复暗夜蓝灰底色。
- [ ] **自然语言操纵语言环境**:
  - 输入：`把界面语言切换为中文` $\to$ 界面按钮与图例即刻转为中文。
  - 输入：`Switch language to English` $\to$ 界面即刻切回纯英文。
- [ ] **微积分解析与工具调用**:
  - 点击快捷药丸 `✨ Taylor Series (O4)`、`🔍 Extrema & Inflection`、`📐 Find Asymptotes`，观察返回的解析过程与画布联动。

### 4. 浏览器侧边栏 / 窄屏自适应 (Sidebar Responsive Layout)
- [ ] 将浏览器窗口拉窄至侧边栏宽度（`< 768px` 或 `< 520px`）：
  - 顶部工具栏自动折行居左紧凑排列。
  - 公式输入框自适应撑满整行宽度。
  - 逐阶求导矩阵从 2 列自动折叠为 1 列纵向滚动流。
  - 画布自适应重绘，无横向滚动条溢出。

### 5. 全局 MCP 服务端验证 (Model Context Protocol)
- [ ] 检查配置文件：[`C:\Users\PC\.gemini\config\mcp_config.json`](file:///C:/Users/PC/.gemini/config/mcp_config.json)。
- [ ] 当前暴露工具集：
  - `mathlab_solve`: 0~5 阶符号导数求解
  - `mathlab_decompose`: 加性/谐波基底波包拆解
  - `mathlab_taylor`: 展开点 Taylor 多项式
  - `mathlab_critical`: 驻点极值与拐点
  - `mathlab_asymptotes`: 铅直奇点/水平/斜渐近线
  - `mathlab_get_workbench_state`: 抓取屏幕实时视窗与激活公式
  - `mathlab_set_workbench_formula`: 远程下发新公式绘制
  - `mathlab_set_term_density`: 调控术语展示密度
  - `mathlab_set_theme`: 远程切换皮肤 (`dark`, `oled`, `academic`, `solarized`)
  - `mathlab_set_locale`: 远程切换语言 (`en`, `zh`, `zh-en`)

---

## 📂 核心变动代码索引 (Source Index)

| 模块 / 路径 | 核心关注点 |
| :--- | :--- |
| [`js/i18n.js`](file:///f:/antigravity/math/js/i18n.js) | 全量 i18n 字典，缺省置为 `en`，双语轮转调度 |
| [`js/term_morpher.js`](file:///f:/antigravity/math/js/term_morpher.js) | 9 大微积分核心术语建模、悬浮气泡定位与点击原位翻转 |
| [`js/theme.js`](file:///f:/antigravity/math/js/theme.js) | 4 套主题色标定义、Canvas 调色板映射与语言联动 |
| [`js/ai_copilot.js`](file:///f:/antigravity/math/js/ai_copilot.js) | Copilot 接收 `set_theme`, `set_locale`, `set_term_density` 动作调度 |
| [`js/main.js`](file:///f:/antigravity/math/js/main.js) | `window.mathlabSetTheme` 与 `window.mathlabSetLocale` 暴露与图例动态渲染 |
| [`server.py`](file:///f:/antigravity/math/server.py) | Gemini 工具定义与本地规划器自然语言意图正则拦截器 |
| [`mcp_server.py`](file:///f:/antigravity/math/mcp_server.py) | 标准 JSON-RPC 2.0 stdio MCP 服务端与工具分发 |
| [`studio.html`](file:///f:/antigravity/math/studio.html) & [`index.html`](file:///f:/antigravity/math/index.html) | `data-i18n` 属性全覆盖与 GitHub Pages 静态自适应同步 |
| [`css/studio.css`](file:///f:/antigravity/math/css/studio.css) | 窄屏响应式媒介查询、毛玻璃悬浮气泡与点状下划线微动效 |
