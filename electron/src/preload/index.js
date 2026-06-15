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
})