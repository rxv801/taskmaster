/// <reference types="vite/client" />

type DetectedCommonApp = {
  id: string
  displayName: string
  category: 'productivity' | 'distraction' | 'browser'
  executablePath: string
  defaultStatus: 'allowed' | 'blocked'
}

declare global {
  interface Window {
    taskmaster: {
      detectCommonApps: () => Promise<DetectedCommonApp[]>
    }
  }
}

export {}