// Uses contextBridge.exposeInMainWorld() to give the renderer a safe, limited API. 
// Example: window.taskmaster.startSession(). 
// The renderer can never call Node directly - everything goes through here.

const { contextBridge, ipcRenderer } = require('electron')

console.log('Taskmaster preload loaded')

contextBridge.exposeInMainWorld('taskmaster', {
  detectCommonApps: () => ipcRenderer.invoke('taskmaster:detect-common-apps'),
  openMiniTimer: () => ipcRenderer.invoke('taskmaster:mini-timer-open'),
  sendMiniTimerState: (state) =>
    ipcRenderer.send('taskmaster:mini-timer-state', state),
  sendMiniTimerCommand: (command) =>
    ipcRenderer.send('taskmaster:mini-timer-command', command),
  startActivityMonitoring: (options) =>
    ipcRenderer.send('taskmaster:activity-monitor-start', options),
  pauseActivityMonitoring: () =>
    ipcRenderer.send('taskmaster:activity-monitor-pause'),
  stopActivityMonitoring: () =>
    ipcRenderer.send('taskmaster:activity-monitor-stop'),
  onActivityMonitorState: (callback) => {
    const listener = (_event, state) => callback(state)

    ipcRenderer.on('taskmaster:activity-monitor-state', listener)

    return () => {
      ipcRenderer.removeListener('taskmaster:activity-monitor-state', listener)
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
