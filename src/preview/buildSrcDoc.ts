export function buildSrcDoc(input: {
  html: string
  css: string
  js: string
  runtime: 'vanilla' | 'react'
  importMap: string
}) {
  const { html, css, js, runtime, importMap } = input

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${escapeStyle(css)}</style>
    ${importMapTag(importMap)}
  </head>
  <body>
    ${html}
    <script>
      (function () {
        function safe(v) {
          if (typeof v === 'string') return v;
          try { return JSON.parse(JSON.stringify(v)); } catch (_) { return String(v); }
        }
        function post(type, payload) {
          try { parent.postMessage({ __playcode: true, type: type, payload: payload }, '*'); } catch (_) {}
        }
        ['log','info','warn','error','debug'].forEach(function (level) {
          var orig = console[level];
          console[level] = function () {
            var args = Array.prototype.slice.call(arguments).map(safe);
            post('console', { level: level, args: args });
            try { orig && orig.apply(console, arguments); } catch (_) {}
          };
        });
        window.addEventListener('error', function (e) {
          post('error', { message: e && e.message, stack: e && e.error && e.error.stack });
        });
        window.addEventListener('unhandledrejection', function (e) {
          post('unhandledrejection', { reason: safe(e && e.reason) });
        });
      })();
    </script>
    ${runtime === 'react' ? reactRuntime(js) : vanillaRuntime(js)}
  </body>
</html>`
}

function vanillaRuntime(js: string) {
  const safe = escapeScript(js)
  return `<script type="module">
      try {
${indent(safe, 8)}
      } catch (e) {
        console.error(e);
      }
    </script>`
}

function reactRuntime(js: string) {
  const source = JSON.stringify(js)
  return `<script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
    <script type="module">
      try {
        var root = document.getElementById('root');
        if (!root) { root = document.createElement('div'); root.id = 'root'; document.body.appendChild(root); }
        if (!window.Babel) throw new Error('Babel 加载失败（需要联网）');
        var code = ${source};
        var out = window.Babel.transform(code, { presets: [['react', { runtime: 'classic' }]] }).code;
        var blob = new Blob([out], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        try { await import(url); } finally { URL.revokeObjectURL(url); }
      } catch (e) {
        console.error(e);
      }
    </script>`
}

function escapeStyle(css: string) {
  return String(css).replaceAll('</style', '<\\/style')
}

function escapeScript(js: string) {
  return String(js).replaceAll('</script', '<\\/script')
}

function importMapTag(importMap: string) {
  const trimmed = importMap.trim()
  if (!trimmed) return ''
  try {
    const parsed = JSON.parse(trimmed) as unknown
    const json = JSON.stringify(parsed, null, 2).replaceAll('</script', '<\\/script')
    return `<script type="importmap">${json}</script>`
  } catch {
    return `<script>
      console.warn('importmap 不是合法 JSON，已忽略');
    </script>`
  }
}

function indent(code: string, spaces: number) {
  const pad = ' '.repeat(spaces)
  return code
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}
