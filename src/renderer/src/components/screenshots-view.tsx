import { useEffect, useRef, useState } from 'react'
import ScreenshotQueue from './queue/screenshot-queue'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '../providers/toast-context'
import { QueueCommands } from './queue/queue-commands'
export interface Screenshot {
  path: string
  preview: string
}

async function fetchScreenshots(): Promise<Screenshot[]> {
  try {
    const existing = await window.electronAPI.getScreenshots()
    return existing
  } catch (error) {
    console.error('Error fetching screenshots:', error)
    throw error
  }
}

interface ScreenshotsViewProps {
  setView: (view: 'queue' | 'solutions' | 'debug') => void
  currentLanguage: string
  setLanguage: (language: string) => void
}

const ScreenshotsView: React.FC<ScreenshotsViewProps> = ({
  setView,
  currentLanguage,
  setLanguage
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)

  const {
    data: screenshots = [],
    isLoading,
    refetch
  } = useQuery<Screenshot[]>({
    queryKey: ['screenshots'],
    queryFn: fetchScreenshots,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  console.log('screenshots', screenshots)

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    updateDimensions()

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onDeleteLastScreenshot(async () => {
        if (screenshots.length > 0) {
          await handleDeleteScreenshot(screenshots.length - 1)
        } else {
          showToast('Error', 'No screenshots to delete', 'error')
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast('Error', error, 'error')
        setView('queue')
        console.log('error', error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast('Error', 'No screenshots to process', 'error')
      })
    ]
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
      resizeObserver.disconnect()
    }
  }, [screenshots, isTooltipVisible, tooltipHeight])

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]
    try {
      const response = await window.electronAPI.deleteScreenshot(screenshotToDelete.path)
      if (response.success) {
        refetch()
      } else {
        console.error('Error deleting screenshot:', response.error)
        showToast('Error', response.error || 'Failed to delete screenshot', 'error')
      }
    } catch (error) {
      console.error('Error deleting screenshot:', error)
    }
  }

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  return (
    <div ref={contentRef} className={`bg-transparent w-1/2`}>
      <div className="px-4 py-3">
        <div className="space-y-3 w-fit">
          <ScreenshotQueue
            screenshots={screenshots}
            isLoading={isLoading}
            onDeleteScreenshot={handleDeleteScreenshot}
          />
          <QueueCommands
            screenshotCount={screenshots.length}
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
          />
        </div>
      </div>
    </div>
  )
}

export default ScreenshotsView
