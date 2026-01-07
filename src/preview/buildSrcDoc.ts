export function buildSrcDoc(input: { html: string; css: string; js: string }) {
  const { html, css, js } = input

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${css}</style>
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
    <script type="module">
      try {
${indent(js, 8)}
      } catch (e) {
        console.error(e);
      }
    </script>
  </body>
</html>`
}

function indent(code: string, spaces: number) {
  const pad = ' '.repeat(spaces)
  return code
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}

