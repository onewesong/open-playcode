import LZString from 'lz-string'

export function encodeProjectToHash(project: {
  html: string
  css: string
  js: string
  runtime: 'vanilla' | 'react'
  importMap: string
}) {
  const payload = JSON.stringify({ v: 3, ...project })
  const code = LZString.compressToEncodedURIComponent(payload)
  return `#code=${code}`
}

export function decodeProjectFromHash(hash: string) {
  const m = /^#code=([^&]+)$/.exec(hash)
  if (!m) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(m[1])
    if (!json) return null
    const parsed = JSON.parse(json) as {
      v?: number
      html?: unknown
      css?: unknown
      js?: unknown
      runtime?: unknown
      importMap?: unknown
    }
    if (parsed?.v !== 1 && parsed?.v !== 2 && parsed?.v !== 3) return null
    if (typeof parsed.html !== 'string' || typeof parsed.css !== 'string' || typeof parsed.js !== 'string') return null
    const runtime: 'vanilla' | 'react' = parsed.v === 2 && parsed.runtime === 'react' ? 'react' : 'vanilla'
    const runtimeV3: 'vanilla' | 'react' = parsed.v === 3 && parsed.runtime === 'react' ? 'react' : runtime
    const importMap = parsed.v === 3 && typeof parsed.importMap === 'string' ? parsed.importMap : ''
    return {
      html: parsed.html,
      css: parsed.css,
      js: parsed.js,
      runtime: runtimeV3,
      importMap,
      autoRun: true,
      activeTab: runtimeV3 === 'react' ? ('js' as const) : ('html' as const),
    }
  } catch {
    return null
  }
}
