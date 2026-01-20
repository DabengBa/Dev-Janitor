/**
 * Dev Janitor - Main Process Entry
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

import { app, BrowserWindow, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerAllIPCHandlers, cleanupIPCHandlers, areIPCHandlersRegistered } from './ipcHandlers'
import { initAutoUpdater, shouldEnableAutoUpdater } from './autoUpdater'
import { cspManager } from './security'

// Add process-level error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // Log but don't crash the app
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Log but don't crash the app
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '../..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

// In production (asar), the structure is different
// __dirname points to resources/app.asar/dist-electron
// We need to find dist relative to that
const isDev = !!VITE_DEV_SERVER_URL
const getRendererPath = () => {
  if (isDev) {
    return RENDERER_DIST
  }
  // In production, dist is at the same level as dist-electron inside asar
  return path.join(__dirname, '../dist')
}

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL 
  ? path.join(process.env.APP_ROOT, 'public') 
  : getRendererPath()

let win: BrowserWindow | null

function createWindow() {
  const publicPath = process.env.VITE_PUBLIC || path.join(process.env.APP_ROOT || '', 'public')
  
  // Determine preload script path - handle both dev and production
  const preloadPath = isDev
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.cjs')
  
  console.log('[Main] Creating window with preload:', preloadPath)
  console.log('[Main] isDev:', isDev)
  console.log('[Main] __dirname:', __dirname)

  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(publicPath, 'icon.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      // Enable sandbox for better security on Mac
      sandbox: false, // Set to false to allow preload script to work properly
    },
    title: 'Dev Tools Manager',
    // Mac-specific: show window when ready to prevent white flash
    show: false,
    autoHideMenuBar: true,
  })

  // Show window when ready to render (prevents white screen flash on Mac)
  win.once('ready-to-show', () => {
    console.log('[Main] Window ready to show')
    win?.show()
  })

  // Add error handling for renderer process
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Main] Failed to load:', { errorCode, errorDescription, validatedURL })
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Render process gone:', details)
  })

  win.webContents.on('unresponsive', () => {
    console.error('[Main] Window became unresponsive')
  })

  win.webContents.on('console-message', (_event, level, message) => {
    const levelNames = ['verbose', 'info', 'warning', 'error']
    console.log(`[Renderer ${levelNames[level] || level}] ${message}`)
  })

  // Apply Content Security Policy (Requirement 3.1)
  cspManager.applyToWindow(win, {
    isDevelopment: !!VITE_DEV_SERVER_URL,
    devServerUrl: VITE_DEV_SERVER_URL,
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    console.log('[Main] Loading dev server URL:', VITE_DEV_SERVER_URL)
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    const indexPath = path.join(getRendererPath(), 'index.html')
    console.log('[Main] Loading file:', indexPath)
    win.loadFile(indexPath)
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
// Validates: Requirement 11.1 - IPC handlers stay active on macOS until app quits
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On non-macOS platforms, quit the app when all windows are closed
    // Cleanup will happen in 'before-quit' event
    app.quit()
  }
  // On macOS, keep the app running (standard macOS behavior)
  // IPC handlers remain active for when user clicks dock icon
  win = null
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Register all IPC handlers before creating the window
  // Validates: Requirement 11.4 - Prevent duplicate registration
  if (!areIPCHandlersRegistered()) {
    registerAllIPCHandlers()
  }
  createWindow()
  
  // Initialize auto-updater in production builds
  if (win && shouldEnableAutoUpdater()) {
    initAutoUpdater(win)
  }
})

// Cleanup on app quit
// Validates: Requirements 11.2, 11.3 - Clean up IPC handlers on Cmd+Q or app quit
app.on('before-quit', () => {
  cleanupIPCHandlers()
})
