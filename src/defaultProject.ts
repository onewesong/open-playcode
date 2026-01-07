import type { Project } from './types'

export const DEFAULT_PROJECT: Project = {
  activeTab: 'html',
  autoRun: true,
  runtime: 'vanilla',
  importMap: '',
  tailwindCdn: false,
  html: `<div class="wrap">
  <h1>playcode</h1>
  <p>编辑左侧 HTML/CSS/JS，右侧实时预览。</p>
  <button id="btn">点我</button>
</div>`,
  css: `:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #0b1020; color: #e6e6e6; }
.wrap { padding: 24px; }
h1 { margin: 0 0 12px; font-size: 28px; }
button { padding: 8px 12px; border: 1px solid #2b3350; background: #151b2e; color: #e6e6e6; border-radius: 10px; cursor: pointer; }
button:hover { border-color: #5a6cff; }`,
  js: `const btn = document.querySelector('#btn');
btn?.addEventListener('click', () => {
  console.log('hello from playcode');
  alert('你好！');
});`,
}
