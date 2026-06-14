export type MiniTimerStatus = 'idle' | 'running' | 'paused' | 'completed'
export type MiniTimerMode = 'pomodoro' | 'deepSesh'
export type MiniTimerCommand =
  | 'pause'
  | 'resume'
  | 'stop'
  | 'open-main'
  | 'close'
  | 'toggle-pin'

export type MiniTimerState = {
  mode: MiniTimerMode
  status: MiniTimerStatus
  isPinned: boolean
  modeLabel: string
  statusLabel: string
  phaseLabel: string
  formattedTime: string
  helperText: string
}
