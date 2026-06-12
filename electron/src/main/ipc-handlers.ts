// Registers all ipcMain.handle() and ipcMain.on() listeners. 
// This is the entry point for every message the renderer sends — start session, save settings, get history, etc.import { ipcMain } from 'electron'
import { ipcMain } from 'electron'
import { detectCommonWindowsApps } from './appDetection/detectCommonWindowsApps.ts'

export function registerIpcHandlers() {
  ipcMain.removeHandler('taskmaster:detect-common-apps')

  ipcMain.handle('taskmaster:detect-common-apps', () => {
    const detectedApps = detectCommonWindowsApps()

    console.log('[Taskmaster] Detected common apps:')
    console.log(JSON.stringify(detectedApps, null, 2))  

    return detectedApps
  })
}