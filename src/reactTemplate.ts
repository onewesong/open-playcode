import type { Project } from './types'

export const REACT_TEMPLATE: Project = {
  activeTab: 'js',
  autoRun: true,
  runtime: 'react',
  html: `<div id="root"></div>`,
  css: `:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #0b1020; color: #e6e6e6; }
.card { padding: 24px; }
button { padding: 8px 12px; border: 1px solid #2b3350; background: #151b2e; color: #e6e6e6; border-radius: 10px; cursor: pointer; }
button:hover { border-color: #5a6cff; }`,
  js: `function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="card">
      <h1>React JSX</h1>
      <p>这里可以直接写 JSX（无需 import）。</p>
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
    </div>
  );
}

const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(<App />);`,
}

