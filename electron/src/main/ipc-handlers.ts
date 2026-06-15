// Registers all ipcMain.handle() and ipcMain.on() listeners.
// This is the entry point for every message the renderer sends.
import { ipcMain } from 'electron'
import { detectCommonWindowsApps } from './appDetection/detectCommonWindowsApps.ts'
import {
  pauseActivityMonitoring,
  startActivityMonitoring,
  stopActivityMonitoring,
} from './activity-monitor.ts'
import type { ActivityMonitorStartOptions } from '../shared/activityMonitoring.ts'

export function registerIpcHandlers() {
  ipcMain.removeHandler('taskmaster:detect-common-apps')
  ipcMain.removeAllListeners('taskmaster:activity-monitor-start')
  ipcMain.removeAllListeners('taskmaster:activity-monitor-pause')
  ipcMain.removeAllListeners('taskmaster:activity-monitor-stop')

  ipcMain.handle('taskmaster:detect-common-apps', () => {
    const detectedApps = detectCommonWindowsApps()

    console.log('[Taskmaster] Detected common apps:')
    console.log(JSON.stringify(detectedApps, null, 2))  

    return detectedApps
  })

  /* Renderer controls the session lifecycle; main owns OS window polling. */
  ipcMain.on('taskmaster:activity-monitor-start', (event, options: ActivityMonitorStartOptions) => {
    const sender = event.sender

    startActivityMonitoring((state) => {
      if (!sender.isDestroyed()) {
        sender.send('taskmaster:activity-monitor-state', state)
      }
    }, options)
  })

  ipcMain.on('taskmaster:activity-monitor-pause', () => {
    pauseActivityMonitoring()
  })

  ipcMain.on('taskmaster:activity-monitor-stop', () => {
    stopActivityMonitoring()
  })
}
