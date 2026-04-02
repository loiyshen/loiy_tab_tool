# 芦艺标签页分组工具 - 开发与维护指南

## 1. 概述
本项目是一个基于 Chrome Extension Manifest V3 规范的自动标签页分组工具（Loiy Tab Tool）。工具利用 Chrome Side Panel 提供了便捷的标签页规则管理功能，并在后台实现了基于“域名 -> 分组”规则的自动分组体验。

## 2. 架构设计

### 2.1 目录结构
```text
loiy_tab_tool/
├── dist/                # 构建输出目录（直接加载到 Chrome 的扩展目录）
├── docs/                # 产品与开发文档（PRD、开发指南等）
├── icons/               # 扩展图标资源
├── public/              # 静态资源与构建配置文件
│   └── manifest.json    # Chrome 扩展配置文件
├── scripts/             # 构建脚本
│   └── build.js         # 自定义 node 构建脚本
└── src/                 # 核心源代码
    ├── background/      # 后台服务工作线程（Service Worker）
    │   └── index.js     # 负责监听标签页变化并执行自动分组
    ├── example/         # 示例模板配置
    │   └── basic.json   # 基础的导入模板
    ├── shared/          # 前后端共享逻辑
    │   └── colors.js    # 颜色校验与映射工具
    └── sidepanel/       # 侧边栏用户视口（UI）
        ├── index.html   # UI 结构
        ├── index.css    # 样式配置
        └── index.js     # 交互逻辑、与 storage 交互、导入/导出和获取域名逻辑
```

### 2.2 核心机制
本项目没有使用复杂的前端框架，采用原生 HTML/CSS/JavaScript 开发，以此保证扩展的轻量化和高性能执行。
数据状态基于 `chrome.storage.sync`，确保用户设置的规则可以在 Chrome 登录同步的情况下实现跨设备同步。

## 3. 开发环境与构建

### 3.1 环境要求
- **Node.js** >= 18
- **包管理器**: npm / yarn
- **开发工具**: Chrome 浏览器 114+ (需要支持 Side Panel API)

### 3.2 运行与构建
项目采用了自定义的 Node 复制脚本进行构建，以保证扩展文件原样输出到 `dist`。
- **构建命令**: `npm run build`
- **打包为压缩包**: `npm run zip`

在开发期间，执行 build 后，只需在 `chrome://extensions` 开启开发者模式并加载 `dist` 目录。如果有修改代码只需重新构建并在扩展包页面点击“刷新”即可，无需重启浏览器。

## 4. 核心逻辑解析

### 4.1 自动分组机制 (`src/background/index.js`)
- **触发器**: 注册 `chrome.tabs.onUpdated`，监控 tab 状态变化。仅在 `status === 'complete'` 时触发，且排除 `chrome://` 等非 http(s) 的页面。
- **匹配与执行**: 提取对应 tab 的可注册域名或主域名（通过 host 解析）。依次比对用户存储在 `chrome.storage.sync` 中的 rules。当规则命中时，使用 `chrome.tabs.group` 将该 tab 置入已有对应 title 的分组中，若无则创建新分组并配置 title 和预设颜色。

### 4.2 UI 状态与事件 (`src/sidepanel/index.js`)
- **表单隐藏与切换**: 侧边栏主要包含“添加/编辑规则”、“导入/导出规则”等模式，它们被置于同一个文档流，通过简单的 `display: none / block` 或类似 class 切换来实现面板变换。
- **实时刷新与保存**: 在修改任意规则（添加、更新、删除）之后，调用 storage set 然后立刻刷新 UI 的规则列表，保证“所见即所得”。
- **获取当前域名**:
  1. 通过 `chrome.tabs.query({ active: true, currentWindow: true })` 拿到当前活动页。
  2. 提取 URL 的 eTLD+1，抛弃 `www/wwwn` 前缀及无效部分。
  3. 将取到的域名填充回输入框。如果有错误或解析失败，利用系统的 Toast 输出提示。

### 4.3 全局 Toast 提示组件
为了保持侧边栏的交互友好，所有表单结果、导入导出报告、获取域名结果及错误提示统一使用定制的 Toast 组件：
- 包括四种级别：`success`、`info`、`warning`、`error`。
- API：暴露如 `showToast({ type, text, timeout })` 供调用。
- 处理多个异常或并行提示时，通过重叠或队列处理以保证不漏报错（尤其是警告和错误类型持续时间会相比信息类型更长，约 4s）。

### 4.4 数据导入与导出
- **导出**: 直接读取 Storage `groups` 节点数据，转成 JSON blob 对象并通过 `<a>` 标签模拟下载。不支持附带自定义脚本文档。
- **导入与模板**: 提供 `FileReader` 解析 JSON 文件或读取 `dist/example/basic.json`（模板）。导入时按照**同域名即覆盖修改，不同域名即追加**的策略执行去重合并操作，遇到非法颜色如不在允许范围的会被优雅降级为 `grey`。

## 5. 代码规范与约定
1. **中文说明优先**: Git comments 与代码块注释使用中文，关键的方法头应该增加简明注释。
2. **避免外部依赖**: UI 和数据处理严格使用原生能力，减少潜在安全问题及不必要的尺寸影响。
3. **安全规范**: 绝不使用 `eval` 及内联的危险权限。文件解析操作保持“只读数据”原则，不对 JSON 做预期以外的 DOM 拼接以防止 XSS。
4. **统一命名风格**: JavaScript 使用 camelCase，CSS 类名采用小写中划线连接形式 (kebab-case)。
