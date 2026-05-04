// Uses contextBridge.exposeInMainWorld() to give the renderer a safe, limited API. 
// Example: window.taskmaster.startSession(). 
// The renderer can never call Node directly — everything goes through here.