import type { Project } from './types'

export const REACT_TEMPLATE: Project = {
  activeTab: 'js',
  autoRun: true,
  runtime: 'react',
  tailwindCdn: false,
  importMap: `{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react-dom/client": "https://esm.sh/react-dom@18/client",
    "lucide-react": "https://esm.sh/lucide-react@latest?external=react"
  }
}`,
  html: `<div id="root"></div>`,
  css: `:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #0b1020; color: #e6e6e6; }
.card { padding: 24px; }
button { padding: 8px 12px; border: 1px solid #2b3350; background: #151b2e; color: #e6e6e6; border-radius: 10px; cursor: pointer; }
button:hover { border-color: #5a6cff; }`,
  js: `import React, { useState } from 'react';
import { Rocket } from 'lucide-react';

const App = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="card">
      <h1>React JSX</h1>
      <p>这里可以直接写 JSX，并且支持 import 外部包。</p>
      <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Rocket size={18} /> lucide-react 已就绪
      </p>
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
    </div>
  );
};

export default App;`,
}
