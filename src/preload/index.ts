import { contextBridge, ipcRenderer } from 'electron'

export const PROCESSING_EVENTS = {
  API_KEY_INVALID: 'api-key-invalid',
  NO_SCREENSHOTS: 'no-screenshots',
  INITIAL_SOLUTION_ERROR: 'initial-solution-error',
  SOLUTION_SUCCESS: 'solution-success',
  PROBLEM_EXTRACTED: 'problem-extracted',
  INITIAL_START: 'initial-start',
  RESET: 'reset',

  DEBUG_START: 'debug-start',
  DEBUG_SUCCESS: 'debug-success',
  DEBUG_ERROR: 'debug-error'
}

const electronAPI = {
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config: {
    apiKey?: string
    apiProvider?: 'openai' | 'gemini'
    extractionModel?: string
    solutionModel?: string
    debuggingModel?: string
    language?: string
  }) => ipcRenderer.invoke('update-config', config),
  checkApiKey: () => ipcRenderer.invoke('check-api-key'),
  validateApiKey: (apiKey: string) => ipcRenderer.invoke('validate-api-key', apiKey),
  getScreenshots: () => ipcRenderer.invoke('get-screenshots'),
  deleteScreenshot: (path: string) => ipcRenderer.invoke('delete-screenshot', path),
  toggleMainWindow: async () => {
    console.log('toggleMainWindow called from preload')
    try {
      const result = await ipcRenderer.invoke('toggle-main-window')
      return result
    } catch (error) {
      console.error('Error toggling main window:', error)
      throw error
    }
  },
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_: any, data: { path: string; preview: string }) => callback(data)
    ipcRenderer.on('screenshot-taken', subscription)
    return () => ipcRenderer.removeListener('screenshot-taken', subscription)
  },
  getPlatform: () => process.platform,
  triggerScreenshot: () => ipcRenderer.invoke('trigger-screenshot'),
  onDeleteLastScreenshot: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('screenshot-deleted', subscription)
    return () => ipcRenderer.removeListener('screenshot-deleted', subscription)
  },
  deleteLastScreenshot: () => ipcRenderer.invoke('delete-last-screenshot'),
  openSettingsPortal: () => ipcRenderer.invoke('open-settings-portal'),
  onShowSettings: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('show-settings-dialog', subscription)
    return () => ipcRenderer.removeListener('show-settings-dialog', subscription)
  },
  triggerProcessScreenshots: () => ipcRenderer.invoke('trigger-process-screenshots'),
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSolutionSuccess: (callback: (data: any) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProblemExtracted: (callback: (data: any) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
  },
  onResetView: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('reset-view', subscription)
    return () => ipcRenderer.removeListener('reset-view', subscription)
  },
  triggerReset: () => ipcRenderer.invoke('trigger-reset'),
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDebugSuccess: (callback: (data: any) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_SUCCESS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_SUCCESS, subscription)
  },
  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
  },
  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
  },
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke('update-content-dimensions', dimensions),
  openLink: (url: string) => ipcRenderer.invoke('openLink', url),
  onApiKeyInvalid: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.API_KEY_INVALID, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.API_KEY_INVALID, subscription)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener: (eventName: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(eventName, callback)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
