# playcode（MVP）

一个轻量的 `playcode.io` 风格在线编辑器：编辑 `HTML/CSS/JS`，右侧 `iframe` 预览并捕获 `console` 输出。

## 功能

- 三个标签页编辑 `HTML / CSS / JS`
- React/JSX 模式：JS 支持直接写 JSX（iframe 内加载 React + Babel 转译）
- 支持 `import` 外部包：通过 importmap 映射到 CDN（如 `https://esm.sh`）
- 自动运行（500ms 防抖）或手动运行（`Ctrl/⌘ + Enter`）
- 预览区：`srcDoc` 隔离执行（`sandbox="allow-scripts"`）
- 控制台：捕获 `console.*`、运行时错误、未处理 Promise 拒绝
- 本地保存：`localStorage`
- 分享链接：把代码压缩写入 `#code=...`（可复制链接）

## 外部依赖（import）

点击顶部 `依赖`，填写 importmap JSON，例如：

```json
{
  "imports": {
    "lodash": "https://esm.sh/lodash-es",
    "lucide-react": "https://esm.sh/lucide-react@latest?external=react"
  }
}
```

同一弹窗里也可以一键开启 `Tailwind CDN`（适合直接粘贴 Tailwind 页面，需联网）。

## React 组件为什么不显示？

在 `React/JSX` 模式下：

- 如果你的代码里只有 `export default App`（没有手动 `createRoot(...).render(...)`），预览会在 `#root` 为空时自动把默认导出组件渲染出来。
- 如果你已经手动渲染了（例如自己写了 `createRoot(...).render(...)`），预览不会重复渲染。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```
