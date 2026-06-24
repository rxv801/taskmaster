// App entry point. Creates the BrowserWindow, sets up the tray icon, 
// calls all the other modules to initialise themselves, 
// and wires app lifecycle events (ready, quit, etc)

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import {
  startBrowserActivityBridge,
  stopBrowserActivityBridge,
} from './browser-activity-bridge.ts'
import { registerIpcHandlers } from './ipc-handlers.ts'
import { stopPythonWorker } from './python-bridge.ts'
import trayIconPath from './tray-icon.png?asset'

// __dirname is provided by electron-vite's module banner in the bundled output.

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let miniTimerWindow: BrowserWindow | null = null
let latestMiniTimerState: Record<string, unknown> | null = null
let isMiniTimerPinned = true

// Loads the renderer into a window. In development, electron-vite exposes its
// dev server URL via ELECTRON_RENDERER_URL; in a packaged build that variable
// is unset, so we load the bundled index.html from disk instead. The optional
// hashRoute (e.g. "/#/mini-timer") drives the renderer's HashRouter; for the
// file:// case the leading "/#" is stripped so it can be passed as a hash.
function loadRenderer(win: BrowserWindow, hashRoute = '') {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']

  if (devServerUrl) {
    win.loadURL(`${devServerUrl}${hashRoute}`)
    return
  }

  const indexHtml = path.join(__dirname, '../renderer/index.html')
  const hash = hashRoute.replace(/^\/#/, '')
  win.loadFile(indexHtml, hash ? { hash } : undefined)
}

function createTray() {
  const icon = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Taskmaster', click: () => { createWindow() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit() } },
  ])

  tray.setToolTip('Taskmaster')
  tray.setContextMenu(contextMenu)
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // The preload is bundled as an ES module (the app is "type": "module"),
      // and Electron only loads ESM preloads when the renderer is not sandboxed.
      // contextIsolation still keeps the renderer isolated from Node.
      sandbox: false,
    },
  })

  mainWindow = win

  win.on('closed', () => {
    mainWindow = null
  })

  loadRenderer(win)

  return win
}

function createMiniTimerWindow() {
  if (miniTimerWindow && !miniTimerWindow.isDestroyed()) {
    miniTimerWindow.show()
    miniTimerWindow.focus()
    sendMiniTimerStateToWindow()
    return miniTimerWindow
  }

  miniTimerWindow = new BrowserWindow({
    width: 320,
    height: 210,
    minWidth: 260,
    minHeight: 170,
    frame: false,
    resizable: true,
    alwaysOnTop: isMiniTimerPinned,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // The preload is bundled as an ES module (the app is "type": "module"),
      // and Electron only loads ESM preloads when the renderer is not sandboxed.
      // contextIsolation still keeps the renderer isolated from Node.
      sandbox: false,
    },
  })

  miniTimerWindow.on('closed', () => {
    miniTimerWindow = null
  })

  miniTimerWindow.webContents.once('did-finish-load', () => {
    sendMiniTimerStateToWindow()
  })

  loadRenderer(miniTimerWindow, '/#/mini-timer')

  return miniTimerWindow
}

function sendMiniTimerStateToWindow() {
  if (!miniTimerWindow || miniTimerWindow.isDestroyed()) {
    return
  }

  miniTimerWindow.webContents.send('taskmaster:mini-timer-state', {
    ...latestMiniTimerState,
    isPinned: isMiniTimerPinned,
  })
}

function sendMiniTimerCommandToMainWindow(command: string) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  mainWindow.webContents.send('taskmaster:mini-timer-command', command)
}

/* Registers mini timer window IPC beside the window lifecycle it controls. */
function registerMiniTimerIpcHandlers() {
  ipcMain.removeHandler('taskmaster:mini-timer-open')
  ipcMain.removeAllListeners('taskmaster:mini-timer-state')
  ipcMain.removeAllListeners('taskmaster:mini-timer-command')

  ipcMain.handle('taskmaster:mini-timer-open', () => {
    createMiniTimerWindow()
  })

  ipcMain.on('taskmaster:mini-timer-state', (_event, state: Record<string, unknown>) => {
    latestMiniTimerState = state
    sendMiniTimerStateToWindow()
  })

  ipcMain.on('taskmaster:mini-timer-command', (_event, command: string) => {
    if (command === 'close') {
      miniTimerWindow?.close()
      return
    }

    if (command === 'toggle-pin') {
      if (miniTimerWindow && !miniTimerWindow.isDestroyed()) {
        isMiniTimerPinned = !miniTimerWindow.isAlwaysOnTop()
        miniTimerWindow.setAlwaysOnTop(isMiniTimerPinned)
        sendMiniTimerStateToWindow()
      }
      return
    }

    if (command === 'open-main') {
      createWindow()
      return
    }

    sendMiniTimerCommandToMainWindow(command)
  })
}


app.whenReady().then(() => {
  startBrowserActivityBridge((payload) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('taskmaster:browser-activity', payload)
      }
    })
  })
  registerIpcHandlers()
  registerMiniTimerIpcHandlers()
  // The CV worker is started on demand (see python-bridge.ts) when the renderer
  // requests detection, not here — nothing runs while no session is active.
  createWindow()
  createTray()
})

// Safety net: force the worker down when the app quits, even if a consumer
// never released it, so no Python process outlives the app.
app.on('before-quit', () => {
  stopPythonWorker()
  stopBrowserActivityBridge()
})
