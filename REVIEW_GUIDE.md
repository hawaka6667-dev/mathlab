# 📋 MathLab v1.4.5 晨间 Review 指南 (Morning Review Guide)

> **项目地址**: [f:/antigravity/math](file:///f:/antigravity/math)  
> **本地服务**: [http://127.0.0.1:8080](http://127.0.0.1:8080) (双击 `Run_MathLab.bat` 亦可启动)  
> **GitHub Remote**: [https://github.com/hawaka6667-dev/mathlab](https://github.com/hawaka6667-dev/mathlab)  
> **最新发布 Tag**: [`v1.4.5-math-intuition-tooltips`](https://github.com/hawaka6667-dev/mathlab/releases/tag/v1.4.5-math-intuition-tooltips)

## 🎯 快速验收核心清单 (Checklist for Review)

### 1. 严格双模语言切换与全屏同步 (Dual-Mode i18n & Zero Inversion)
- [ ] **默认地道纯英文 (English Default)**:
  - 顶部导航标签：`🧬 Superposition`、`🔀 Derivatives Matrix`、`📈 Standard Single Plot`。
  - 操作按钮：`↵ Plot`、`☆ Bookmark`、`🤖 AI Copilot`、`📟 Console 0`、`📑 Bookmarks (13)`、`🎲 Roll Function`、`🎯 Reset All`。
  - 皮肤指示：`🎨 Deep Dark (Default)`。
  - 语言按钮：`🌐 English (en)`。
  - 曲线图例：`— Composite f(x) ·· Component u1: ...`。
- [ ] **一键双模平滑切换 (en ↔ zh)**:
  - 点击 `🌐 English (en)` 即刻全量翻转为中文 `🌐 中文 (zh)`：
    - 导航标签：`🧬 分量叠加`、`🔀 逐阶求导`、`📈 基础单图`。
    - 按钮：`↵ 绘制`、`☆ 收藏`、`🤖 AI 伴侣`、`📟 控制台 0`、`📑 收藏夹`、`🎲 随机摇函数`、`🎯 居中重置`。
  - **绝无中英文倒置**：彻底消除标签是中文而按钮是英文（或反之）的异步解耦 bug。

### 2. 微积分数学内涵悬浮 Tooltip (Pure Mathematical Intuition HUD)
- [ ] **节约字数，直击数学本质**:
  - 悬浮于 `Superposition` / `分量叠加`：显示领域标签 `Decomposition` / `基底解构`、解析公式 `$f(x) = \sum u_i(x)$` 及微积分物理意义。
  - 悬浮于 `Derivatives Matrix` / `逐阶求导`：显示动力学标签 `Calculus Dynamics`、公式 `$f'(x) \sim f^{(5)}(x) = d^n y / dx^n$` 及切线/曲率动力学含义。
  - 悬浮于 `Standard Single Plot` / `基础单图`：显示 `$y = f(x)$` 与视口连续追踪探测含义。
  - 悬浮于 AI Copilot 药丸 `Taylor Series`、`Extrema & Inflection`、`Find Asymptotes`：分别呈现对应微积分极限与多项式逼近定义。
- [ ] **零翻译噪音**: 剔除冗余双语互译头与“Hover Translation”操作提示，高密度交付数学信息。
- [ ] **零点击劫持**: 点击标签按钮专注文档视图切换，绝不修改标签文字或劫持点击。

### 3. 浏览器侧边栏 / 窄屏响应式 (Sidebar Responsive Layout)
- [ ] 将浏览器窗口拉至侧边栏宽度（`< 768px` 或 `< 520px`）：
  - Row 1: `MathLab :8080` + 导航标签栏紧凑居左。
  - Row 2: 公式输入框与 `↵ Plot`、`☆ Bookmark` 100% 满宽呈现。
  - Row 3: `🤖 AI Copilot`、`📟 Console`、`📑 Bookmarks`、主题与语言切换按钮紧凑环绕，无溢出遮挡。

### 4. NotebookLM 风格 AI Copilot 协同联动
- [ ] 在 Copilot 对话框输入自然语言：
  - `切换到学术纸白主题` $\to$ 画布与背景即刻切为 `#ffffff` 浅色学术底色。
  - `把界面语言切换为中文` $\to$ 页面所有组件即刻转为中文。
  - `计算当前函数的4阶泰勒展开式` $\to$ Copilot 计算并同步调度视口。
