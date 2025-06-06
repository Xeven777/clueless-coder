import { app, shell, BrowserWindow, screen } from 'electron'
import path, { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import { initializeIpcHandler } from './lib/ipc-handler'
import { KeyboardShortcutHelper } from './lib/keyboard-shortcut'
import { ScreenshotManager } from './lib/screenshot-manager'
import { ProcessingManager } from './lib/processing-manager'
import { configManager } from './lib/config-manager'
export const state = {
  mainWindow: null as BrowserWindow | null,
  isWindowVisible: false,
  windowPosition: null as { x: number; y: number } | null,
  windowSize: null as { width: number; height: number } | null,
  screenWidth: 0,
  screenHeight: 0,
  step: 0,
  currentX: 0,
  currentY: 0,

  keyboardShortcutHelper: null as KeyboardShortcutHelper | null,
  screenshotManager: null as ScreenshotManager | null,
  processingManager: null as ProcessingManager | null,

  view: 'queue' as 'queue' | 'solutions' | 'debug',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  problemInfo: null as any,
  hasDebugged: false,

  PROCESSING_EVENTS: {
    NO_SCREENSHOTS: 'processing-no-screenshots',
    API_KEY_INVALID: 'api-key-invalid',
    INITIAL_START: 'initial-start',
    PROBLEM_EXTRACTED: 'problem-extracted',
    SOLUTION_SUCCESS: 'solution-success',
    INITIAL_SOLUTION_ERROR: 'solution-error',
    DEBUG_START: 'debug-start',
    DEBUG_SUCCESS: 'debug-success',
    DEBUG_ERROR: 'debug-error'
  }
}

async function createWindow(): Promise<void> {
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore()
    state.mainWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workAreaSize
  state.screenWidth = workArea.width
  state.screenHeight = workArea.height

  state.step = 60
  state.currentY = 50

  // Create the browser window.
  const windowSettings: Electron.BrowserWindowConstructorOptions = {
    width: 800,
    height: 600,
    minWidth: 750,
    minHeight: 550,
    x: state.currentX,
    y: state.currentY,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    hasShadow: false,
    opacity: 1.0,
    backgroundColor: '#00000000',
    focusable: true,
    skipTaskbar: true,
    type: 'panel',
    paintWhenInitiallyHidden: true,
    titleBarStyle: 'hidden',
    enableLargerThanScreen: true,
    movable: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      scrollBounce: true
    }
  }

  state.mainWindow = new BrowserWindow(windowSettings)

  state.mainWindow.on('ready-to-show', () => {
    state.mainWindow?.show()
  })

  state.mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    state.mainWindow?.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    state.mainWindow?.loadFile(join(__dirname, '../renderer/index.html'))
  }

  state.mainWindow.webContents.setZoomFactor(1)
  //TODO: Comment this out when not in development
  // state.mainWindow.webContents.openDevTools()
  state.mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  state.mainWindow.setContentProtection(true)

  state.mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  })
  state.mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)

  if (process.platform === 'darwin') {
    state.mainWindow.setHiddenInMissionControl(true)
    state.mainWindow.setWindowButtonVisibility(false)
    state.mainWindow.setBackgroundColor('#00000000')

    state.mainWindow.setSkipTaskbar(true)
    state.mainWindow.setHasShadow(false)
  }

  state.mainWindow.on('close', () => {
    state.mainWindow = null
    state.isWindowVisible = false
  })

  state.mainWindow.webContents.setBackgroundThrottling(false)
  state.mainWindow.webContents.setFrameRate(60)

  state.mainWindow.on('move', handleWindowMove)
  state.mainWindow.on('resize', handleWindowResize)
  state.mainWindow.on('closed', handleWindowClosed)

  const bounds = state.mainWindow.getBounds()
  state.windowPosition = { x: bounds.x, y: bounds.y }
  state.windowSize = { width: bounds.width, height: bounds.height }
  state.currentX = bounds.x
  state.currentY = bounds.y
  state.isWindowVisible = true

  const savedOpacity = configManager.getOpacity()
  console.log('savedOpacity', savedOpacity)

  state.mainWindow.showInactive()

  if (savedOpacity <= 0.1) {
    console.log('Initial opacity too low, setting to 0 and hiding window')
    state.mainWindow.setOpacity(0)
    state.isWindowVisible = false
  } else {
    console.log('Setting opacity to', savedOpacity)
    state.mainWindow.setOpacity(savedOpacity)
    state.isWindowVisible = true
  }
}

function getMainWindow(): BrowserWindow | null {
  return state.mainWindow
}

async function takeScreenshot(): Promise<string> {
  if (!state.mainWindow) throw new Error('Main window not found')

  return (
    state.screenshotManager?.takeScreenshot(
      () => hideMainWindow(),
      () => showMainWindow()
    ) || ''
  )
}

async function getImagePreview(filePath: string): Promise<string> {
  return state.screenshotManager?.getImagePreview(filePath) || ''
}

function setView(view: 'queue' | 'solutions' | 'debug'): void {
  state.view = view
  state.screenshotManager?.setView(view)
}

function getView(): 'queue' | 'solutions' | 'debug' {
  return state.view
}

function clearQueues(): void {
  state.screenshotManager?.clearQueues()
  state.problemInfo = null
  setView('queue')
}

function getScreenshotQueue(): string[] {
  return state.screenshotManager?.getScreenshotQueue() || []
}

function getExtraScreenshotQueue(): string[] {
  return state.screenshotManager?.getExtraScreenshotQueue() || []
}

async function deleteScreenshot(path: string): Promise<{ success: boolean; error?: string }> {
  return (
    state.screenshotManager?.deleteScreenshot(path) || {
      success: false,
      error: 'Failed to delete screenshot'
    }
  )
}

function handleWindowMove(): void {
  if (!state.mainWindow) return

  const bounds = state.mainWindow.getBounds()
  state.windowPosition = { x: bounds.x, y: bounds.y }
  state.currentX = bounds.x
  state.currentY = bounds.y
}

function handleWindowResize(): void {
  if (!state.mainWindow) return

  const bounds = state.mainWindow.getBounds()
  state.windowSize = { width: bounds.width, height: bounds.height }
}

function handleWindowClosed(): void {
  state.mainWindow = null
  state.isWindowVisible = false
  state.windowPosition = null
  state.windowSize = null
}

function moveWindowHorizontal(updateFn: (x: number) => number): void {
  if (!state.mainWindow) return
  state.currentX = updateFn(state.currentX)
  state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY))
}

function moveWindowVertical(updateFn: (y: number) => number): void {
  if (!state.mainWindow) return

  const newY = updateFn(state.currentY)

  const maxUpLimit = (-(state.windowSize?.height || 0) * 2) / 3
  const maxDownLimit = state.screenHeight + ((state.windowSize?.height || 0) * 2) / 3

  console.log({
    newY,
    maxUpLimit,
    maxDownLimit,
    screenHeight: state.screenHeight,
    windowHeight: state.windowSize?.height,
    currentY: state.currentY
  })

  if (newY >= maxUpLimit && newY <= maxDownLimit) {
    state.currentY = newY
    state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY))
  }
}

function hideMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    const bounds = state.mainWindow?.getBounds()
    if (!bounds) return
    state.windowPosition = { x: bounds.x, y: bounds.y }
    state.windowSize = { width: bounds.width, height: bounds.height }
    state.mainWindow?.setIgnoreMouseEvents(true, { forward: true })
    state.mainWindow?.setOpacity(0)
    state.isWindowVisible = false
    console.log('Hiding main window')
  }
}

function showMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    if (state.windowPosition && state.windowSize) {
      state?.mainWindow?.setBounds({
        ...state.windowPosition,
        ...state.windowSize
      })
    }
    state.mainWindow?.setIgnoreMouseEvents(false)
    state.mainWindow?.setAlwaysOnTop(true, 'screen-saver', 1)
    state.mainWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    state.mainWindow?.setContentProtection(true)
    state.mainWindow?.setOpacity(0)
    state.mainWindow?.showInactive()
    state.mainWindow?.setOpacity(1)
    state.isWindowVisible = true
    console.log('Showing main window')
  }
}

function toggleMainWindow(): void {
  console.log('Toggling main window')
  if (state.isWindowVisible) {
    hideMainWindow()
  } else {
    showMainWindow()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProblemInfo(): any {
  return state.problemInfo
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setProblemInfo(problemInfo: any): void {
  state.problemInfo = problemInfo
}

function getHasDebugged(): boolean {
  return state.hasDebugged
}

function setHasDebugged(hasDebugged: boolean): void {
  state.hasDebugged = hasDebugged
}

function getScreenshotManager(): ScreenshotManager | null {
  return state.screenshotManager
}

function initializeHelpers() {
  state.screenshotManager = new ScreenshotManager(state.view)
  state.processingManager = new ProcessingManager({
    getView,
    setView,
    getProblemInfo,
    setProblemInfo,
    getScreenshotQueue,
    getExtraScreenshotQueue,
    clearQueues,
    takeScreenshot,
    getImagePreview,
    deleteScreenshot,
    setHasDebugged,
    getHasDebugged,
    getMainWindow,
    getScreenshotManager,
    PROCESSING_EVENTS: state.PROCESSING_EVENTS
  })
  state.keyboardShortcutHelper = new KeyboardShortcutHelper({
    moveWindowLeft: () =>
      moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
    moveWindowRight: () =>
      moveWindowHorizontal((x) =>
        Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step)
      ),
    moveWindowUp: () => moveWindowVertical((y) => y - state.step),
    moveWindowDown: () => moveWindowVertical((y) => y + state.step),
    toggleMainWindow: toggleMainWindow,
    isVisible: () => state.isWindowVisible,
    getMainWindow: getMainWindow,
    takeScreenshot: takeScreenshot,
    getImagePreview: getImagePreview,
    clearQueues: clearQueues,
    setView: setView,
    processingManager: state.processingManager
  })
}

function setWindowDimensions(width: number, height: number): void {
  if (!state.mainWindow?.isDestroyed()) {
    const [currentX, currentY] = state.mainWindow?.getPosition() || [0, 0]
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    const maxWidth = Math.floor(workArea.width * 0.5)

    state.mainWindow?.setBounds({
      x: Math.min(currentX, workArea.width - maxWidth),
      y: currentY,
      width: Math.min(width + 32, maxWidth),
      height: Math.ceil(height)
    })
  }
}

async function initializeApp() {
  try {
    const appDataPath = path.join(app.getPath('appData'), 'silent-coder')
    const sessionPath = path.join(appDataPath, 'session')
    const tempPath = path.join(appDataPath, 'temp')
    const cachePath = path.join(appDataPath, 'cache')
    console.log('App data path:', appDataPath)

    for (const dir of [appDataPath, sessionPath, tempPath, cachePath]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }

    app.setPath('userData', appDataPath)
    app.setPath('sessionData', sessionPath)
    app.setPath('temp', tempPath)
    app.setPath('cache', cachePath)

    initializeHelpers()
    initializeIpcHandler({
      getView,
      getMainWindow,
      takeScreenshot,
      clearQueues,
      setView,
      moveWindowLeft: () =>
        moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
      moveWindowRight: () =>
        moveWindowHorizontal((x) =>
          Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step)
        ),
      moveWindowUp: () => moveWindowVertical((y) => y - state.step),
      moveWindowDown: () => moveWindowVertical((y) => y + state.step),
      toggleMainWindow: toggleMainWindow,
      isVisible: () => state.isWindowVisible,
      getScreenshotQueue: getScreenshotQueue,
      getExtraScreenshotQueue: getExtraScreenshotQueue,
      deleteScreenshot: deleteScreenshot,
      getImagePreview: getImagePreview,
      PROCESSING_EVENTS: state.PROCESSING_EVENTS,
      processingManager: state.processingManager,
      setWindowDimensions: setWindowDimensions
    })

    await createWindow()

    state.keyboardShortcutHelper?.registerGlobalShortcuts()
  } catch (error) {
    console.error('Failed to initialize app:', error)
    app.quit()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(initializeApp)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
