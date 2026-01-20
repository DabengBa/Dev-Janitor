/**
 * Environment Scanner Module
 * 
 * Provides functionality to scan and analyze system environment variables:
 * - Read all environment variables
 * - Categorize variables by type (path, java, python, node, other)
 * - Analyze PATH entries
 * - Detect duplicate PATH entries
 * 
 * Validates: Requirements 10.1-10.6
 * Properties: 15 (Environment Variable Completeness), 16 (Environment Variable Display),
 *            17 (Environment Variable Filtering), 18 (Duplicate PATH Detection)
 */

import { EnvironmentVariable } from '../shared/types'
import { isWindows, normalizePath } from './commandExecutor'
import { promises as fsPromises } from 'node:fs'

/**
 * Keywords used to categorize environment variables
 */
const CATEGORY_KEYWORDS = {
  java: ['java', 'jdk', 'jre', 'maven', 'gradle', 'ant', 'tomcat'],
  python: ['python', 'pip', 'conda', 'virtualenv', 'virtual_env', 'pyenv', 'anaconda'],
  node: ['node', 'npm', 'yarn', 'pnpm', 'nvm', 'fnm'],
  path: ['path'],
}

/**
 * Service-related environment variable patterns
 */
const SERVICE_RELATED_PATTERNS = [
  /^PATH$/i,
  /^JAVA_HOME$/i,
  /^JDK_HOME$/i,
  /^JRE_HOME$/i,
  /^PYTHON.*$/i,
  /^PIP.*$/i,
  /^NODE.*$/i,
  /^NPM.*$/i,
  /^NVM.*$/i,
  /^GOPATH$/i,
  /^GOROOT$/i,
  /^CARGO_HOME$/i,
  /^RUSTUP_HOME$/i,
  /^RUBY.*$/i,
  /^GEM.*$/i,
  /^ANDROID.*$/i,
  /^GRADLE.*$/i,
  /^MAVEN.*$/i,
  /^M2.*$/i,
  /^ANT.*$/i,
  /^DOCKER.*$/i,
  /^COMPOSE.*$/i,
  /^VIRTUAL_ENV$/i,
  /^CONDA.*$/i,
  /^PYENV.*$/i,
]

/**
 * Categorize an environment variable based on its key
 * 
 * @param key The environment variable key
 * @returns The category of the variable
 */
export function categorizeVariable(key: string): EnvironmentVariable['category'] {
  const lowerKey = key.toLowerCase()
  
  // Check for PATH first
  if (lowerKey === 'path') {
    return 'path'
  }
  
  // Check for Java-related
  for (const keyword of CATEGORY_KEYWORDS.java) {
    if (lowerKey.includes(keyword)) {
      return 'java'
    }
  }
  
  // Check for Python-related
  for (const keyword of CATEGORY_KEYWORDS.python) {
    if (lowerKey.includes(keyword)) {
      return 'python'
    }
  }
  
  // Check for Node-related
  for (const keyword of CATEGORY_KEYWORDS.node) {
    if (lowerKey.includes(keyword)) {
      return 'node'
    }
  }
  
  return 'other'
}

/**
 * Check if a variable is a system variable (heuristic)
 * On Windows, we can't easily distinguish, so we use common patterns
 * 
 * @param key The environment variable key
 * @param value The environment variable value
 * @returns true if likely a system variable
 */
export function isSystemVariable(key: string, value: string): boolean {
  const lowerKey = key.toLowerCase()
  
  // Common system variables
  const systemVars = [
    'path', 'pathext', 'comspec', 'systemroot', 'windir',
    'programfiles', 'programfiles(x86)', 'programdata',
    'appdata', 'localappdata', 'userprofile', 'homedrive', 'homepath',
    'temp', 'tmp', 'os', 'processor_architecture', 'number_of_processors',
    'computername', 'username', 'userdomain',
    'shell', 'user', 'home', 'logname', 'lang', 'term', 'display',
    'pwd', 'oldpwd', 'hostname', 'editor', 'visual',
  ]
  
  if (systemVars.includes(lowerKey)) {
    return true
  }
  
  // Check for system paths in value
  if (isWindows()) {
    if (value.toLowerCase().includes('\\windows\\') ||
        value.toLowerCase().includes('\\system32\\')) {
      return true
    }
  } else {
    if (value.includes('/usr/') || value.includes('/etc/') || value.includes('/var/')) {
      return true
    }
  }
  
  return false
}

/**
 * Get all environment variables
 * 
 * Property 15: Environment Variable Completeness
 * Validates: Requirement 10.1
 * 
 * @returns Array of all environment variables
 */
export function getAllEnvironmentVariables(): EnvironmentVariable[] {
  const variables: EnvironmentVariable[] = []
  const env = process.env
  
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      variables.push({
        key,
        value,
        category: categorizeVariable(key),
        isSystemVariable: isSystemVariable(key, value),
      })
    }
  }
  
  // Sort by key for consistent ordering
  return variables.sort((a, b) => a.key.localeCompare(b.key))
}

/**
 * Get the PATH separator for the current platform
 * @returns The path separator character
 */
export function getPathSeparator(): string {
  return isWindows() ? ';' : ':'
}

/**
 * Get all PATH entries
 * 
 * Property 16: Environment Variable Display
 * Validates: Requirement 10.2
 * 
 * @returns Array of PATH directory entries
 */
export function getPathEntries(): string[] {
  const pathEnv = process.env.PATH || process.env.Path || ''
  const separator = getPathSeparator()
  
  return pathEnv
    .split(separator)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(normalizePath)
}

/**
 * Find duplicate PATH entries
 * 
 * Property 18: Duplicate PATH Detection
 * Validates: Requirement 10.6
 * 
 * @returns Array of duplicate PATH entries
 */
export function findDuplicatePathEntries(): string[] {
  const entries = getPathEntries()
  const seen = new Map<string, number>()
  const duplicates: string[] = []
  
  for (const entry of entries) {
    // Normalize for comparison (case-insensitive on Windows)
    const normalizedEntry = isWindows() ? entry.toLowerCase() : entry
    
    const count = seen.get(normalizedEntry) || 0
    seen.set(normalizedEntry, count + 1)
    
    // Add to duplicates on second occurrence
    if (count === 1) {
      duplicates.push(entry)
    }
  }
  
  return duplicates
}

/**
 * Get service-related environment variables
 * 
 * Property 17: Environment Variable Filtering
 * Validates: Requirement 10.2
 * 
 * @returns Array of service-related environment variables
 */
export function getServiceRelatedVariables(): EnvironmentVariable[] {
  const allVars = getAllEnvironmentVariables()
  
  return allVars.filter(v => {
    // Check if key matches any service-related pattern
    for (const pattern of SERVICE_RELATED_PATTERNS) {
      if (pattern.test(v.key)) {
        return true
      }
    }
    return false
  })
}

/**
 * Filter environment variables by category
 * 
 * Property 17: Environment Variable Filtering
 * Validates: Requirement 10.5
 * 
 * @param category The category to filter by
 * @returns Array of environment variables matching the category
 */
export function filterByCategory(
  category: EnvironmentVariable['category']
): EnvironmentVariable[] {
  const allVars = getAllEnvironmentVariables()
  return allVars.filter(v => v.category === category)
}

/**
 * Search environment variables by key or value
 * 
 * @param query The search query
 * @returns Array of matching environment variables
 */
export function searchVariables(query: string): EnvironmentVariable[] {
  if (!query || query.trim().length === 0) {
    return getAllEnvironmentVariables()
  }
  
  const lowerQuery = query.toLowerCase()
  const allVars = getAllEnvironmentVariables()
  
  return allVars.filter(v => 
    v.key.toLowerCase().includes(lowerQuery) ||
    v.value.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Analyze PATH for potential issues
 *
 * @returns Promise resolving to object containing PATH analysis results
 */
export async function analyzePathEntries(): Promise<{
  entries: string[]
  duplicates: string[]
  nonExistent: string[]
  totalCount: number
  uniqueCount: number
}> {
  const entries = getPathEntries()
  const duplicates = findDuplicatePathEntries()

  // Check for non-existent directories in parallel
  const existenceChecks = await Promise.all(
    entries.map(async (entry) => {
      try {
        await fsPromises.access(entry)
        return { entry, exists: true }
      } catch {
        return { entry, exists: false }
      }
    })
  )

  const nonExistent = existenceChecks
    .filter(check => !check.exists)
    .map(check => check.entry)

  // Calculate unique count
  const uniqueEntries = new Set(
    entries.map(e => isWindows() ? e.toLowerCase() : e)
  )

  return {
    entries,
    duplicates,
    nonExistent,
    totalCount: entries.length,
    uniqueCount: uniqueEntries.size,
  }
}

/**
 * Get a specific environment variable
 * 
 * @param key The variable key to get
 * @returns The environment variable or null if not found
 */
export function getVariable(key: string): EnvironmentVariable | null {
  const value = process.env[key]
  
  if (value === undefined) {
    return null
  }
  
  return {
    key,
    value,
    category: categorizeVariable(key),
    isSystemVariable: isSystemVariable(key, value),
  }
}

/**
 * EnvironmentScanner class providing an object-oriented interface
 */
export class EnvironmentScanner {
  /**
   * Get all environment variables
   * 
   * Property 15: Environment Variable Completeness
   */
  getAllEnvironmentVariables(): EnvironmentVariable[] {
    return getAllEnvironmentVariables()
  }
  
  /**
   * Get PATH entries
   */
  getPathEntries(): string[] {
    return getPathEntries()
  }
  
  /**
   * Find duplicate PATH entries
   * 
   * Property 18: Duplicate PATH Detection
   */
  findDuplicatePathEntries(): string[] {
    return findDuplicatePathEntries()
  }
  
  /**
   * Get service-related variables
   */
  getServiceRelatedVariables(): EnvironmentVariable[] {
    return getServiceRelatedVariables()
  }
  
  /**
   * Filter variables by category
   * 
   * Property 17: Environment Variable Filtering
   */
  filterByCategory(category: EnvironmentVariable['category']): EnvironmentVariable[] {
    return filterByCategory(category)
  }
  
  /**
   * Search variables by query
   */
  searchVariables(query: string): EnvironmentVariable[] {
    return searchVariables(query)
  }
  
  /**
   * Analyze PATH entries
   */
  analyzePathEntries(): ReturnType<typeof analyzePathEntries> {
    return analyzePathEntries()
  }
  
  /**
   * Get a specific variable
   */
  getVariable(key: string): EnvironmentVariable | null {
    return getVariable(key)
  }
  
  /**
   * Categorize a variable key
   */
  categorizeVariable(key: string): EnvironmentVariable['category'] {
    return categorizeVariable(key)
  }
}

// Export a default instance
export const environmentScanner = new EnvironmentScanner()
