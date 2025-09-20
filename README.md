# 芦艺标签页分组工具

## 开发与构建结构
- 源码：src/
  - background/index.js
  - sidepanel/index.html, index.js, styles.css
  - shared/colors.js
- 资源：public/manifest.json, icons/
- 构建输出：dist/

## 构建
1) 安装 Node.js (>=18)
2) 安装依赖（无额外依赖）
3) 运行构建
```bash
npm run build
```
4) 在 Chrome 扩展管理中加载 dist/manifest.json

## 说明
- 仅使用 Chrome 预设分组颜色；规则项文字颜色为 #333333
- Side Panel 自适应宽度：body width: 100%, min-width: 320px, max-width: 600px
- 域名匹配：主域或点边界子域（host === rule || host.endsWith('.' + rule)）