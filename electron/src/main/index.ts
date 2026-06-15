// App entry point. Creates the BrowserWindow, sets up the tray icon, 
// calls all the other modules to initialise themselves, 
// and wires app lifecycle events (ready, quit, etc)

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerIpcHandlers } from './ipc-handlers.ts'



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let miniTimerWindow: BrowserWindow | null = null
let latestMiniTimerState: Record<string, unknown> | null = null
let isMiniTimerPinned = true

function getRendererUrl(hashRoute = '') {
  return `http://localhost:5173${hashRoute}`
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray-icon.png'))
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
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow = win

  win.on('closed', () => {
    mainWindow = null
  })

  win.loadURL(getRendererUrl())

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
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  miniTimerWindow.on('closed', () => {
    miniTimerWindow = null
  })

  miniTimerWindow.webContents.once('did-finish-load', () => {
    sendMiniTimerStateToWindow()
  })

  miniTimerWindow.loadURL(getRendererUrl('/#/mini-timer'))

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
  registerIpcHandlers()
  registerMiniTimerIpcHandlers()
  createWindow()
  createTray()
})
