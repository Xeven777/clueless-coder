import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../providers/toast-context'
import { Button } from './ui/button'
import Markdown from 'react-markdown'
import ScreenshotQueue from './queue/screenshot-queue'

interface MCQViewProps {
  setView: (view: 'queue' | 'solutions' | 'debug' | 'question' | 'mcq') => void
  currentLanguage: string
  setLanguage: (language: string) => void
}

interface MCQResponse {
  answer: string
  explanation: string
  incorrectOptions: string[]
  timestamp: number
}

async function fetchMCQResponse(): Promise<MCQResponse | null> {
  try {
    const response = await window.electronAPI.getMcqResponse()
    return response
  } catch (error) {
    console.error('Error fetching MCQ response:', error)
    return null
  }
}

const MCQView: React.FC<MCQViewProps> = ({ setView }) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [isProcessing, setIsProcessing] = useState(false)

  interface Screenshot {
    id: string
    path: string
    preview: string
    timestamp: number
  }

  const [screenshots, setScreenshots] = useState<Screenshot[]>([])

  const { data: mcqResponse, isLoading: isResponseLoading } = useQuery<MCQResponse | null>({
    queryKey: ['mcq_response'],
    queryFn: fetchMCQResponse,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    const updateDimensions = () => {
      if (!contentRef.current) return
      const height = contentRef.current.scrollHeight || 600
      const width = contentRef.current.scrollWidth || 800
      window.electronAPI?.updateContentDimensions({
        width,
        height
      })
    }

    updateDimensions()

    // Load initial screenshots
    const fetchScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        const screenshots = (Array.isArray(existing) ? existing : []).map((screenshot) => ({
          id: screenshot.path,
          path: screenshot.path,
          preview: screenshot.preview,
          timestamp: Date.now()
        }))
        setScreenshots(screenshots)
      } catch (error) {
        console.error('Error fetching screenshots:', error)
      }
    }

    fetchScreenshots()

    const cleanupFunctions = [
      window.electronAPI.onMcqResponse((response: MCQResponse) => {
        queryClient.setQueryData(['mcq_response'], response)
        setIsProcessing(false)
        showToast('Success', 'MCQ analysis complete!', 'success')
      }),
      window.electronAPI.onMcqError((error: string) => {
        setIsProcessing(false)
        showToast('Error', error, 'error')
      }),
      window.electronAPI.onScreenshotTaken(async () => {
        try {
          const existing = await window.electronAPI.getScreenshots()
          const screenshots = (Array.isArray(existing) ? existing : []).map((screenshot) => ({
            id: screenshot.path,
            path: screenshot.path,
            preview: screenshot.preview,
            timestamp: Date.now()
          }))
          setScreenshots(screenshots)
        } catch (error) {
          console.error('Error fetching screenshots:', error)
        }
      })
    ]

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [queryClient, showToast])

  const handleProcessMCQ = async () => {
    if (screenshots.length === 0) {
      showToast('No Screenshots', 'Please take a screenshot first using Ctrl+H', 'neutral')
      return
    }

    setIsProcessing(true)
    try {
      const result = await window.electronAPI.processMCQ()

      if (!result.success) {
        showToast('Error', result.error || 'Failed to process MCQ', 'error')
        setIsProcessing(false)
      }
      // Success will be handled by the onMcqResponse event
    } catch (error) {
      console.error('Error processing MCQ:', error)
      showToast('Error', 'Failed to process MCQ', 'error')
      setIsProcessing(false)
    }
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(screenshotToDelete.path)

      if (response.success) {
        const existing = await window.electronAPI.getScreenshots()
        const screenshots = (Array.isArray(existing) ? existing : []).map((screenshot) => ({
          id: screenshot.path,
          path: screenshot.path,
          preview: screenshot.preview,
          timestamp: Date.now()
        }))
        setScreenshots(screenshots)
      } else {
        console.error('Failed to delete screenshot:', response.error)
        showToast('Error', 'Failed to delete screenshot', 'error')
      }
    } catch (error) {
      console.error('Error deleting screenshot:', error)
      showToast('Error', 'Failed to delete screenshot', 'error')
    }
  }

  return (
    <div ref={contentRef} className="bg-transparent w-full max-w-4xl mx-auto">
      <div className="px-4 py-3">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">MCQ Mode</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('queue')}
                className="text-xs text-white bg-black/20"
              >
                Coder Mode
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('question')}
                className="text-xs text-white bg-black/20"
              >
                Question Mode
              </Button>
            </div>
          </div>

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div className="bg-transparent w-fit">
              <div className="pb-3">
                <div className="space-y-3 w-fit">
                  <ScreenshotQueue
                    isLoading={isProcessing}
                    screenshots={screenshots}
                    onDeleteScreenshot={handleDeleteScreenshot}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-black/20 backdrop-blur-md rounded-lg border border-white/10 p-4">
            <h3 className="text-sm font-medium text-white mb-2">How to use MCQ Mode:</h3>
            <ol className="text-xs text-white/80 space-y-1 list-decimal list-inside">
              <li>
                Take a screenshot of your multiple choice question using{' '}
                <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs">Ctrl+H</kbd>
              </li>
              <li>Click &quot;Analyze MCQ&quot; to get the AI analysis</li>
              <li>View the correct answer with detailed explanations</li>
            </ol>
          </div>

          {/* Process MCQ Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleProcessMCQ}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {isProcessing ? 'Analyzing MCQ...' : 'Analyze MCQ'}
            </Button>
          </div>

          {/* MCQ Response Display */}
          {isResponseLoading && (
            <div className="bg-black/20 backdrop-blur-md rounded-lg border border-white/10 p-4">
              <div className="text-white/80 text-sm">Loading MCQ response...</div>
            </div>
          )}

          {mcqResponse && (
            <div className="bg-black/20 backdrop-blur-md rounded-lg border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">MCQ Analysis</h3>
                <span className="text-xs text-white/60">
                  {new Date(mcqResponse.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Correct Answer */}
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <h4 className="text-sm font-medium text-green-400 mb-2">✓ Correct Answer</h4>
                <div className="text-white font-medium">{mcqResponse.answer}</div>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">Explanation</h4>
                <div className="text-white/90 text-sm bg-black/30 rounded-lg p-3 prose prose-invert prose-sm max-w-none">
                  <Markdown>{mcqResponse.explanation}</Markdown>
                </div>
              </div>

              {/* Incorrect Options Explanations */}
              {mcqResponse.incorrectOptions && mcqResponse.incorrectOptions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">
                    Why Other Options Are Incorrect
                  </h4>
                  <div className="space-y-2">
                    {mcqResponse.incorrectOptions.map((explanation, index) => (
                      <div
                        key={index}
                        className="text-white/80 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 prose prose-invert prose-sm max-w-none"
                      >
                        <Markdown>{explanation}</Markdown>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!mcqResponse && !isResponseLoading && (
            <div className="bg-black/20 backdrop-blur-md rounded-lg border border-white/10 p-4 text-center">
              <div className="text-white/60 text-sm">
                No MCQ analysis yet. Take a screenshot and click &quot;Analyze MCQ&quot; to get
                started.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MCQView
