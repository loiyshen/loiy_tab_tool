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


3. 用户体验与交互流程
3.1 规则管理（Side Panel）
- 输入项：Domain（示例 google.com）、Group Name、Group Color（grey, blue, red, yellow, green, pink, purple, cyan）
- 约束：域名最大 64 个字符；分组名称最大 24 个字符（超出则阻止提交并提示）
- 操作按钮：添加 / 更新 / 取消（编辑态）
- 列表呈现：每条规则以预设色为背景、文本色 #333333；左信息（groupName、domain）、右按钮（编辑/删除）
- 实时保存：任一变更立即写入 chrome.storage.sync；加载时读取初始化
- 适配与布局：width: 100%，min-width: 320px，max-width: 600px；输入/下拉 100% 宽，box-sizing: border-box

3.2 自动后台分组（背景服务）
- 触发：chrome.tabs.onUpdated 且 status === 'complete'，仅处理 http/https
- 流程：解析 hostname → 读取 groups → 按 4.1 策略找首条命中 → 查询当前窗口分组 → 已有同名 → 加入；否则创建并设置标题与颜色
- 容错：全流程 try/catch，异常时安全退出；非法颜色降级为 'grey'

3.3 规则数据导入/导出（新增）
- 入口按钮位置：Side Panel 最底部、居中对齐；按钮文案“导入/导出规则”
- 交互切换：
  - 点击“导入/导出规则”后：
    - 隐藏原“规则添加/编辑表单”（id: groupSettings，class: group-form）
    - 显示“导入/导出表单”（新表单，整体视觉风格与 group-form 一致，置于同一容器内）
    - 不管如何切换，【分组规则列表】（id=groupList）始终显示
  - 导入/导出表单包含：
    - 导入区域：
      - 文件选择按钮（仅接受 .json）
      - 文本粘贴区域（可选）：支持将 JSON 粘贴后导入
      - “从预设模板导入”按钮/下拉（见 3.4）
      - 导入执行按钮：“导入”
    - 导出区域：
      - 说明文字：将导出当前规则为 JSON 文件
      - 导出执行按钮：“导出”
    - 返回按钮：“返回规则管理”（关闭导入/导出表单并重新显示 group-form）
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
- 返回交互：点击“返回规则管理”，隐藏导入/导出表单，恢复 group-form

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