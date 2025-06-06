import { BrowserWindow, ipcMain, shell } from 'electron'
import { configManager } from './config-manager'
import { state } from '../index'
import { ProcessingManager } from './processing-manager'
export interface IIPCHandler {
  getMainWindow: () => BrowserWindow | null
  takeScreenshot: () => Promise<string>
  getImagePreview: (filePath: string) => Promise<string>
  clearQueues: () => void
  setView: (view: 'queue' | 'solutions' | 'debug') => void
  getView: () => 'queue' | 'solutions' | 'debug'
  getScreenshotQueue: () => string[]
  getExtraScreenshotQueue: () => string[]
  moveWindowLeft: () => void
  moveWindowRight: () => void
  moveWindowUp: () => void
  moveWindowDown: () => void
  toggleMainWindow: () => void
  isVisible: () => boolean
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS
  processingManager: ProcessingManager | null
  setWindowDimensions: (width: number, height: number) => void
}

export function initializeIpcHandler(deps: IIPCHandler): void {
  ipcMain.handle('get-config', () => {
    return configManager.loadConfig()
  })

  ipcMain.handle('update-config', (_event, updates) => {
    return configManager.updateConfig(updates)
  })

  ipcMain.handle('check-api-key', () => {
    return configManager.hasApiKey()
  })

  ipcMain.handle('validate-api-key', async (_event, apiKey) => {
    if (!configManager.isValidApiKeyFormat(apiKey)) {
      return {
        valid: false,
        error: 'Invalid API key format'
      }
    }

    const result = await configManager.testApiKey(apiKey)
    return result
  })

  ipcMain.handle('get-screenshots', async () => {
    try {
      let previews: { path: string; preview: string }[] = []
      const currentView = deps.getView()
      console.log('currentView', currentView)

      if (currentView === 'queue') {
        const queue = deps.getScreenshotQueue()
        previews = await Promise.all(
          queue.map(async (path) => {
            const preview = await deps.getImagePreview(path)
            return { path, preview }
          })
        )
      } else {
        const queue = deps.getExtraScreenshotQueue()
        previews = await Promise.all(
          queue.map(async (path) => {
            const preview = await deps.getImagePreview(path)
            return { path, preview }
          })
        )
      }

      return previews
    } catch (error) {
      console.error('Error getting screenshots:', error)
      throw error
    }
  })
  ipcMain.handle('delete-screenshot', async (_, path: string) => {
    return deps.deleteScreenshot(path)
  })
  ipcMain.handle('trigger-screenshot', async () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      try {
        const screenshotPath = await deps.takeScreenshot()
        const preview = await deps.getImagePreview(screenshotPath)
        mainWindow.webContents.send('screenshot-taken', { path: screenshotPath, preview })
        return { success: true }
      } catch (error) {
        console.error('Error triggering screenshot:', error)
        return { success: false, error: 'Failed to take screenshot' }
      }
    }
    return { success: false, error: 'Main window not found' }
  })
  ipcMain.handle('toggle-main-window', async () => {
    return deps.toggleMainWindow()
  })
  ipcMain.handle('delete-last-screenshot', async () => {
    try {
      const queue =
        deps.getView() === 'queue' ? deps.getScreenshotQueue() : deps.getExtraScreenshotQueue()
      console.log('queue', queue)

      if (queue.length === 0) {
        return { success: false, error: 'No screenshots to delete' }
      }

      const lastScreenshot = queue[queue.length - 1]
      const result = await deps.deleteScreenshot(lastScreenshot)

      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('screenshot-deleted')
      }

      return result
    } catch (error) {
      console.error('Error deleting last screenshot:', error)
      return { success: false, error: 'Failed to delete screenshot' }
    }
  })
  ipcMain.handle('open-settings-portal', async () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('show-settings-dialog')
      return { success: true }
    }
    return { success: false, error: 'Main window not found' }
  })
  ipcMain.handle('trigger-process-screenshots', async () => {
    try {
      if (!configManager.hasApiKey()) {
        const mainWindow = deps.getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send(deps.PROCESSING_EVENTS.API_KEY_INVALID)
        }
        return { success: false, error: 'No API key found' }
      }
      await deps.processingManager?.processScreenshots()
      return { success: true }
    } catch (error) {
      console.error('Error triggering process screenshots:', error)
      return { success: false, error: 'Failed to process screenshots' }
    }
  })
  ipcMain.handle('trigger-reset', async () => {
    try {
      deps.processingManager?.cancelOngoingRequest()

      deps.clearQueues()
      deps.setView('queue')

      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('reset-view')
      }
      return { success: true }
    } catch (error) {
      console.error('Error triggering reset:', error)
      return { success: false, error: 'Failed to reset' }
    }
  })
  ipcMain.handle('set-window-dimensions', (_, width: number, height: number) => {
    return deps.setWindowDimensions(width, height)
  })
  ipcMain.handle(
    'update-content-dimensions',
    async (_, { width, height }: { width: number; height: number }) => {
      console.log('update-content-dimensions', width, height)
      if (width && height) {
        deps.setWindowDimensions(width, height)
      }
    }
  )
  ipcMain.handle('openLink', (_, url: string) => {
    try {
      console.log('openLink', url)
      shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('Error opening link:', error)
      return { success: false, error: 'Failed to open link' }
    }
  })
}
