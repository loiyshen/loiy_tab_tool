# 芦艺标签页分组工具 - 产品需求文档（实现对齐版）

版本：1.2
适用范围：Chrome 桌面端（Manifest V3，Side Panel）

1. 背景与目标
- 目的：在浏览器标签页数量增长的情况下，按用户配置的“域名 → 分组名称/颜色”规则，自动将匹配的标签页加入对应分组，降低信息切换成本，保持工作区整洁。
- 形态：采用 Side Panel 作为主要交互界面，避免传统 Popup 的尺寸受限与会话中断问题。
- 目标用户：研究/学习、开发/设计、信息密集型工作场景的用户，以及希望提升浏览效率的普适人群。

2. 关键价值与范围
- 关键价值：自动化、即时的分组整理；简单直观的规则配置；多设备同步（Chrome 登录同一账号）。
- 范围（本版本）：
  - 规则管理：添加、编辑、删除，立即生效并同步存储。
  - 自动分组：标签页加载完成后触发；匹配首条命中的规则，创建或加入分组并设置名称与颜色。
  - 颜色策略：仅支持 Chrome 预设 tab group 颜色。
  - 侧边栏：可在约 320–600px 宽度内适配，无控件溢出或遮挡。
  - 规则数据导入/导出
  - 预设规则模板导入

3. 用户体验与交互流程
3.1 规则管理（Side Panel）
- 输入项：
  - 域名 Domain（示例：google.com）
  - 分组名称 Group Name
  - 分组颜色 Group Color（预设：grey, blue, red, yellow, green, pink, purple, cyan）
- 操作按钮：
  - 添加：创建新规则；若域名重复则提示并阻止。
  - 编辑：将现有规则载入输入区，显示“更新/取消”并隐藏“添加”。
  - 更新：保存修改，立即生效并写入存储；禁止与其他项域名重复。
  - 取消：退出编辑状态，恢复输入区与按钮状态。
- 列表呈现：
  - 每条规则以分组颜色为背景，文本颜色为 #333333（保持可读性）。
  - 左侧展示 groupName 与 domain，右侧为 编辑/删除 按钮。
- 实时保存：
  - 添加/更新/删除操作均立即写入 chrome.storage.sync。
- 适配与布局：
  - Side Panel 默认采用自适应宽度：width: 100%，min-width: 320px，max-width: 600px。
  - 所有输入与下拉控件宽度为 100%，box-sizing: border-box，避免极窄面板下溢出。

3.2 自动后台分组（背景服务）
- 触发时机：chrome.tabs.onUpdated，当标签页状态为 complete 时触发。仅处理 http/https 协议页面。
- 核心流程：
  1) 解析当前标签页 URL，获取 hostname（域名）。
  2) 从 chrome.storage.sync 读取所有规则（groups）。
  3) 使用域名匹配策略（见 4.1）查找首条命中的规则。
  4) 查询当前窗口现有分组：若存在同名分组则将标签加入；否则新建分组并设置标题与预设颜色。
- 容错与降级：
  - URL 解析与整体流程以 try/catch 包裹，异常时安全退出并在控制台输出警告。
  - 颜色校验：若规则颜色不在预设内，安全降级为 'grey'。

4. 规则与约束
4.1 域名匹配策略（已实现）
- 统一小写、去除域名前导点后比较。
- 匹配规则：主域或点边界的任意多级子域。
  - 命中：'google.com' 匹配 'google.com'、'mail.google.com'、'a.b.google.com'
  - 不命中：'notgoogle.com'、'google.com.hk'（不同 TLD）
- 形式化定义：
  - const h = hostname.toLowerCase()
  - const r = ruleDomain.trim().toLowerCase().replace(/^\.+/, '')
  - 命中当且仅当 h === r 或 h.endsWith('.' + r)

4.2 颜色策略
- 仅支持 Chrome 预设 tab group 颜色名称：grey, blue, red, yellow, green, pink, purple, cyan。
- 前端渲染以名称映射 HEX（shared/colors.js）；后台仅接受并校验颜色“名称”，非法值降级为 'grey'。

4.3 数据结构与存储
- 存储键：{ groups: Array<GroupRule> }
- GroupRule：
  - domain: string（小写域名）
  - groupName: string
  - color: 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan'
- 持久化位置：chrome.storage.sync（可跨设备同步，需登录同一 Google 账号）
- 写入时机：添加/更新/删除后立即写入；加载 Side Panel 时读取初始化。

5. 技术方案
5.1 清单与权限（public/manifest.json）
- Manifest V3
- permissions: ["storage","tabs","tabGroups","sidePanel"]
- side_panel.default_path: sidepanel/index.html
- background.service_worker: background/index.js
- minimum_chrome_version: "114"
- action.default_title: “打开侧边栏”
- 图标：icons/icon16/32/48/128.png

5.2 前后端代码组织
- src/sidepanel：index.html / index.js / styles.css
- src/background：index.js（Service Worker）
- src/shared：colors.js（UMD 暴露，前后端共享）
- 构建：npm run build → dist/（scripts/build.js 简单复制，无打包）
- 加载：开发时加载 dist/manifest.json

5.3 关键实现要点
- Side Panel UI
  - 表单输入、预设颜色下拉
  - 列表项：背景为预设色（HEX），文字 #333333，左信息右按钮布局
  - 输入框与下拉宽度 100%，box-sizing: border-box；按钮最小宽 72px
- 即时持久化
  - 任一变更后调用 persistGroups() 写入 chrome.storage.sync
  - 初始化时 loadGroups() 恢复列表
- 自动分组逻辑
  - 仅处理 http/https；其余协议直接忽略
  - 通过 title 匹配当前窗口中同名分组；存在则 group，否则创建并 tabGroups.update
- 颜色校验与降级
  - 后台 isValidChromeColor(name) 校验名称；非法值统一降级 'grey'

6. 异常处理与边界
- URL 解析失败：catch 后跳过处理
- 异步 API 失败：try/catch 包裹大段流程，控制台警告，不影响后续事件
- 规则冲突：添加/更新时阻止重复域名（除当前编辑项）
- 极窄面板：通过自适应与 box-sizing 避免控件溢出；推荐最小宽度 320px

7. 安全与合规
- 最小权限原则：仅 storage、tabs、tabGroups、sidePanel
- 不注入外部脚本与远端资源，遵循 MV3 默认 CSP
- 不存储敏感数据；规则仅包含域名、名称与预设颜色

8. 文案与国际化（可选）
- 当前内置中文文案；如后续需要，采用 _locales/ 与 chrome.i18n 进行多语言支持

9. 非功能性需求
- 可维护性：前后端共享颜色工具；代码模块化，目录清晰；报告与 PRD 归档至 docs/
- 性能：事件驱动，只有在 complete 状态才执行；按首条命中规则即停止遍历
- 兼容性：Chrome 114+；Side Panel API 需要较新版本

10. 测试与验收要点
- UI 测试：
  - 添加、编辑、删除规则后列表与存储一致
  - 域名重复时提示并阻止
  - 极窄面板（≈320px）不出现溢出
- 功能测试：
  - 域名匹配：主域与多级子域命中；不同 TLD/前缀不命中
  - 自动分组：已存在组 → 加入；无则创建并设置名称+颜色
  - 协议守护：chrome://、file:// 等不处理
- 回归点：
  - 颜色名称校验与 'grey' 降级
  - 即时持久化（刷新 Side Panel 后规则仍在）

11. 未来规划（非本版本承诺）
- 规则导入/导出（JSON）
- IDN/punycode 归一化支持
- 构建系统升级（ESM/打包/Tree-shaking）与 CI（lint/test/build/zip）
- i18n 多语言

附录 A：预设颜色名 → HEX（UI 渲染）
- grey: #DADCE0
- blue: #8AB4F8
- red: #F28B82
- yellow: #FCD174
- green: #81C995
- pink: #FDA5CB
- purple: #D3A0FF
- cyan: #80D8D0

附录 B：示例数据结构
{
  "groups": [
    { "domain": "google.com", "groupName": "Google", "color": "blue" },
    { "domain": "github.com", "groupName": "GitHub", "color": "purple" }
  ]
}
