# 芦艺标签页分组工具 - 产品需求文档（实现对齐版）

版本：1.3
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
  - 规则数据导入/导出（新增）
  - 预设规则模板导入（新增）
  - 获取当前页面域名并填充规则表单（新增）


3. 用户体验与交互流程
3.1 规则管理（Side Panel）
- 输入项：Domain（示例 google.com）、Group Name、Group Color（grey, blue, red, yellow, green, pink, purple, cyan）
- 约束：域名最大 64 个字符；分组名称最大 24 个字符（超出则阻止提交并提示）
- 操作按钮：获取域名 / 添加 / 更新 / 取消（编辑态）
- 列表呈现：每条规则以预设色为背景、文本色 #333333；左信息（groupName、domain）、右按钮（编辑/删除）
- 实时保存：任一变更立即写入 chrome.storage.sync；加载时读取初始化
- 适配与布局：width: 100%，min-width: 320px，max-width: 600px；输入/下拉 100% 宽，box-sizing: border-box

3.2 自动后台分组（背景服务）
- 触发：chrome.tabs.onUpdated 且 status === 'complete'，仅处理 http/https
- 流程：解析 hostname → 读取 groups → 按 4.1 策略找首条命中 → 查询当前窗口分组 → 已有同名 → 加入；否则创建并设置标题与颜色
- 容错：全流程 try/catch，异常时安全退出；非法颜色降级为 'grey'

3.3 规则数据导入/导出（新增）
- 模式切换入口（底部单一按钮）：Side Panel 最底部、居中对齐
  - 在“添加/编辑模式”下显示按钮文案：“切换到导入/导出模式”
  - 在“导入/导出模式”下显示按钮文案：“切换到添加/编辑模式”
  - 两个按钮不会同时显示，始终仅展示当前可切换的目标模式
- 交互切换：
  - 点击“导入/导出规则”后：
    - 隐藏原“规则添加/编辑表单”（id: groupSettings，class: group-form）
    - 显示“导入/导出表单”（新表单，整体视觉风格与 group-form 一致，置于同一容器内）
    - 不管如何切换，【分组规则列表】（id=groupList）始终显示
  - 导入/导出表单包含（与 group-form 风格一致，强调主次操作）：
    - 导入区域：
      - 文件选择控件（仅接受 .json），采用美化样式：自定义按钮+文件名展示（隐藏原生 input[type=file]，用 label 触发）
      - 文本粘贴区域（可选）：支持将 JSON 粘贴后导入
      - 次要按钮（另起一行、浅色背景）：“从预设模板导入”（见 3.4）
      - 主要操作区（并排且不换行）：“导入”“导出”两个主按钮
    - 导出区域：
      - 说明文字：将导出当前规则为 JSON 文件
      - 主要操作按钮：“导出”
    - 布局要求：
      - 同一行不堆叠过多按钮，避免文字换行折叠
      - 主按钮使用深色实底；次要按钮使用浅色背景、独立行承载
- 导出行为：
  - 读取当前 {groups}，序列化为 JSON（UTF-8），保持精简结构，无需其它字段。
  - 文件名建议：LoiyTabTool_YYYYMMDD-HHMMSS.json
  - 下载于浏览器默认下载目录；不新增权限（使用前端生成并触发下载）
- 导入行为（文件/粘贴）：
  - 数据格式见 4.4
  - 校验与规范化：
    - JSON 顶层必须为对象，且包含数组字段 "groups"
    - 每个项需包含有效 domain（字符串）、groupName（字符串）、color（预设颜色名之一）
    - 规范化 domain：trim 后 toLowerCase；去除前导点；color 校验非法则以 'grey' 替换并记录提示
  - 合并策略（无复杂选项界面，采用确定性规则）：
    - 去重键：domain（小写）
    - 若导入项的 domain 在现有规则中不存在 → 直接追加
    - 若导入项的 domain 在现有规则中已存在 → 以导入项覆盖现有项（groupName、color 皆覆盖）
  - 成功导入后：
    - 立即写入 chrome.storage.sync（即时生效）
    - 刷新列表 UI
    - 显示成功总结：新增 X 条、覆盖 Y 条、跳过/修正 Z 条（颜色降级等）
  - 错误与提示：
    - JSON 解析失败、缺少必需字段、数组过大（>200 条）或文件过大（>1MB）时阻止导入并提示
    - 对每条被修正/跳过的记录给出简短说明统计
    - 错误提示位置：在导入/导出表单的顶部，以信息条展示统计结果：“新增 X / 覆盖 Y / 修正 Z”
- 模式切换：通过底部单一按钮在两种模式间切换（见上文“模式切换入口”）；不再提供“返回规则管理”按钮

3.4 预设规则模板导入（新增）
- 目的：用户手头无规则文件时，可一键导入内置的高频网站规则模板
- 入口：
  - 位于导入/导出表单的“导入区域”内，提供“从预设模板导入”按钮.
- 模板来源与组织（项目内置资源）：
  - 模板文件存放于工程内，构建后随扩展发布（仅1个模板）：
    - 预设模板路径：src/example/basic.json
    - 构建时复制到： dist/example/basic.json
  - 模板数据结构与 4.4 相同
- 导入逻辑：
  - 选择模板 → 读取模板 JSON → 按 3.3 中“导入行为”的校验与合并策略执行
  - 导入完成同样即时写入并刷新 UI
- 模板内容建议（示例）：
  - basic.json：google.com(blue)、x.com(purple)、youtube.com(red) 等
- 提示与幂等：
  - 重复导入模板时，以导入项覆盖现有同域名规则
  - 可在 UI 上提示“已覆盖 N 条现有规则”

3.5 获取当前页面域名（新增）
- 入口与位置：
  - 规则管理表单（Side Panel 顶部区域）中的“获取域名”按钮，位于“域名”输入框旁。
- 功能与行为：
  - 点击后读取当前窗口的活动标签页 URL，解析主机名并提取可注册顶级域名（eTLD+1），如：
    - https://www.google.com/search → google.com
    - https://news.bbc.co.uk/ → bbc.co.uk
    - https://mail.qq.com/ → qq.com
    - https://pan.baidu.com/ → baidu.com
  - 自动将结果填充到“域名”输入框（id="domain"），并以 Toast 成功提示“已获取域名：{domain}”。
- 域名提取规则：
  - 统一小写，去除末尾点与前缀 www/wwwn。
  - 过滤 IP 与非标准主机（IPv4/IPv6 不作为有效域名）。
  - 对常见多级公共后缀进行处理（示例集合：co.uk、com.cn、com.au、com.hk、com.tw、com.sg、co.jp、com.br 等），其余按最后两段取 eTLD+1。
- 权限与限制：
  - 需具备 "tabs" 权限或对应 host 权限；若权限不足或 URL 不可解析（如 chrome://），给出警告 Toast。
- 失败与提示：
  - 无法获取当前标签页 / URL 解析失败 / 未识别到有效域名 → 分别提示 warning/error 消息，不写入输入框。

4. 规则与约束
4.1 域名匹配策略（已实现）
- 统一小写、去除域名前导点后比较
- 匹配：主域或点边界的任意多级子域
  - 命中：google.com / mail.google.com / a.b.google.com
  - 不命中：notgoogle.com、google.com.hk（不同 TLD）
- 形式化定义：
  - const h = hostname.toLowerCase()
  - const r = ruleDomain.trim().toLowerCase().replace(/^\.+/, '')
  - 命中当且仅当 h === r 或 h.endsWith('.' + r)

4.2 颜色策略
- 仅支持预设颜色名：grey, blue, red, yellow, green, pink, purple, cyan
- 前端用名称映射 HEX 渲染；后台校验名称，非法降级 'grey'

4.3 数据结构与存储
- 存储键：{ groups: Array<GroupRule> }
- GroupRule：
  - domain: string（小写域名）
  - groupName: string
  - color: 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan'
- 存储：chrome.storage.sync；写入时机为任一变更（含导入）后立即写入

4.4 导入/导出数据格式（JSON）
- 顶层：
{
  "groups": GroupRule[]
}
- GroupRule 同 4.3，示例：
{
  "groups": [
    { "domain": "google.com", "groupName": "Google", "color": "blue" },
    { "domain": "github.com", "groupName": "GitHub", "color": "purple" }
  ]
}
- 兼容性：若存在多余未知字段，导入时忽略；缺少必需字段则跳过该条并统计

5. 技术方案
5.1 清单与权限（public/manifest.json）
- Manifest V3；permissions: ["storage","tabs","tabGroups","sidePanel"]
- side_panel.default_path: sidepanel/index.html；background.service_worker: background/index.js
- minimum_chrome_version: "114"；action.default_title: “打开工具侧边栏”
- icons 完整

5.2 前后端代码组织
- src/sidepanel：index.html / index.js / styles.css
- src/background：index.js
- src/shared：colors.js（UMD 暴露）
- 新增（仅文档约定，开发时实现）：src/example/*.json → dist/example/*.json
- 构建：npm run build（复制，不打包）；加载 dist/manifest.json

5.3 关键实现要点（导入/导出）
- 不新增权限，前端完成文件读取/下载
- 文件大小上限：1MB；条目上限：200；超出则提示并拒绝导入
- 合并策略固定：按 domain 覆盖或追加（不弹选项、不做任何提示，直接覆盖即可）
- UI 切换不刷新页面：隐藏/显示容器实现

5.4 颜色校验与降级
- isValidChromeColor(name)；无效统一为 'grey'

6. 异常处理与边界
- URL 解析失败：catch 后跳过
- 异步 API 失败：catch 并警告，不影响后续
- 导入：
  - JSON 解析错误、结构错误、空数据、超限时给出错误提示并拒绝
  - 单条修正（如颜色降级）仅计数汇总，不中断整体导入
- 模板不可用（文件缺失）：无法读取模板文件，请尝试重新安装扩展或联系维护者

7. 安全与合规
- 保持最小权限；不注入外部脚本/远端资源；不执行导入文件中的任何脚本（纯数据）
- 严格校验导入数据，防止异常字符串造成 UI 破坏（必要时转义/限制长度）

8. 文案与国际化（可选）
- 当前中文；后续可通过 _locales/ 与 chrome.i18n 接入多语言

9. 非功能性需求
- 可维护性：模块化；example 模板独立 JSON；导入逻辑复用现有规范化/去重能力
- 性能：导入过程 O(n) 去重合并；UI 批量更新
- 兼容性：Chrome 114+；Side Panel API 可用

10. 测试与验收要点
- UI：
  - “导入/导出规则”按钮居中显示在底部；点击后隐藏 group-form，显示导入/导出表单；返回按钮恢复
  - 极窄宽度下，导入/导出表单无溢出
- 获取域名（新增）：
  - 点击“获取域名”后，能正确填充 google.com、bbc.co.uk、baidu.com 等 eTLD+1。
  - 对 www、www2 前缀能正确去除；对 IPv4/IPv6 或 chrome:// 等不可解析地址给出 warning。
  - 在权限不足（tabs/host）时显示错误提示，不发生崩溃。
  - 成功填充后显示 success Toast，文本包含解析出的域名。
- 导出：
  - 导出文件名与时间戳；内容 JSON 符合 4.4；重新导入应与原数据一致
- 导入（文件/粘贴）：
  - 合法数据：新增/覆盖统计正确，UI 与存储一致
  - 非法数据：给出错误提示并拒绝；部分条目非法时整体导入成功但统计修正/跳过项
  - 大文件/过多条目：被拒绝并提示
- 模板导入：
  - 选择模板可成功导入；重复导入对相同 domain 执行覆盖
  - 模板缺失时给出错误提示
- 回归：
  - 自动分组功能不受新表单与导入流程影响
  - 颜色名校验与 grey 降级仍生效

11. 统一错误与状态提示方案（Toast）

- 使用范围：Side Panel 内的所有功能模块（规则管理、导入/导出、模板导入等）统一引用本方案。
- 展示位置：侧边栏主容器顶部“悬浮于表单之上”，不改变布局（典型 Toast 形式）。
- 消息类型与样式：
  - success（绿色背景，图标 ✓）
  - info（蓝色背景，图标 ℹ）
  - warning（黄色背景，图标 !）
  - error（红色背景，图标 ×）
- 可见性与时长：
  - success/info：默认 2 秒后淡出；可手动关闭
  - warning/error：默认 4 秒后淡出；可手动关闭
- 队列策略：允许同一时间显示多条消息（并行展示），按时间顺序从上至下或新到旧叠加。
- 文案与内容：
  - 简明一句话主体；导入结果固定摘要格式：“新增 X / 覆盖 Y / 修正 Z”
- 排版与间距规范（为避免文字错位与变形）：
  - 容器最大宽度：不超过面板宽度的 90%，左右留白适当（如 10px）
  - 行高与对齐：line-height ≥ 1.4；图标与文本垂直居中对齐，不压缩文本
  - 文本折行：允许自动换行；禁止单词被强制截断（避免 text 变形）
  - 内边距与间距：每条 Toast 内部 padding ≥ 8px 12px；多条之间垂直间距 8px
  - 关闭按钮：与文本保持 8px 左右间距，始终在同一行展示
- 可达性与可操作性：
  - info/success 使用 aria-live="polite"，error/warning 使用 aria-live="assertive" 或 role="alert"
  - 每条消息提供可聚焦的关闭按钮；键盘可操作（Enter/Space 触发关闭）
- 触发与归位：
  - 表单级错误可同时显示多条错误 Toast，便于一次性提示所有问题
  - 模板不可恢复错误（文件缺失）：错误消息文案为“无法读取模板文件，请尝试重新安装扩展或联系维护者”
- 兜底策略：
  - 若极少数情况下渲染栈异常导致消息容器不可用，则在控制台输出错误，避免静默失败；不使用阻塞式 alert，不新增通知权限
- 实现约定（供开发对齐）：
  - 预留全局 Toast 容器（例：<div id="toastHost"></div>）固定定位于容器顶部；支持多条并行
  - 提供 showToast({ type, text, timeout, sticky }) 与 clearToast(id) 等 API
  - 默认：success/info 2s，warning/error 4s；允许覆盖

- 使用范围：Side Panel 内的所有功能模块（规则管理、导入/导出、模板导入等）统一引用本方案。
- 展示位置：侧边栏主容器顶部“悬浮于表单之上”，不改变布局（典型 Toast 形式）。
- 消息类型与样式：
  - success（绿色背景，图标 ✓）
  - info（蓝色背景，图标 ℹ）
  - warning（黄色背景，图标 !）
  - error（红色背景，图标 ×）
- 可见性与时长：
  - success/info：默认 2 秒后淡出；可手动关闭
  - warning/error：默认 4 秒后淡出；可手动关闭
- 队列策略：允许同一时间显示多条消息（并行展示），按时间顺序从上至下或新到旧叠加。
- 文案与内容：
  - 简明一句话主体；必要时可在消息内提供可展开的详情，但默认保持简洁
  - 导入结果固定摘要格式：“新增 X / 覆盖 Y / 修正 Z”
- 触发与归位：
  - 表单级错误（如域名>64 或分组名>24）可同时在顶部显示多条错误消息，便于一次性提示所有问题
  - 后台不可恢复错误（如模板文件缺失）：显示 error 消息
    文案：“无法读取模板文件，请尝试重新安装扩展或联系维护者”
- 可达性与可操作性：
  - Toast 容器为无障碍友好组件；为 info/success 使用 aria-live="polite"，为 error/warning 使用 aria-live="assertive" 或 role="alert"
  - 每条消息提供可聚焦的关闭按钮；键盘可操作（Enter/Space 触发关闭）
- 兜底策略：
  - 若极少数情况下渲染栈异常导致消息容器不可用，则在控制台输出错误，避免静默失败；不使用阻塞式 alert，不新增通知权限
- 实现约定（供开发对齐）：
  - 预留一个全局 Toast 容器（例如：<div id="toastHost"></div>）固定定位于容器顶部
  - 提供 showToast({ type, text, timeout, sticky }) 与 clearToast(id) 等 API
  - 默认行为：非粘性；按类型选择超时（2s/4s）；支持多条并行显示

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

说明
- 本 PRD 在 1.2 基础上增补“规则数据导入/导出”与“预设规则模板导入”，所有描述均与现有实现约束（仅预设颜色、即时保存、域名匹配策略）保持一致；待您确认后再进入开发实现。