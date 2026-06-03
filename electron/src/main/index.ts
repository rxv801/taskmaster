// App entry point. Creates the BrowserWindow, sets up the tray icon, 
// calls all the other modules to initialise themselves, 
// and wires app lifecycle events (ready, quit, etc)

import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tray: Tray | null = null

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
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadURL('http://localhost:5173')
}

app.whenReady().then(() => {
  createWindow()
  createTray()
})
