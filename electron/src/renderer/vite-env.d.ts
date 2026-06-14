/// <reference types="vite/client" />

import type { MiniTimerCommand, MiniTimerState } from './types/miniTimer'

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
      openMiniTimer: () => Promise<void>
      sendMiniTimerState: (state: MiniTimerState) => void
      sendMiniTimerCommand: (command: MiniTimerCommand) => void
      onMiniTimerState: (callback: (state: MiniTimerState | null) => void) => () => void
      onMiniTimerCommand: (callback: (command: MiniTimerCommand) => void) => () => void
    }
  }
}

export {}
