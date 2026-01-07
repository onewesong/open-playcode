export type ActiveTab = 'html' | 'css' | 'js'

export type RuntimeMode = 'vanilla' | 'react'

export type Project = {
  html: string
  css: string
  js: string
  autoRun: boolean
  activeTab: ActiveTab
  runtime: RuntimeMode
  importMap: string
}

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export type ConsoleEntry = {
  id: string
  level: ConsoleLevel
  ts: number
  args: unknown[]
}
