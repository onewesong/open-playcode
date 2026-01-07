export function buildSrcDoc(input: {
  html: string
  css: string
  js: string
  runtime: 'vanilla' | 'react'
  importMap: string
  tailwindCdn: boolean
  storageSeed: string
}) {
  const { html, css, js, runtime, importMap, tailwindCdn, storageSeed } = input

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${importMapTag(importMap)}
    ${tailwindTag(tailwindCdn)}
    <style>${escapeStyle(css)}</style>
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
    <script>
      (function () {
        var seedText = ${JSON.stringify(storageSeed || '')};
        var seed = {};
        try { seed = seedText ? JSON.parse(seedText) : {}; } catch (_) { seed = {}; }
        if (!seed || typeof seed !== 'object') seed = {};

        function post(type, payload) {
          try { parent.postMessage({ __playcode: true, type: type, payload: payload }, '*'); } catch (_) {}
        }

        function createStorage(store, kind) {
          function keys() { return Object.keys(store); }
          function persist(action, payload) { post('storage', { kind: kind, action: action, payload: payload }); }
          return {
            getItem: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(store, k) ? String(store[k]) : null; },
            setItem: function (k, v) { k = String(k); store[k] = String(v); persist('set', { key: k, value: String(v) }); },
            removeItem: function (k) { k = String(k); delete store[k]; persist('remove', { key: k }); },
            clear: function () { Object.keys(store).forEach(function (k) { delete store[k]; }); persist('clear', {}); },
            key: function (i) { var ks = keys(); return typeof i === 'number' ? (ks[i] || null) : null; },
            get length() { return keys().length; },
          };
        }

        function defineGlobal(name, value) {
          try {
            Object.defineProperty(window, name, { value: value, configurable: true });
            return;
          } catch (_) {}
          try { window[name] = value; } catch (_) {}
          try {
            if (typeof Window !== 'undefined' && Window.prototype) {
              Object.defineProperty(Window.prototype, name, { get: function () { return value; }, configurable: true });
            }
          } catch (_) {}
        }

        // about:srcdoc + sandbox(无 allow-same-origin) 会导致原生 localStorage/sessionStorage 访问抛 SecurityError。
        defineGlobal('localStorage', createStorage(seed.localStorage && typeof seed.localStorage === 'object' ? seed.localStorage : {}, 'localStorage'));
        defineGlobal('sessionStorage', createStorage(seed.sessionStorage && typeof seed.sessionStorage === 'object' ? seed.sessionStorage : {}, 'sessionStorage'));
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
        try {
          var mod = await import(url);
          if (root && !root.hasChildNodes()) {
            var ReactMod = await import('react');
            var React = ReactMod && (ReactMod.default || ReactMod);
            var Dom = await import('react-dom/client');
            var Comp = (mod && (mod.default || mod.App)) || null;
            if (Comp) {
              var el = typeof Comp === 'function' ? React.createElement(Comp) : Comp;
              Dom.createRoot(root).render(el);
            }
          }
        } finally {
          URL.revokeObjectURL(url);
        }
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

function tailwindTag(enabled: boolean) {
  if (!enabled) return ''
  return `<script src="https://cdn.tailwindcss.com"></script>`
}

function indent(code: string, spaces: number) {
  const pad = ' '.repeat(spaces)
  return code
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}
