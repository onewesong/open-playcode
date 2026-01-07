# playcode（MVP）

一个轻量的 `playcode.io` 风格在线编辑器：编辑 `HTML/CSS/JS`，右侧 `iframe` 预览并捕获 `console` 输出。

## 功能

- 三个标签页编辑 `HTML / CSS / JS`
- 自动运行（500ms 防抖）或手动运行（`Ctrl/⌘ + Enter`）
- 预览区：`srcDoc` 隔离执行（`sandbox="allow-scripts"`）
- 控制台：捕获 `console.*`、运行时错误、未处理 Promise 拒绝
- 本地保存：`localStorage`
- 分享链接：把代码压缩写入 `#code=...`（可复制链接）

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
