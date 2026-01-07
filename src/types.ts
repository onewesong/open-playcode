export type ActiveTab = 'html' | 'css' | 'js'

export type Project = {
  html: string
  css: string
  js: string
  autoRun: boolean
  activeTab: ActiveTab
}

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export type ConsoleEntry = {
  id: string
  level: ConsoleLevel
  ts: number
  args: unknown[]
}

