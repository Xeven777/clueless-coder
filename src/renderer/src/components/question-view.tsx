import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../providers/toast-context'
import { Button } from './ui/button'
import { LanguageSelector } from './language-selector'
import { COMMAND_KEY } from '@renderer/lib/utils'
import Markdown from 'react-markdown'

interface QuestionViewProps {
  setView: (view: 'queue' | 'solutions' | 'debug' | 'question') => void
  currentLanguage: string
  setLanguage: (language: string) => void
}

interface QuestionResponse {
  answer: string
  timestamp: number
}

async function fetchQuestionResponse(): Promise<QuestionResponse | null> {
  try {
    const response = await window.electronAPI.getQuestionResponse()
    return response
  } catch (error) {
    console.error('Error fetching question response:', error)
    return null
  }
}

const QuestionView: React.FC<QuestionViewProps> = ({ setView, currentLanguage, setLanguage }) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [question, setQuestion] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [attachedScreenshots, setAttachedScreenshots] = useState<
    Array<{ path: string; preview: string }>
  >([])

  const { data: questionResponse, isLoading: isResponseLoading } =
    useQuery<QuestionResponse | null>({
      queryKey: ['question_response'],
      queryFn: fetchQuestionResponse,
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false
    })

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
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
      window.electronAPI.onQuestionResponse((response: QuestionResponse) => {
        queryClient.setQueryData(['question_response'], response)
        setIsProcessing(false)
      }),
      window.electronAPI.onQuestionError((error: string) => {
        showToast('Error', error, 'error')
        setIsProcessing(false)
      }),
      window.electronAPI.onScreenshotTaken(() => {
        // Refresh attached screenshots when a new one is taken
        refreshAttachedScreenshots()
      })
    ]

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
      resizeObserver.disconnect()
    }
  }, [queryClient, showToast])

  const refreshAttachedScreenshots = async () => {
    try {
      const screenshots = await window.electronAPI.getScreenshots()
      setAttachedScreenshots(screenshots)
    } catch (error) {
      console.error('Error fetching screenshots:', error)
    }
  }

  const handleSubmitQuestion = async () => {
    if (!question.trim()) {
      showToast('Error', 'Please enter a question', 'error')
      return
    }

    setIsProcessing(true)
    try {
      const result = await window.electronAPI.processQuestion({
        question: question.trim(),
        attachedScreenshots: attachedScreenshots.map((s) => s.path)
      })

      if (!result.success) {
        showToast('Error', result.error || 'Failed to process question', 'error')
        setIsProcessing(false)
      }
      // Success will be handled by the onQuestionResponse event
    } catch (error) {
      console.error('Error processing question:', error)
      showToast('Error', 'Failed to process question', 'error')
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmitQuestion()
    }
  }

  const handleAttachScreenshot = async () => {
    try {
      const result = await window.electronAPI.triggerScreenshot()
      if (result.success) {
        await refreshAttachedScreenshots()
      } else {
        showToast('Error', 'Failed to take screenshot', 'error')
      }
    } catch (error) {
      console.error('Error taking screenshot:', error)
      showToast('Error', 'Failed to take screenshot', 'error')
    }
  }

  const handleRemoveScreenshot = async (index: number) => {
    const screenshotToRemove = attachedScreenshots[index]
    try {
      const result = await window.electronAPI.deleteScreenshot(screenshotToRemove.path)
      if (result.success) {
        await refreshAttachedScreenshots()
      } else {
        showToast('Error', 'Failed to remove screenshot', 'error')
      }
    } catch (error) {
      console.error('Error removing screenshot:', error)
      showToast('Error', 'Failed to remove screenshot', 'error')
    }
  }

  const handleClearAll = () => {
    setQuestion('')
    setAttachedScreenshots([])
    queryClient.setQueryData(['question_response'], null)
  }

  return (
    <div ref={contentRef} className="bg-transparent w-full max-w-4xl mx-auto">
      <div className="px-4 py-3">
        <div className="space-y-4">
          {/* Header with mode switch */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Question Mode</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('queue')}
                className="text-xs text-white"
              >
                Coder Mode
              </Button>
              <LanguageSelector currentLanguage={currentLanguage} setLanguage={setLanguage} />
            </div>
          </div>

          {/* Question input area */}
          <div className="space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask any question... (Ctrl/Cmd + Enter to submit)"
                className="w-full min-h-[120px] p-3 bg-black/20 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none focus:border-white/40 transition-colors"
                disabled={isProcessing}
              />
            </div>

            {/* Attached screenshots */}
            {attachedScreenshots.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/90">Attached Screenshots</h3>
                <div className="flex flex-wrap gap-2">
                  {attachedScreenshots.map((screenshot, index) => (
                    <div key={screenshot.path} className="relative group">
                      <img
                        src={screenshot.preview}
                        alt={`Screenshot ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-white/20"
                      />
                      <button
                        onClick={() => handleRemoveScreenshot(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmitQuestion}
                disabled={isProcessing || !question.trim()}
                className="flex items-center gap-2 text-white border"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Submit Question
                    <span className="text-xs opacity-70">({COMMAND_KEY}+↵)</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleAttachScreenshot}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                📷 Attach Screenshot
              </Button>

              <Button
                variant="outline"
                onClick={handleClearAll}
                disabled={isProcessing}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Response area */}
          {(questionResponse || isResponseLoading) && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/90">Response</h3>
              <div className="p-4 bg-black/20 backdrop-blur-md border border-white/20 rounded-lg">
                {isResponseLoading ? (
                  <div className="flex items-center gap-2 text-white/70">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Loading response...
                  </div>
                ) : questionResponse ? (
                  <div className="text-white/90 whitespace-pre-wrap max-h-96 overflow-auto">
                    <Markdown>{questionResponse.answer}</Markdown>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionView
