// Uses contextBridge.exposeInMainWorld() to give the renderer a safe, limited API. 
// Example: window.taskmaster.startSession(). 
// The renderer can never call Node directly - everything goes through here.

const { contextBridge, ipcRenderer } = require('electron')

console.log('Taskmaster preload loaded')

contextBridge.exposeInMainWorld('taskmaster', {
  detectCommonApps: () => ipcRenderer.invoke('taskmaster:detect-common-apps'),

  // On-demand CV worker control. request() before connecting to the worker's
  // WebSocket, release() when done — each request must be paired with a release.
  cv: {
    request: () => ipcRenderer.send('taskmaster:cv-request'),
    release: () => ipcRenderer.send('taskmaster:cv-release'),
  },

  openMiniTimer: () => ipcRenderer.invoke('taskmaster:mini-timer-open'),
  sendMiniTimerState: (state) =>
    ipcRenderer.send('taskmaster:mini-timer-state', state),
  sendMiniTimerCommand: (command) =>
    ipcRenderer.send('taskmaster:mini-timer-command', command),
  setBrowserMonitoringActive: (isActive) =>
    ipcRenderer.send('taskmaster:browser-monitoring-active', isActive),
  startDesktopMonitoring: () =>
    ipcRenderer.send('taskmaster:desktop-monitoring-start'),
  pauseDesktopMonitoring: () =>
    ipcRenderer.send('taskmaster:desktop-monitoring-pause'),
  stopDesktopMonitoring: () =>
    ipcRenderer.send('taskmaster:desktop-monitoring-stop'),
  notifyFocusWarning: (warning) =>
    ipcRenderer.send('taskmaster:focus-warning', warning),
  onDesktopActivity: (callback) => {
    const listener = (_event, activity) => callback(activity)

    ipcRenderer.on('taskmaster:desktop-activity', listener)

    return () => {
      ipcRenderer.removeListener('taskmaster:desktop-activity', listener)
    }
  },
  onBrowserActivity: (callback) => {
    const listener = (_event, activity) => callback(activity)

    ipcRenderer.on('taskmaster:browser-activity', listener)

    return () => {
      ipcRenderer.removeListener('taskmaster:browser-activity', listener)
    }
  },
  onMiniTimerState: (callback) => {
    const listener = (_event, state) => callback(state)

    ipcRenderer.on('taskmaster:mini-timer-state', listener)

    return () => {
      ipcRenderer.removeListener('taskmaster:mini-timer-state', listener)
    }
  },
  onMiniTimerCommand: (callback) => {
    const listener = (_event, command) => callback(command)

    ipcRenderer.on('taskmaster:mini-timer-command', listener)

    return () => {
      ipcRenderer.removeListener('taskmaster:mini-timer-command', listener)
    }
  },
})
