/// <reference types="vite/client" />

import type { BrowserActivityPayload } from '../shared/browserActivity'
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
      setBrowserMonitoringActive: (isActive: boolean) => void
      onBrowserActivity: (callback: (activity: BrowserActivityPayload) => void) => () => void
      onMiniTimerState: (callback: (state: MiniTimerState | null) => void) => () => void
      onMiniTimerCommand: (callback: (command: MiniTimerCommand) => void) => () => void
    }
  }
}

export {}
