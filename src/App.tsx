import './App.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { html as htmlLang } from '@codemirror/lang-html'
import { css as cssLang } from '@codemirror/lang-css'
import { javascript as jsLang } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import type { ActiveTab, ConsoleEntry, Project } from './types'
import { DEFAULT_PROJECT } from './defaultProject'
import { REACT_TEMPLATE } from './reactTemplate'
import { loadProject, saveProject } from './utils/storage'
import { decodeProjectFromHash, encodeProjectToHash } from './utils/share'
import { buildSrcDoc } from './preview/buildSrcDoc'

const PREVIEW_STORAGE_KEY = 'playcode.preview.storage.v1'

type RunSnapshot = Pick<Project, 'html' | 'css' | 'js' | 'runtime' | 'importMap' | 'tailwindCdn'> & { storageSeed: string }

function App() {
  const [project, setProject] = useState<Project>(() => {
    const fromHash = decodeProjectFromHash(window.location.hash)
    if (fromHash) return fromHash
    return loadProject() ?? DEFAULT_PROJECT
  })
  const [editorWidthPct, setEditorWidthPct] = useState(50)
  const [autoRun, setAutoRun] = useState<boolean>(() => project.autoRun)
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
  const previewStorageRef = useRef<{ localStorage?: Record<string, string>; sessionStorage?: Record<string, string> }>(
    loadPreviewStorage(),
  )
  const [lastRunSnapshot, setLastRunSnapshot] = useState<RunSnapshot>({
    html: project.html,
    css: project.css,
    js: project.js,
    runtime: project.runtime,
    importMap: project.importMap,
    tailwindCdn: project.tailwindCdn,
    storageSeed: JSON.stringify(previewStorageRef.current ?? {}),
  })
  const [srcDoc, setSrcDoc] = useState(() => buildSrcDoc(lastRunSnapshot))
  const draggingRef = useRef(false)
  const [depsOpen, setDepsOpen] = useState(false)
  const [depsDraft, setDepsDraft] = useState('')
  const [depsTailwindCdn, setDepsTailwindCdn] = useState(false)
  const [depsError, setDepsError] = useState<string | null>(null)

  useEffect(() => {
    setProject((p) => (p.autoRun === autoRun ? p : { ...p, autoRun }))
  }, [autoRun])

  useEffect(() => {
    saveProject(project)
  }, [project])

  const isDirty = useMemo(
    () =>
      project.html !== lastRunSnapshot.html ||
      project.css !== lastRunSnapshot.css ||
      project.js !== lastRunSnapshot.js ||
      project.runtime !== lastRunSnapshot.runtime ||
      project.importMap !== lastRunSnapshot.importMap ||
      project.tailwindCdn !== lastRunSnapshot.tailwindCdn,
    [project.html, project.css, project.js, project.runtime, project.importMap, project.tailwindCdn, lastRunSnapshot],
  )

  const run = () => {
    setConsoleEntries([])
    const snapshot = {
      html: project.html,
      css: project.css,
      js: project.js,
      runtime: project.runtime,
      importMap: project.importMap,
      tailwindCdn: project.tailwindCdn,
      storageSeed: JSON.stringify(previewStorageRef.current ?? {}),
    }
    setLastRunSnapshot(snapshot)
    setSrcDoc(buildSrcDoc(snapshot))
  }

  useEffect(() => {
    if (!autoRun) return
    const t = window.setTimeout(() => run(), 500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.html, project.css, project.js, project.runtime, project.importMap, project.tailwindCdn, autoRun])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as unknown
      if (!data || typeof data !== 'object') return
      const maybe = data as { __playcode?: boolean; type?: string; payload?: unknown }
      if (!maybe.__playcode || typeof maybe.type !== 'string') return
      if (maybe.type === 'console') {
        const payload = maybe.payload as { level?: string; args?: unknown[] }
        const level =
          payload?.level === 'info' ||
          payload?.level === 'warn' ||
          payload?.level === 'error' ||
          payload?.level === 'debug'
            ? payload.level
            : 'log'
        setConsoleEntries((prev) => [
          ...prev,
          { id: crypto.randomUUID(), level, ts: Date.now(), args: Array.isArray(payload?.args) ? payload.args : [] },
        ])
      } else if (maybe.type === 'error' || maybe.type === 'unhandledrejection') {
        setConsoleEntries((prev) => [
          ...prev,
          { id: crypto.randomUUID(), level: 'error', ts: Date.now(), args: [maybe.type, maybe.payload] },
        ])
      } else if (maybe.type === 'storage') {
        const payload = maybe.payload as { kind?: string; action?: string; payload?: unknown }
        applyPreviewStorageUpdate(previewStorageRef, payload)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        run()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.html, project.css, project.js, project.runtime, project.importMap, project.tailwindCdn])

  const activeTab = project.activeTab
  const editorValue = activeTab === 'html' ? project.html : activeTab === 'css' ? project.css : project.js
  const extensions = useMemo(() => {
    if (activeTab === 'html') return [htmlLang()]
    if (activeTab === 'css') return [cssLang()]
    return [jsLang({ jsx: project.runtime === 'react', typescript: false })]
  }, [activeTab, project.runtime])

  const setActiveTab = (tab: ActiveTab) => setProject((p) => ({ ...p, activeTab: tab }))
  const setCodeForActiveTab = (value: string) => {
    setProject((p) => {
      if (p.activeTab === 'html') return { ...p, html: value }
      if (p.activeTab === 'css') return { ...p, css: value }
      return { ...p, js: value }
    })
  }

  const share = async () => {
    const hash = encodeProjectToHash({
      html: project.html,
      css: project.css,
      js: project.js,
      runtime: project.runtime,
      importMap: project.importMap,
      tailwindCdn: project.tailwindCdn,
    })
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('复制链接：', url)
    }
    window.history.replaceState(null, '', hash)
  }

  const reset = () => {
    setProject(DEFAULT_PROJECT)
    setAutoRun(DEFAULT_PROJECT.autoRun)
    setConsoleEntries([])
    setLastRunSnapshot({
      html: DEFAULT_PROJECT.html,
      css: DEFAULT_PROJECT.css,
      js: DEFAULT_PROJECT.js,
      runtime: DEFAULT_PROJECT.runtime,
      importMap: DEFAULT_PROJECT.importMap,
      tailwindCdn: DEFAULT_PROJECT.tailwindCdn,
      storageSeed: JSON.stringify(previewStorageRef.current ?? {}),
    })
    setSrcDoc(
      buildSrcDoc({
        html: DEFAULT_PROJECT.html,
        css: DEFAULT_PROJECT.css,
        js: DEFAULT_PROJECT.js,
        runtime: DEFAULT_PROJECT.runtime,
        importMap: DEFAULT_PROJECT.importMap,
        tailwindCdn: DEFAULT_PROJECT.tailwindCdn,
        storageSeed: JSON.stringify(previewStorageRef.current ?? {}),
      }),
    )
    window.history.replaceState(null, '', window.location.pathname)
  }

  const loadReactTemplate = () => {
    setProject(REACT_TEMPLATE)
    setAutoRun(REACT_TEMPLATE.autoRun)
    setConsoleEntries([])
    setLastRunSnapshot({
      html: REACT_TEMPLATE.html,
      css: REACT_TEMPLATE.css,
      js: REACT_TEMPLATE.js,
      runtime: REACT_TEMPLATE.runtime,
      importMap: REACT_TEMPLATE.importMap,
      tailwindCdn: REACT_TEMPLATE.tailwindCdn,
      storageSeed: JSON.stringify(previewStorageRef.current ?? {}),
    })
    setSrcDoc(
      buildSrcDoc({
        html: REACT_TEMPLATE.html,
        css: REACT_TEMPLATE.css,
        js: REACT_TEMPLATE.js,
        runtime: 'react',
        importMap: REACT_TEMPLATE.importMap,
        tailwindCdn: REACT_TEMPLATE.tailwindCdn,
        storageSeed: JSON.stringify(previewStorageRef.current ?? {}),
      }),
    )
    window.history.replaceState(null, '', window.location.pathname)
  }

  const openDeps = () => {
    setDepsDraft(project.importMap || '')
    setDepsTailwindCdn(Boolean(project.tailwindCdn))
    setDepsError(null)
    setDepsOpen(true)
  }
  const applyDeps = () => {
    const trimmed = depsDraft.trim()
    if (!trimmed) {
      setProject((p) => ({ ...p, importMap: '', tailwindCdn: depsTailwindCdn }))
      setDepsOpen(false)
      return
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const normalized = JSON.stringify(parsed, null, 2)
      setProject((p) => ({ ...p, importMap: normalized, tailwindCdn: depsTailwindCdn }))
      setDepsOpen(false)
      setDepsError(null)
    } catch (e) {
      setDepsError(e instanceof Error ? e.message : 'JSON 解析失败')
    }
  }

  const onDividerMouseDown = () => {
    draggingRef.current = true
    document.body.classList.add('dragging')
  }
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const pct = (e.clientX / window.innerWidth) * 100
      setEditorWidthPct(Math.min(80, Math.max(20, pct)))
    }
    const onMouseUp = () => {
      draggingRef.current = false
      document.body.classList.remove('dragging')
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brandTitle">playcode</span>
          <span className="brandSub">轻量在线编辑器</span>
        </div>
        <div className="actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={project.runtime === 'react'}
              onChange={(e) =>
                setProject((p) => {
                  const runtime = e.target.checked ? 'react' : 'vanilla'
                  const importMap = runtime === 'react' && !p.importMap.trim() ? REACT_TEMPLATE.importMap : p.importMap
                  return { ...p, runtime, importMap, activeTab: 'js' }
                })
              }
            />
            <span>React/JSX</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} />
            <span>自动运行</span>
          </label>
          <button className="primary" onClick={run} title="Ctrl/⌘ + Enter">
            运行{isDirty ? '（未同步）' : ''}
          </button>
          <button onClick={openDeps}>
            依赖{project.importMap.trim() || project.tailwindCdn ? '（已配置）' : ''}
          </button>
          <button onClick={loadReactTemplate}>React 示例</button>
          <button onClick={share}>分享链接</button>
          <button onClick={() => setConsoleEntries([])}>清空控制台</button>
          <button onClick={reset}>重置示例</button>
        </div>
      </header>

      <main className="main">
        <section className="panel editor" style={{ width: `${editorWidthPct}%` }}>
          <div className="tabs">
            <button className={activeTab === 'html' ? 'tab active' : 'tab'} onClick={() => setActiveTab('html')}>
              HTML
            </button>
            <button className={activeTab === 'css' ? 'tab active' : 'tab'} onClick={() => setActiveTab('css')}>
              CSS
            </button>
            <button className={activeTab === 'js' ? 'tab active' : 'tab'} onClick={() => setActiveTab('js')}>
              {project.runtime === 'react' ? 'JSX' : 'JS'}
            </button>
          </div>
          <div className="editorWrap">
            <CodeMirror
              value={editorValue}
              onChange={setCodeForActiveTab}
              extensions={extensions}
              theme={oneDark}
              height="100%"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                foldGutter: true,
                autocompletion: true,
              }}
            />
          </div>
        </section>

        <div className="divider" onMouseDown={onDividerMouseDown} role="separator" aria-label="调整面板宽度" />

        <section className="panel preview" style={{ width: `${100 - editorWidthPct}%` }}>
          <div className="previewHeader">
            <div className="previewTitle">预览</div>
            <div className="previewHint">Ctrl/⌘ + Enter 运行</div>
          </div>
          <div className="previewBody">
            <iframe
              title="预览"
              className="iframe"
              sandbox="allow-scripts"
              srcDoc={srcDoc}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="console">
            <div className="consoleHeader">
              <div className="consoleTitle">控制台</div>
              <div className="consoleMeta">{consoleEntries.length} 条</div>
            </div>
            <div className="consoleBody">
              {consoleEntries.length === 0 ? (
                <div className="consoleEmpty">暂无输出</div>
              ) : (
                consoleEntries.map((e) => (
                  <div key={e.id} className={`consoleLine level-${e.level}`}>
                    <span className="consoleTime">{new Date(e.ts).toLocaleTimeString()}</span>
                    <span className="consoleLevel">{e.level}</span>
                    <span className="consoleMsg">{formatArgs(e.args)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {depsOpen ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHeader">
              <div className="modalTitle">依赖（importmap）</div>
              <button onClick={() => setDepsOpen(false)}>关闭</button>
            </div>
            <div className="modalBody">
              <div className="modalHint">
                这里填写 importmap JSON（示例：React 用 <code>https://esm.sh</code>）。代码里即可直接 <code>import ... from 'xxx'</code>。
              </div>
              <label className="modalToggle">
                <input
                  type="checkbox"
                  checked={depsTailwindCdn}
                  onChange={(e) => setDepsTailwindCdn(e.target.checked)}
                />
                <span>Tailwind CDN（需要联网，适合直接粘贴 Tailwind 页面）</span>
              </label>
              <textarea
                className="modalTextarea"
                value={depsDraft}
                onChange={(e) => setDepsDraft(e.target.value)}
                placeholder='{"imports":{"lodash":"https://esm.sh/lodash-es"}}'
              />
              {depsError ? <div className="modalError">{depsError}</div> : null}
            </div>
            <div className="modalFooter">
              <button onClick={() => setDepsDraft('')}>清空</button>
              <button className="primary" onClick={applyDeps}>
                应用
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function loadPreviewStorage(): { localStorage?: Record<string, string>; sessionStorage?: Record<string, string> } {
  try {
    const raw = localStorage.getItem(PREVIEW_STORAGE_KEY)
    if (!raw) return { localStorage: {}, sessionStorage: {} }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { localStorage: {}, sessionStorage: {} }
    const p = parsed as { localStorage?: unknown; sessionStorage?: unknown }
    return {
      localStorage: isRecord(p.localStorage) ? (p.localStorage as Record<string, string>) : {},
      sessionStorage: isRecord(p.sessionStorage) ? (p.sessionStorage as Record<string, string>) : {},
    }
  } catch {
    return { localStorage: {}, sessionStorage: {} }
  }
}

function persistPreviewStorage(storage: { localStorage?: Record<string, string>; sessionStorage?: Record<string, string> }) {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(storage))
  } catch {
    // ignore
  }
}

function applyPreviewStorageUpdate(
  ref: React.MutableRefObject<{ localStorage?: Record<string, string>; sessionStorage?: Record<string, string> }>,
  msg: { kind?: string; action?: string; payload?: unknown },
) {
  const kind = msg.kind === 'sessionStorage' ? 'sessionStorage' : msg.kind === 'localStorage' ? 'localStorage' : null
  if (!kind) return
  const action = msg.action
  if (action !== 'set' && action !== 'remove' && action !== 'clear') return

  const state = ref.current ?? { localStorage: {}, sessionStorage: {} }
  const store =
    kind === 'localStorage'
      ? (state.localStorage ?? (state.localStorage = {}))
      : (state.sessionStorage ?? (state.sessionStorage = {}))

  if (action === 'set') {
    const payload = msg.payload as { key?: unknown; value?: unknown }
    if (typeof payload?.key !== 'string') return
    store[payload.key] = typeof payload.value === 'string' ? payload.value : String(payload.value)
  } else if (action === 'remove') {
    const payload = msg.payload as { key?: unknown }
    if (typeof payload?.key !== 'string') return
    delete store[payload.key]
  } else if (action === 'clear') {
    for (const k of Object.keys(store)) delete store[k]
  }

  ref.current = state
  persistPreviewStorage(state)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function formatArgs(args: unknown[]) {
  const safe = (v: unknown) => {
    if (typeof v === 'string') return v
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }
  return args.map(safe).join(' ')
}

export default App
