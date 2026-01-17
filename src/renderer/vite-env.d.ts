/// <reference types="vite/client" />

import type { ToolInfo, PackageInfo, RunningService, EnvironmentVariable, AnalysisResult, AIConfig } from '../shared/types'

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

// Global type for electronAPI exposed via preload
declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
      tools: {
        detectAll: () => Promise<ToolInfo[]>
        detectOne: (toolName: string) => Promise<ToolInfo>
      }
      packages: {
        listNpm: () => Promise<PackageInfo[]>
        listPip: () => Promise<PackageInfo[]>
        listComposer: () => Promise<PackageInfo[]>
        listCargo: () => Promise<PackageInfo[]>
        listGem: () => Promise<PackageInfo[]>
        uninstall: (name: string, manager: string) => Promise<boolean>
        checkNpmLatestVersion: (packageName: string) => Promise<{ name: string; latest: string; current?: string } | null>
        checkPipLatestVersion: (packageName: string) => Promise<{ name: string; latest: string } | null>
      }
      services: {
        list: () => Promise<RunningService[]>
        kill: (pid: number) => Promise<boolean>
        onUpdated: (callback: (services: RunningService[]) => void) => () => void
      }
      env: {
        getAll: () => Promise<EnvironmentVariable[]>
        getPath: () => Promise<string[]>
      }
      settings: {
        getLanguage: () => Promise<string>
        setLanguage: (lang: string) => Promise<void>
        onLanguageChanged: (callback: (lang: string) => void) => () => void
      }
      ai: {
        analyze: (language?: 'en-US' | 'zh-CN', useCache?: boolean) => Promise<AnalysisResult>
        updateConfig: (config: AIConfig) => Promise<void>
        fetchModels: () => Promise<string[]>
        testConnection: (config: AIConfig) => Promise<{ success: boolean; message: string }>
        onStreamToken: (callback: (token: string) => void) => () => void
      }
      shell: {
        openPath: (path: string) => Promise<string>
        openExternal: (url: string) => Promise<void>
        executeCommand: (command: string) => Promise<{ success: boolean; stdout: string; stderr: string }>
      }
      events: {
        onDetectionProgress: (callback: (progress: number) => void) => () => void
        onError: (callback: (error: string) => void) => () => void
      }
      app: {
        getVersion: () => Promise<string>
        checkForUpdates: () => Promise<{ success: boolean; updateAvailable?: boolean; version?: string; error?: string }>
        downloadUpdate: () => Promise<{ success: boolean; error?: string }>
        installUpdate: () => void
        onUpdateAvailable: (callback: (info: { version: string; releaseDate?: string; releaseNotes?: string }) => void) => () => void
        onUpdateNotAvailable: (callback: (info: { currentVersion: string }) => void) => () => void
        onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void
        onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
        onUpdateError: (callback: (error: { message: string }) => void) => () => void
      }
    }
  }
}
