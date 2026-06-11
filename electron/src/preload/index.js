// Uses contextBridge.exposeInMainWorld() to give the renderer a safe, limited API. 
// Example: window.taskmaster.startSession(). 
// The renderer can never call Node directly - everything goes through here.

const { contextBridge, ipcRenderer } = require('electron')

console.log('Taskmaster preload loaded')

contextBridge.exposeInMainWorld('taskmaster', {
  detectCommonApps: () => ipcRenderer.invoke('taskmaster:detect-common-apps'),
})