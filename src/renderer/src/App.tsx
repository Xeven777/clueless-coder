import { QueryProvider } from './providers/query-provider'
import { WelcomeScreen } from './components/welcome-screen'
import { useCallback, useEffect, useState } from 'react'
import { SettingsDialog } from './components/settings-dialog'
import MainApp from './components/main-app'
import { ToastContext } from '@renderer/providers/toast-context'
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastDescription,
  ToastTitle
} from './components/ui/toast'

interface AppConfig {
  apiKey?: string
  apiProvider?: 'openai' | 'gemini'
  extractionModel?: string
  solutionModel?: string
  debuggingModel?: string
  language?: string
}

function App(): React.JSX.Element {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('python')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [_, setApiKeyDialogOpen] = useState(false)
  const [toastState, setToastState] = useState({
    open: false,
    title: '',
    description: '',
    variant: 'neutral' as 'neutral' | 'success' | 'error'
  })

  const handleOpenSettings = useCallback(() => {
    console.log('open settings')
    setIsSettingsOpen(true)
    console.log('isSettingsOpen', isSettingsOpen)
  }, [])

  const handleCloseSettings = useCallback((open: boolean) => {
    setIsSettingsOpen(open)
  }, [])

  const markInitialized = useCallback(() => {
    setIsInitialized(true)
    window.__IS_INITIALIZED__ = true
  }, [])

  const showToast = useCallback(
    (title: string, description: string, variant: 'neutral' | 'success' | 'error') => {
      setToastState({
        open: true,
        title,
        description,
        variant
      })
    },
    []
  )

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await window.electronAPI.checkApiKey()
        setHasApiKey(hasKey)

        if (!hasKey) {
          setTimeout(() => {
            setIsSettingsOpen(true)
          }, 1000)
        }
      } catch (error) {
        console.error('Error checking API key:', error)
        showToast('Error checking API key', 'Please check your API key', 'error')
      }
    }

    if (isInitialized) {
      checkApiKey()
    }
  }, [isInitialized])

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const config = (await window.electronAPI.getConfig()) as AppConfig

        if (config?.language) {
          setCurrentLanguage(config.language)
        }

        markInitialized()
      } catch (error) {
        console.error('Error initializing app:', error)
        markInitialized()
      }
    }
    initializeApp()

    const onApiKeyInvalid = () => {
      showToast('API key invalid', 'Please check your API key', 'error')
      setApiKeyDialogOpen(true)
    }

    window.electronAPI.onApiKeyInvalid(onApiKeyInvalid)

    return () => {
      window.electronAPI.removeListener('API_KEY_INVALID', onApiKeyInvalid)
      window.__IS_INITIALIZED__ = false
      setIsInitialized(false)
    }
  }, [markInitialized, showToast])

  const handleLanguageChange = useCallback((language: string) => {
    setCurrentLanguage(language)
    window.__LANGUAGE__ = language
  }, [])

  useEffect(() => {
    const unsubscribeSettings = window.electronAPI.onShowSettings(() => {
      setIsSettingsOpen(true)
    })

    return () => {
      unsubscribeSettings()
    }
  }, [])

  return (
    <QueryProvider>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>
          <div className="relative">
            {isInitialized ? (
              hasApiKey ? (
                <MainApp currentLanguage={currentLanguage} setLanguage={handleLanguageChange} />
              ) : (
                <WelcomeScreen onOpenSettings={handleOpenSettings} />
              )
            ) : (
              <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  <p className="text-white/60 text-sm">Initializing...</p>
                </div>
              </div>
            )}
          </div>
          <SettingsDialog open={isSettingsOpen} onOpenChange={handleCloseSettings} />
          <Toast
            open={toastState.open}
            onOpenChange={(open) => setToastState((prev) => ({ ...prev, open }))}
            variant={toastState.variant}
            duration={1500}
          >
            <ToastTitle>{toastState.title}</ToastTitle>
            <ToastDescription>{toastState.description}</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastContext.Provider>
      </ToastProvider>
    </QueryProvider>
  )
}

export default App
