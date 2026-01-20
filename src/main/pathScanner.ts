/**
 * PATH Scanner Module
 * 
 * Provides functionality to scan system PATH for executable tools:
 * - Parse PATH environment variable
 * - Scan directories for executables
 * - Identify installation methods
 * - Generate uninstall instructions
 * 
 * Validates: Requirements 9.1-9.7
 */

import * as fs from 'fs'
import { promises as fsPromises } from 'fs'
import * as path from 'path'
import { ToolInfo } from '../shared/types'
import {
  isWindows,
  executeSafe,
  normalizePath,
  getAllToolPaths,
} from './commandExecutor'
import { parseVersion } from './detectionEngine'

/**
 * Extended tool information with uninstall instructions
 */
export interface ExtendedToolInfo extends ToolInfo {
  allPaths: string[]
  uninstallInstructions: string[]
}

/**
 * Executable file information
 */
export interface ExecutableInfo {
  name: string
  path: string
  directory: string
}

/**
 * Get the PATH separator for the current platform
 * @returns The path separator character
 */
export function getPathSeparator(): string {
  return isWindows() ? ';' : ':'
}

/**
 * Parse the PATH environment variable into individual directories
 * 
 * Property 12: PATH Scanning Completeness
 * @returns Array of directory paths from PATH
 */
export function parsePath(): string[] {
  const pathEnv = process.env.PATH || process.env.Path || ''
  const separator = getPathSeparator()
  
  return pathEnv
    .split(separator)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(normalizePath)
}

/**
 * Get version output from a command result.
 * Prefer stdout, fallback to stderr (some tools print version to stderr).
 */
function getVersionOutput(result: { stdout?: string; stderr?: string }): string {
  if (result.stdout && result.stdout.trim()) {
    return result.stdout
  }
  if (result.stderr && result.stderr.trim()) {
    return result.stderr
  }
  return ''
}

/**
 * Check if a file is executable
 * @param filePath Path to the file
 * @returns Promise resolving to true if the file is executable
 */
export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath)

    if (!stats.isFile()) {
      return false
    }

    if (isWindows()) {
      // On Windows, check for common executable extensions
      const ext = path.extname(filePath).toLowerCase()
      return ['.exe', '.cmd', '.bat', '.com', '.ps1'].includes(ext)
    } else {
      // On Unix, check execute permission
      const mode = stats.mode
      return (mode & fs.constants.S_IXUSR) !== 0 ||
             (mode & fs.constants.S_IXGRP) !== 0 ||
             (mode & fs.constants.S_IXOTH) !== 0
    }
  } catch {
    return false
  }
}

/**
 * Scan a directory for executable files
 * @param directory The directory to scan
 * @returns Promise resolving to array of executable file information
 */
export async function scanDirectory(directory: string): Promise<ExecutableInfo[]> {
  const executables: ExecutableInfo[] = []

  try {
    // Check if directory exists
    try {
      await fsPromises.access(directory)
    } catch {
      return executables
    }

    const files = await fsPromises.readdir(directory)

    // Check executables in parallel for better performance
    const checks = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directory, file)
        const isExec = await isExecutable(filePath)
        return { file, filePath, isExec }
      })
    )

    for (const { file, filePath, isExec } of checks) {
      if (isExec) {
        // Get the base name without extension on Windows
        let name = file
        if (isWindows()) {
          const ext = path.extname(file).toLowerCase()
          if (['.exe', '.cmd', '.bat', '.com', '.ps1'].includes(ext)) {
            name = path.basename(file, ext)
          }
        }

        executables.push({
          name: name.toLowerCase(),
          path: normalizePath(filePath),
          directory: normalizePath(directory),
        })
      }
    }
  } catch {
    // Directory not accessible, skip it
  }

  return executables
}

/**
 * Scan all PATH directories for executables
 *
 * Property 12: PATH Scanning Completeness
 * @returns Promise resolving to array of all executable files found in PATH
 */
export async function scanAllPathDirectories(): Promise<ExecutableInfo[]> {
  const pathDirs = parsePath()
  const allExecutables: ExecutableInfo[] = []
  const seen = new Set<string>()

  // Scan directories in parallel for better performance
  const results = await Promise.all(
    pathDirs.map(dir => scanDirectory(dir))
  )

  for (const executables of results) {
    for (const exec of executables) {
      // Use name + path as unique key to track duplicates
      const key = `${exec.name}:${exec.path}`
      if (!seen.has(key)) {
        seen.add(key)
        allExecutables.push(exec)
      }
    }
  }

  return allExecutables
}

/**
 * Identify the installation method based on the path
 * 
 * @param toolPath The installation path
 * @returns The detected installation method
 */
export function identifyInstallMethod(toolPath: string): ToolInfo['installMethod'] {
  if (!toolPath) return 'manual'
  
  const lowerPath = toolPath.toLowerCase()
  
  // Homebrew (macOS)
  if (lowerPath.includes('/opt/homebrew') || 
      lowerPath.includes('/usr/local/cellar') ||
      lowerPath.includes('homebrew')) {
    return 'homebrew'
  }
  
  // Chocolatey (Windows)
  if (lowerPath.includes('chocolatey') || 
      lowerPath.includes('choco')) {
    return 'chocolatey'
  }
  
  // apt/dpkg (Linux)
  if (lowerPath.includes('/usr/bin') && process.platform === 'linux') {
    return 'apt'
  }
  
  // npm global
  if (lowerPath.includes('node_modules') || 
      lowerPath.includes('npm')) {
    return 'npm'
  }
  
  // pip
  if (lowerPath.includes('site-packages') || 
      lowerPath.includes('pip') ||
      lowerPath.includes('python')) {
    return 'pip'
  }
  
  return 'manual'
}

/**
 * Generate uninstall instructions based on installation method
 * 
 * Property 14: Uninstall Instructions Generation
 * @param toolName The name of the tool
 * @param installMethod The installation method
 * @param toolPath The installation path
 * @returns Array of uninstall instructions/commands
 */
export function generateUninstallInstructions(
  toolName: string,
  installMethod: ToolInfo['installMethod'],
  toolPath: string
): string[] {
  const instructions: string[] = []
  
  switch (installMethod) {
    case 'homebrew':
      instructions.push(`brew uninstall ${toolName}`)
      instructions.push(`# Or force uninstall: brew uninstall --force ${toolName}`)
      break
      
    case 'chocolatey':
      instructions.push(`choco uninstall ${toolName}`)
      instructions.push(`# Or force uninstall: choco uninstall ${toolName} --force`)
      break
      
    case 'apt':
      instructions.push(`sudo apt remove ${toolName}`)
      instructions.push(`# Or purge (remove config): sudo apt purge ${toolName}`)
      break
      
    case 'npm':
      instructions.push(`npm uninstall -g ${toolName}`)
      break
      
    case 'pip':
      instructions.push(`pip uninstall ${toolName}`)
      instructions.push(`# Or: pip3 uninstall ${toolName}`)
      break
      
    case 'manual':
    default:
      if (toolPath) {
        if (isWindows()) {
          instructions.push(`# Manual removal required`)
          instructions.push(`# Delete file: ${toolPath}`)
          instructions.push(`# Or check Programs and Features in Control Panel`)
        } else {
          instructions.push(`# Manual removal required`)
          instructions.push(`sudo rm ${toolPath}`)
          instructions.push(`# Or check if installed via system package manager`)
        }
      } else {
        instructions.push(`# Unable to determine uninstall method`)
        instructions.push(`# Please check your system's package manager`)
      }
      break
  }
  
  return instructions
}


/**
 * Get extended tool information including all paths and uninstall instructions
 * 
 * Property 13: Multiple Installation Locations
 * Property 14: Uninstall Instructions Generation
 * @param toolName The name of the tool
 * @returns Promise resolving to ExtendedToolInfo
 */
export async function getExtendedToolInfo(toolName: string): Promise<ExtendedToolInfo> {
  // Get all installation paths
  const allPaths = await getAllToolPaths(toolName)
  
  // Get version
  const versionResult = await executeSafe(`${toolName} --version`)
  const { version } = parseVersion(getVersionOutput(versionResult))
  
  // Determine primary path and install method
  const primaryPath = allPaths.length > 0 ? allPaths[0] : null
  const installMethod = identifyInstallMethod(primaryPath || '')
  
  // Generate uninstall instructions
  const uninstallInstructions = generateUninstallInstructions(
    toolName,
    installMethod,
    primaryPath || ''
  )
  
  return {
    name: toolName,
    displayName: toolName,
    version,
    path: primaryPath,
    isInstalled: allPaths.length > 0 && versionResult.success,
    installMethod,
    category: 'tool',
    allPaths,
    uninstallInstructions,
  }
}

/**
 * Find all installations of a tool across the system
 *
 * Property 13: Multiple Installation Locations
 * @param toolName The name of the tool to find
 * @returns Promise resolving to array of paths where the tool is installed
 */
export async function findAllInstallations(toolName: string): Promise<string[]> {
  const paths: string[] = []

  // First, use which/where to find in PATH
  const pathResults = await getAllToolPaths(toolName)
  paths.push(...pathResults)

  // Also scan PATH directories directly for the tool
  const pathDirs = parsePath()

  // Scan directories in parallel
  const results = await Promise.all(
    pathDirs.map(async (dir) => {
      try {
        // Check if directory exists
        try {
          await fsPromises.access(dir)
        } catch {
          return []
        }

        const files = await fsPromises.readdir(dir)
        const foundPaths: string[] = []

        for (const file of files) {
          const baseName = isWindows()
            ? path.basename(file, path.extname(file)).toLowerCase()
            : file.toLowerCase()

          if (baseName === toolName.toLowerCase()) {
            const fullPath = normalizePath(path.join(dir, file))
            const isExec = await isExecutable(path.join(dir, file))
            if (!paths.includes(fullPath) && isExec) {
              foundPaths.push(fullPath)
            }
          }
        }

        return foundPaths
      } catch {
        // Skip inaccessible directories
        return []
      }
    })
  )

  // Flatten results
  for (const dirPaths of results) {
    paths.push(...dirPaths)
  }

  return [...new Set(paths)] // Remove duplicates
}

/**
 * Detect CLI tools like Codex, OpenCode, etc.
 * 
 * Validates: Requirement 9.7
 * @param toolNames Array of tool names to detect
 * @returns Promise resolving to array of ExtendedToolInfo
 */
export async function detectCLITools(toolNames: string[]): Promise<ExtendedToolInfo[]> {
  const results: ExtendedToolInfo[] = []
  
  for (const toolName of toolNames) {
    const info = await getExtendedToolInfo(toolName)
    results.push(info)
  }
  
  return results
}

/**
 * PathScanner class providing an object-oriented interface
 */
export class PathScanner {
  /**
   * Parse the PATH environment variable
   */
  parsePath(): string[] {
    return parsePath()
  }
  
  /**
   * Scan a directory for executables
   */
  async scanDirectory(directory: string): Promise<ExecutableInfo[]> {
    return scanDirectory(directory)
  }

  /**
   * Scan all PATH directories
   */
  async scanAllPathDirectories(): Promise<ExecutableInfo[]> {
    return scanAllPathDirectories()
  }
  
  /**
   * Get extended tool information
   */
  async getExtendedToolInfo(toolName: string): Promise<ExtendedToolInfo> {
    return getExtendedToolInfo(toolName)
  }
  
  /**
   * Find all installations of a tool
   */
  async findAllInstallations(toolName: string): Promise<string[]> {
    return findAllInstallations(toolName)
  }
  
  /**
   * Detect CLI tools
   */
  async detectCLITools(toolNames: string[]): Promise<ExtendedToolInfo[]> {
    return detectCLITools(toolNames)
  }
  
  /**
   * Generate uninstall instructions
   */
  generateUninstallInstructions(
    toolName: string,
    installMethod: ToolInfo['installMethod'],
    toolPath: string
  ): string[] {
    return generateUninstallInstructions(toolName, installMethod, toolPath)
  }
  
  /**
   * Identify installation method from path
   */
  identifyInstallMethod(toolPath: string): ToolInfo['installMethod'] {
    return identifyInstallMethod(toolPath)
  }
}

// Export a default instance
export const pathScanner = new PathScanner()
