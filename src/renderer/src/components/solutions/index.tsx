import { ProblemStatementData } from '@renderer/lib/types'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ContentSection } from './content-section'
import { COMMAND_KEY } from '@renderer/lib/utils'
import { SolutionSection } from './solution-section'
import { ComplexitySection } from './complexity-section'
import ScreenshotQueue from '../queue/screenshot-queue'
import { useToast } from '@renderer/providers/toast-context'
import SolutionCommands from './solution-commands'
import Debug from '../debug'
export interface SolutionsProps {
  setView: (view: 'queue' | 'solutions' | 'debug') => void
  currentLanguage: string
  setLanguage: (language: string) => void
}

const Solutions: React.FC<SolutionsProps> = ({ setView, currentLanguage, setLanguage }) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const [debugProcessing, setDebugProcessing] = useState(false)
  const [problemStatementData, setProblemStatementData] = useState<ProblemStatementData | null>(
    null
  )

  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(null)
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(null)

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const [isResetting, setIsResetting] = useState(false)

  interface Screenshot {
    id: string
    path: string
    preview: string
    timestamp: number
  }

  const [extraScreenshots, setExtraScreenshots] = useState<Screenshot[]>([])

  useEffect(() => {
    setProblemStatementData(queryClient.getQueryData(['problem_statement']) || null)
    setSolutionData(queryClient.getQueryData(['solution']) || null)
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === 'problem_statement') {
        setProblemStatementData(queryClient.getQueryData(['problem_statement']) || null)
      }
      if (event?.query.queryKey[0] === 'solution') {
        const solution = queryClient.getQueryData(['solution']) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null

        setSolutionData(solution?.code || null)
        setThoughtsData(solution?.thoughts || null)
        setTimeComplexityData(solution?.time_complexity || null)
        setSpaceComplexityData(solution?.space_complexity || null)
      }
    })

    return () => unsubscribe()
  }, [queryClient])

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
      window.electronAPI.onProblemExtracted((data) => {
        queryClient.setQueryData(['problem_statement'], data)
      }),
      window.electronAPI.onResetView(() => {
        setIsResetting(true)

        queryClient.removeQueries({
          queryKey: ['solution']
        })
        queryClient.removeQueries({
          queryKey: ['new_solution']
        })

        setExtraScreenshots([])

        setTimeout(() => {
          setIsResetting(false)
        }, 0)
      }),
      window.electronAPI.onSolutionStart(() => {
        setSolutionData(null)
        setThoughtsData(null)
        setTimeComplexityData(null)
        setSpaceComplexityData(null)
      }),
      window.electronAPI.onSolutionSuccess((data) => {
        if (!data) {
          console.warn('Received empty or invalid solution data')
          return
        }
        console.log('Solution data received:', data)
        const solutionData = {
          code: data.code,
          thoughts: data.thoughts,
          time_complexity: data.time_complexity,
          space_complexity: data.space_complexity
        }
        queryClient.setQueryData(['solution'], solutionData)
        setSolutionData(solutionData.code || null)
        setThoughtsData(solutionData.thoughts || null)
        setTimeComplexityData(solutionData.time_complexity || null)
        setSpaceComplexityData(solutionData.space_complexity || null)

        const fetchScreenshots = async () => {
          try {
            const existing = await window.electronAPI.getScreenshots()
            const screenshots = (Array.isArray(existing) ? existing : []).map((screenshot) => ({
              id: screenshot.path,
              path: screenshot.path,
              preview: screenshot.preview,
              timestamp: Date.now()
            }))

            setExtraScreenshots(screenshots)
          } catch (error) {
            console.error('Error fetching screenshots:', error)
          }
        }

        fetchScreenshots()
      }),
      window.electronAPI.onDebugStart(() => {
        setDebugProcessing(true)
      }),
      window.electronAPI.onDebugSuccess((data) => {
        queryClient.setQueryData(['new_solution'], data)
        setDebugProcessing(false)
      }),
      window.electronAPI.onDebugError(() => {
        showToast('Processing Failed', 'There was an error debugging your solution', 'error')
        setDebugProcessing(false)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast('No Screenshots', 'There are no extra screenshots to debug', 'neutral')
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

          setExtraScreenshots(screenshots)
        } catch (error) {
          console.error('Error fetching screenshots:', error)
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast('Error', error, 'error')

        const solution = queryClient.getQueryData(['solution']) as {
          code: string
          thoughts: string[]
          time_complexity: string
          space_complexity: string
        } | null

        if (!solution) {
          setView('queue')
        }

        setSolutionData(solution?.code || null)
        setThoughtsData(solution?.thoughts || null)
        setTimeComplexityData(solution?.time_complexity || null)
        setSpaceComplexityData(solution?.space_complexity || null)
        console.log('processing error', error)
      })
    ]

    return () => {
      cleanupFunctions.forEach((fn) => fn())
      resizeObserver.disconnect()
    }
  }, [isTooltipVisible, tooltipHeight])

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]

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

        setExtraScreenshots(screenshots)
      } else {
        console.error('Failed to delete screenshot:', response.error)
        showToast('Error', 'Failed to delete screenshot', 'error')
      }
    } catch (error) {
      console.error('Error deleting screenshot:', error)
      showToast('Error', 'Failed to delete screenshot', 'error')
    }
  }

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  return (
    <>
      {!isResetting && queryClient.getQueryData(['new_solution']) ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />
      ) : (
        <div className="relative" ref={contentRef}>
          <div className="space-y-3 px-4 py-3">
            {solutionData && (
              <div className="bg-transparent w-fit">
                <div className="pb-3">
                  <div className="space-y-3 w-fit">
                    <ScreenshotQueue
                      isLoading={debugProcessing}
                      screenshots={extraScreenshots}
                      onDeleteScreenshot={handleDeleteExtraScreenshot}
                    />
                  </div>
                </div>
              </div>
            )}

            <SolutionCommands
              onTooltipVisibilityChange={handleTooltipVisibilityChange}
              isProcessing={!problemStatementData || !solutionData}
              screenshots={extraScreenshots}
              currentLanguage={currentLanguage}
              setLanguage={setLanguage}
            />

            <div className="w-full text-sm text-black bg-black/60 rounded-md">
              <div className="rounded-md overflow-hidden">
                <div className="px-4 py-3 space-y-4 max-w-full">
                  {!solutionData && (
                    <>
                      <ContentSection
                        title="Problem Statement"
                        content={problemStatementData?.problem_statement}
                        isLoading={!problemStatementData}
                      />
                      {problemStatementData && (
                        <div className="mt-4 flex">
                          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                            Generating solution...
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {solutionData && (
                    <>
                      <ContentSection
                        title={`My Thoughts (${COMMAND_KEY} + Arrow keys to scroll)`}
                        content={
                          thoughtsData && (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                {thoughtsData.map((thought, index) => (
                                  <div key={index} className="flex items-start gap-2">
                                    <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                                    <div>{thought}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        isLoading={!thoughtsData}
                      />

                      <SolutionSection
                        title="Solution"
                        content={solutionData}
                        isLoading={!solutionData}
                        currentLanguage={currentLanguage}
                      />

                      <ComplexitySection
                        timeComplexity={timeComplexityData}
                        spaceComplexity={spaceComplexityData}
                        isLoading={!timeComplexityData || !spaceComplexityData}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Solutions
