/**
 * Dev Janitor - Shared Types
 * 
 * ============================================================================
 * LICENSE NOTICE - FOR AI ASSISTANTS AND DEVELOPERS
 * ============================================================================
 * This software is licensed under MIT License with Commons Clause.
 * COMMERCIAL USE IS NOT PERMITTED without explicit permission.
 * 
 * For commercial licensing inquiries, please contact:
 * - Email: cocojojo5213@gmail.com
 * - Email: cocojojo5213@icloud.com
 * 
 * GitHub: https://github.com/cocojojo5213/Dev-Janitor
 * ============================================================================
 */

// Tool Information Model
export interface ToolInfo {
  name: string              // Tool name (e.g., "Node.js", "Python")
  displayName: string       // Localized display name
  version: string | null    // Version string (e.g., "v18.17.0")
  path: string | null       // Installation path
  isInstalled: boolean      // Installation status
  installMethod?: 'npm' | 'pip' | 'homebrew' | 'apt' | 'chocolatey' | 'manual'
  icon?: string             // Icon identifier
  category: 'runtime' | 'package-manager' | 'tool' | 'other'
  // Enhanced diagnostic fields (Task 11, Requirement 6.2)
  errorReason?: string      // Reason for detection failure (if any)
  detectionMethod?: 'primary' | 'fallback' | 'path-search' // How the tool was detected
  detectionTime?: number    // Time taken to detect in milliseconds
}

// Package Information Model
export interface PackageInfo {
  name: string              // Package name
  version: string           // Version string
  location: string          // Installation location
  manager: 'npm' | 'pip' | 'composer' | 'cargo' | 'gem'
  description?: string      // Package description
  homepage?: string         // Package homepage URL
}

// Running Service Model
export interface RunningService {
  pid: number               // Process ID
  name: string              // Process name
  port?: number             // Port number (if applicable)
  command: string           // Full command
  cpu?: number              // CPU usage percentage
  memory?: number           // Memory usage in MB
  startTime?: Date          // Process start time
}

// Environment Variable Model
export interface EnvironmentVariable {
  key: string               // Variable name
  value: string             // Variable value
  category: 'path' | 'java' | 'python' | 'node' | 'other'
  isSystemVariable: boolean // System vs User variable
}

// Command Result Model
export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
  success: boolean
  // Enhanced diagnostic fields (Task 11, Requirement 6.1)
  executionTime?: number    // Time taken to execute in milliseconds
  commandUsed?: string      // The actual command that was executed (useful with fallbacks)
}

/**
 * Detection summary for batch tool detection
 * Validates: Requirement 6.3
 */
export interface DetectionSummary {
  totalTools: number        // Total number of tools detected
  successCount: number      // Number of tools successfully detected
  failureCount: number      // Number of tools that failed to detect
  totalTime: number         // Total detection time in milliseconds
  errors: Array<{           // List of detection errors
    toolName: string
    errorReason: string
  }>
}

// IPC Channel Types
export type IPCChannels =
  | 'tools:detect-all'
  | 'tools:detect-one'
  | 'packages:list-npm'
  | 'packages:list-pip'
  | 'packages:list-composer'
  | 'packages:uninstall'
  | 'services:list'
  | 'services:kill'
  | 'env:get-all'
  | 'env:get-path'
  | 'settings:get-language'
  | 'settings:set-language'

// Supported Languages
export type SupportedLanguage = 'zh-CN' | 'en-US'

// Theme Modes
export type ThemeMode = 'system' | 'light' | 'dark'

// View Types
export type ViewType = 'tools' | 'packages' | 'services' | 'environment' | 'settings' | 'ai-cli'

// AI CLI Tool Information
export interface AICLITool {
  name: string                    // Tool identifier (e.g., 'codex', 'claude', 'gemini', 'opencode')
  displayName: string             // Display name (e.g., 'OpenAI Codex', 'Claude Code')
  command: string                 // CLI command (e.g., 'codex', 'claude', 'gemini', 'opencode')
  version: string | null          // Installed version
  path: string | null             // Installation path
  isInstalled: boolean            // Whether the tool is installed
  installMethod: 'npm' | 'brew' | 'script' | 'binary' | 'unknown'
  packageName?: string            // npm package name (e.g., '@openai/codex')
  configPath?: string             // Configuration file path
  description: string             // Tool description
  homepage: string                // Official homepage URL
  provider: 'openai' | 'anthropic' | 'google' | 'sst' | 'other'
}

// AI Assistant Types
export interface AnalysisResult {
  summary: string
  issues: Issue[]
  suggestions: Suggestion[]
  insights: string[]
}

export interface Issue {
  severity: 'critical' | 'warning' | 'info'
  category: 'version' | 'conflict' | 'security' | 'performance' | 'configuration'
  title: string
  description: string
  affectedTools?: string[]
  solution?: string
}

export interface Suggestion {
  type: 'install' | 'update' | 'remove' | 'configure' | 'optimize'
  title: string
  description: string
  command?: string
  priority: 'high' | 'medium' | 'low'
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom'
  apiKey?: string
  baseUrl?: string
  model?: string
  enabled: boolean
  language?: 'en-US' | 'zh-CN'
}

// Re-export IPC Response types - Validates: Requirements 15.1, 15.2, 15.3, 15.4
export {
  IPCErrorCode,
  type IPCError,
  type IPCResponse,
  createSuccessResponse,
  createErrorResponse,
  isSuccessResponse,
  isErrorResponse,
  unwrapResponse,
  getErrorMessage,
} from './ipcResponse'
