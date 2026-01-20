/**
 * Tests for PathScanner Module
 * 
 * Feature: dev-tools-manager
 * Tests Properties 12, 13, and 14 from the design document
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import {
  getPathSeparator,
  parsePath,
  scanDirectory,
  scanAllPathDirectories,
  identifyInstallMethod,
  generateUninstallInstructions,
  getExtendedToolInfo,
  findAllInstallations,
  PathScanner,
} from './pathScanner'
import { isWindows } from './commandExecutor'

describe('PathScanner', () => {
  describe('getPathSeparator', () => {
    it('should return correct separator for platform', () => {
      const separator = getPathSeparator()
      if (isWindows()) {
        expect(separator).toBe(';')
      } else {
        expect(separator).toBe(':')
      }
    })
  })

  describe('parsePath', () => {
    /**
     * Feature: dev-tools-manager, Property 12: PATH Scanning Completeness
     * **Validates: Requirements 9.1**
     * 
     * For any system PATH environment variable, the Detection Engine should
     * scan all directories in the PATH and identify all executable tools.
     */
    it('should return an array of paths', () => {
      const paths = parsePath()
      expect(Array.isArray(paths)).toBe(true)
    })

    it('should not contain empty strings', () => {
      const paths = parsePath()
      for (const p of paths) {
        expect(p.length).toBeGreaterThan(0)
      }
    })

    it('should not contain paths with only whitespace', () => {
      const paths = parsePath()
      for (const p of paths) {
        expect(p.trim()).toBe(p)
      }
    })

    // Property-based test: parsed paths should be non-empty strings
    it('Property 12: all parsed paths should be valid non-empty strings', () => {
      const paths = parsePath()
      
      for (const p of paths) {
        expect(typeof p).toBe('string')
        expect(p.length).toBeGreaterThan(0)
        expect(p.trim()).toBe(p)
      }
    })
  })

  describe('identifyInstallMethod', () => {
    it('should identify homebrew installations', () => {
      expect(identifyInstallMethod('/opt/homebrew/bin/node')).toBe('homebrew')
      expect(identifyInstallMethod('/usr/local/Cellar/node/bin/node')).toBe('homebrew')
    })

    it('should identify chocolatey installations', () => {
      expect(identifyInstallMethod('C:\\ProgramData\\chocolatey\\bin\\node.exe')).toBe('chocolatey')
    })

    it('should identify npm installations', () => {
      expect(identifyInstallMethod('/usr/local/lib/node_modules/.bin/eslint')).toBe('npm')
    })

    it('should identify pip installations', () => {
      expect(identifyInstallMethod('/usr/local/lib/python3.11/site-packages/pip')).toBe('pip')
    })

    it('should return manual for unknown paths', () => {
      expect(identifyInstallMethod('/some/random/path')).toBe('manual')
    })

    it('should handle null/empty paths', () => {
      expect(identifyInstallMethod('')).toBe('manual')
      expect(identifyInstallMethod(null as unknown as string)).toBe('manual')
    })

    // Property-based test: should always return a valid install method
    it('should always return a valid install method', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (path) => {
            const method = identifyInstallMethod(path)
            const validMethods = ['npm', 'pip', 'homebrew', 'apt', 'chocolatey', 'manual']
            return validMethods.includes(method as string)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('generateUninstallInstructions', () => {
    /**
     * Feature: dev-tools-manager, Property 14: Uninstall Instructions Generation
     * **Validates: Requirements 9.5**
     * 
     * For any detected tool, the system should provide uninstallation
     * instructions or commands appropriate for its installation method.
     */
    it('should generate homebrew uninstall instructions', () => {
      const instructions = generateUninstallInstructions('node', 'homebrew', '/opt/homebrew/bin/node')
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions.some(i => i.includes('brew uninstall'))).toBe(true)
    })

    it('should generate chocolatey uninstall instructions', () => {
      const instructions = generateUninstallInstructions('node', 'chocolatey', 'C:\\choco\\bin\\node.exe')
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions.some(i => i.includes('choco uninstall'))).toBe(true)
    })

    it('should generate npm uninstall instructions', () => {
      const instructions = generateUninstallInstructions('eslint', 'npm', '/usr/local/lib/node_modules/.bin/eslint')
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions.some(i => i.includes('npm uninstall -g'))).toBe(true)
    })

    it('should generate pip uninstall instructions', () => {
      const instructions = generateUninstallInstructions('requests', 'pip', '/usr/local/lib/python3.11/site-packages/requests')
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions.some(i => i.includes('pip uninstall'))).toBe(true)
    })

    it('should generate apt uninstall instructions', () => {
      const instructions = generateUninstallInstructions('git', 'apt', '/usr/bin/git')
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions.some(i => i.includes('apt remove') || i.includes('apt purge'))).toBe(true)
    })

    it('should generate manual uninstall instructions for unknown methods', () => {
      const instructions = generateUninstallInstructions('tool', 'manual', '/some/path/tool')
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions.some(i => i.includes('Manual') || i.includes('manual'))).toBe(true)
    })

    // Property-based test: should always return non-empty instructions
    it('Property 14: should always return non-empty instructions array', () => {
      const installMethods: Array<'npm' | 'pip' | 'homebrew' | 'apt' | 'chocolatey' | 'manual'> = 
        ['npm', 'pip', 'homebrew', 'apt', 'chocolatey', 'manual']
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom(...installMethods),
          fc.string(),
          (toolName, method, path) => {
            const instructions = generateUninstallInstructions(toolName, method, path)
            return Array.isArray(instructions) && instructions.length > 0
          }
        ),
        { numRuns: 100 }
      )
    })

    // Property-based test: instructions should contain the tool name for package managers
    it('Property 14: instructions should reference the tool name', () => {
      const packageManagerMethods: Array<'npm' | 'pip' | 'homebrew' | 'apt' | 'chocolatey'> = 
        ['npm', 'pip', 'homebrew', 'apt', 'chocolatey']
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][\w-]*$/.test(s)),
          fc.constantFrom(...packageManagerMethods),
          (toolName, method) => {
            const instructions = generateUninstallInstructions(toolName, method, '/some/path')
            // At least one instruction should contain the tool name
            return instructions.some(i => i.includes(toolName))
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('scanDirectory', () => {
    it('should return an array', async () => {
      const result = await scanDirectory('/nonexistent/path')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array for non-existent directory', async () => {
      const result = await scanDirectory('/definitely/not/a/real/path/12345')
      expect(result).toEqual([])
    })

    it('should scan existing directories', async () => {
      // Scan a directory that should exist on most systems
      const testDir = isWindows() ? 'C:\\Windows\\System32' : '/usr/bin'
      const result = await scanDirectory(testDir)

      // Should find at least some executables in system directories
      // (may be empty if permissions don't allow)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('scanAllPathDirectories', () => {
    /**
     * Feature: dev-tools-manager, Property 12: PATH Scanning Completeness
     * **Validates: Requirements 9.1**
     */
    it('should return an array of executables', async () => {
      const executables = await scanAllPathDirectories()
      expect(Array.isArray(executables)).toBe(true)
    })

    it('should have valid structure for each executable', async () => {
      const executables = await scanAllPathDirectories()

      for (const exec of executables) {
        expect(exec).toHaveProperty('name')
        expect(exec).toHaveProperty('path')
        expect(exec).toHaveProperty('directory')
        expect(typeof exec.name).toBe('string')
        expect(typeof exec.path).toBe('string')
        expect(typeof exec.directory).toBe('string')
      }
    })

    // Property-based test: all executables should have non-empty properties
    it('Property 12: all executables should have valid non-empty properties', async () => {
      const executables = await scanAllPathDirectories()

      for (const exec of executables) {
        expect(exec.name.length).toBeGreaterThan(0)
        expect(exec.path.length).toBeGreaterThan(0)
        expect(exec.directory.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getExtendedToolInfo', () => {
    /**
     * Feature: dev-tools-manager, Property 13: Multiple Installation Locations
     * **Validates: Requirements 9.6**
     * 
     * For any tool that exists in multiple locations, the system should
     * return all installation locations in the results.
     */
    it('should return extended tool info structure', async () => {
      const info = await getExtendedToolInfo('node')
      
      expect(info).toHaveProperty('name')
      expect(info).toHaveProperty('displayName')
      expect(info).toHaveProperty('version')
      expect(info).toHaveProperty('path')
      expect(info).toHaveProperty('isInstalled')
      expect(info).toHaveProperty('allPaths')
      expect(info).toHaveProperty('uninstallInstructions')
      
      expect(Array.isArray(info.allPaths)).toBe(true)
      expect(Array.isArray(info.uninstallInstructions)).toBe(true)
    })

    it('should handle non-existent tools gracefully', async () => {
      const info = await getExtendedToolInfo('nonexistent_tool_xyz_12345')
      
      expect(info.isInstalled).toBe(false)
      expect(info.allPaths).toEqual([])
    })

    // Property-based test: should always return valid structure
    it('Property 13: should always return valid ExtendedToolInfo structure', async () => {
      // Test with a few known tool names
      const toolNames = ['node', 'npm', 'git', 'nonexistent_tool']
      
      for (const toolName of toolNames) {
        const info = await getExtendedToolInfo(toolName)
        
        expect(typeof info.name).toBe('string')
        expect(typeof info.displayName).toBe('string')
        expect(info.version === null || typeof info.version === 'string').toBe(true)
        expect(info.path === null || typeof info.path === 'string').toBe(true)
        expect(typeof info.isInstalled).toBe('boolean')
        expect(Array.isArray(info.allPaths)).toBe(true)
        expect(Array.isArray(info.uninstallInstructions)).toBe(true)
      }
    })
  })

  describe('findAllInstallations', () => {
    /**
     * Feature: dev-tools-manager, Property 13: Multiple Installation Locations
     * **Validates: Requirements 9.6**
     */
    it('should return an array of paths', async () => {
      const paths = await findAllInstallations('node')
      expect(Array.isArray(paths)).toBe(true)
    })

    it('should return empty array for non-existent tools', async () => {
      const paths = await findAllInstallations('nonexistent_tool_xyz_12345')
      expect(paths).toEqual([])
    })

    it('should not contain duplicates', async () => {
      const paths = await findAllInstallations('node')
      const uniquePaths = [...new Set(paths)]
      expect(paths.length).toBe(uniquePaths.length)
    })
  })

  describe('PathScanner class', () => {
    let scanner: PathScanner

    beforeEach(() => {
      scanner = new PathScanner()
    })

    it('should parse PATH', () => {
      const paths = scanner.parsePath()
      expect(Array.isArray(paths)).toBe(true)
    })

    it('should scan directories', () => {
      const result = scanner.scanDirectory('/nonexistent')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should scan all PATH directories', () => {
      const result = scanner.scanAllPathDirectories()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should get extended tool info', async () => {
      const info = await scanner.getExtendedToolInfo('node')
      expect(info).toHaveProperty('allPaths')
      expect(info).toHaveProperty('uninstallInstructions')
    })

    it('should find all installations', async () => {
      const paths = await scanner.findAllInstallations('node')
      expect(Array.isArray(paths)).toBe(true)
    })

    it('should generate uninstall instructions', () => {
      const instructions = scanner.generateUninstallInstructions('test', 'npm', '/path')
      expect(Array.isArray(instructions)).toBe(true)
      expect(instructions.length).toBeGreaterThan(0)
    })

    it('should identify install method', () => {
      const method = scanner.identifyInstallMethod('/opt/homebrew/bin/node')
      expect(method).toBe('homebrew')
    })
  })
})
