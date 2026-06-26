// Registers all ipcMain.handle() and ipcMain.on() listeners.
// This is the entry point for every message the renderer sends — start session, save settings, get history, etc.
import { ipcMain } from 'electron'
import { detectCommonApps } from './appDetection/detectCommonApps.ts'
import { requestPythonWorker, releasePythonWorker } from './python-bridge.ts'
import {
  getLatestDesktopActivity,
  pauseDesktopActivityMonitoring,
  startDesktopActivityMonitoring,
  stopDesktopActivityMonitoring,
} from './activity-monitor.ts'
import {
  getLatestBrowserActivity,
  setBrowserMonitoringActive,
} from './browser-activity-bridge.ts'

export function registerIpcHandlers() {
  ipcMain.removeHandler('taskmaster:detect-common-apps')
  ipcMain.removeAllListeners('taskmaster:browser-monitoring-active')
  ipcMain.removeAllListeners('taskmaster:desktop-monitoring-start')
  ipcMain.removeAllListeners('taskmaster:desktop-monitoring-pause')
  ipcMain.removeAllListeners('taskmaster:desktop-monitoring-stop')

  ipcMain.handle('taskmaster:detect-common-apps', () => {
    const detectedApps = detectCommonApps()

    console.log('[Taskmaster] Detected common apps:')
    console.log(JSON.stringify(detectedApps, null, 2))

    return detectedApps
  })

  // On-demand CV worker control. The renderer fires these (fire-and-forget) when
  // it starts/stops wanting detection; the worker is reference-counted in
  // python-bridge.ts. removeAllListeners guards against double-registration.
  ipcMain.removeAllListeners('taskmaster:cv-request')
  ipcMain.removeAllListeners('taskmaster:cv-release')
  ipcMain.on('taskmaster:cv-request', () => requestPythonWorker())
  ipcMain.on('taskmaster:cv-release', () => releasePythonWorker())

  /* Renderer enables tab reporting only while a focus session is active. */
  ipcMain.on('taskmaster:browser-monitoring-active', (event, isActive: boolean) => {
    setBrowserMonitoringActive(isActive)

    if (isActive) {
      const latestActivity = getLatestBrowserActivity()

      if (latestActivity) {
        event.sender.send('taskmaster:browser-activity', latestActivity)
      }
    }
  })

  ipcMain.on('taskmaster:desktop-monitoring-start', (event) => {
    const sender = event.sender

    startDesktopActivityMonitoring((activity) => {
      if (!sender.isDestroyed()) {
        sender.send('taskmaster:desktop-activity', activity)
      }
    })

    const latestActivity = getLatestDesktopActivity()

    if (latestActivity) {
      sender.send('taskmaster:desktop-activity', latestActivity)
    }
  })

  ipcMain.on('taskmaster:desktop-monitoring-pause', () => {
    pauseDesktopActivityMonitoring()
  })

  ipcMain.on('taskmaster:desktop-monitoring-stop', () => {
    stopDesktopActivityMonitoring()
  })
}
