/// <reference types="vite/client" />

import type {
  ActivityMonitorStartOptions,
  ActivityMonitorState,
} from '../shared/activityMonitoring'
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
      startActivityMonitoring: (options: ActivityMonitorStartOptions) => void
      pauseActivityMonitoring: () => void
      stopActivityMonitoring: () => void
      onActivityMonitorState: (callback: (state: ActivityMonitorState) => void) => () => void
      onMiniTimerState: (callback: (state: MiniTimerState | null) => void) => () => void
      onMiniTimerCommand: (callback: (command: MiniTimerCommand) => void) => () => void
    }
  }
}

export {}
