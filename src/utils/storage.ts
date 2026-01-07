import type { Project } from '../types'

const KEY = 'playcode.project.v1'

export function loadProject(): Project | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Project
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.html !== 'string' || typeof parsed.css !== 'string' || typeof parsed.js !== 'string') return null
    if (parsed.activeTab !== 'html' && parsed.activeTab !== 'css' && parsed.activeTab !== 'js') return null
    const runtime = parsed.runtime === 'react' ? 'react' : 'vanilla'
    const importMap = typeof parsed.importMap === 'string' ? parsed.importMap : ''
    return {
      html: parsed.html,
      css: parsed.css,
      js: parsed.js,
      autoRun: Boolean(parsed.autoRun),
      activeTab: parsed.activeTab,
      runtime,
      importMap,
    }
  } catch {
    return null
  }
}

export function saveProject(project: Project) {
  try {
    localStorage.setItem(KEY, JSON.stringify(project))
  } catch {
    // ignore
  }
}
