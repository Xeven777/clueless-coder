import { useEffect, useRef, useState } from 'react'
import ScreenshotsView from './screenshots-view'
import { useQueryClient } from '@tanstack/react-query'
import Solutions from './solutions'
import { useToast } from '@renderer/providers/toast-context'
interface MainAppProps {
  currentLanguage: string
  setLanguage: (language: string) => void
}

// eslint-disable-next-line react-refresh/only-export-components, react/prop-types
const MainApp: React.FC<MainAppProps> = ({ currentLanguage, setLanguage }) => {
  const [view, setView] = useState<'queue' | 'solutions' | 'debug'>('queue')
  const containerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      queryClient.invalidateQueries({
        queryKey: ['screenshots']
      })
      queryClient.invalidateQueries({
        queryKey: ['problem_statement']
      })
      queryClient.invalidateQueries({
        queryKey: ['solution']
      })
      queryClient.invalidateQueries({
        queryKey: ['new_solution']
      })
      setView('queue')
    })

    return () => cleanup()
  }, [])

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView('solutions')
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.electronAPI.onProblemExtracted((data: any) => {
        console.log('problem extracted', data)
        if (view === 'queue') {
          queryClient.invalidateQueries({
            queryKey: ['problem_statement']
          })
          queryClient.setQueryData(['problem_statement'], data)
        }
      }),
      window.electronAPI.onResetView(() => {
        queryClient.invalidateQueries({
          queryKey: ['screenshots']
        })
        queryClient.invalidateQueries({
          queryKey: ['problem_statement']
        })
        queryClient.invalidateQueries({
          queryKey: ['solution']
        })
        setView('queue')
      }),
      window.electronAPI.onResetView(() => {
        queryClient.setQueryData(['problem_statement'], null)
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast('Error', error, 'error')
      })
    ]

    return () => {
      cleanupFunctions.forEach((cleanup) => {
        cleanup()
      })
    }
  }, [view])

  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight || 600
      const width = containerRef.current.scrollWidth || 800
      window.electronAPI?.updateContentDimensions({
        width,
        height
      })
    }

    updateDimensions()

    const fallbackTimer = setTimeout(() => {
      window.electronAPI?.updateContentDimensions({
        width: 800,
        height: 600
      })
    }, 500)

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    const mutationObserver = new MutationObserver(updateDimensions)
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    const delayedUpdate = setTimeout(updateDimensions, 1000)

    return () => {
      clearTimeout(fallbackTimer)
      clearTimeout(delayedUpdate)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view])

  return (
    <div ref={containerRef} className="min-h-0">
      {view === 'queue' ? (
        <ScreenshotsView
          setView={setView}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />
      ) : view === 'solutions' ? (
        <Solutions setView={setView} currentLanguage={currentLanguage} setLanguage={setLanguage} />
      ) : null}
    </div>
  )
}

export default MainApp
