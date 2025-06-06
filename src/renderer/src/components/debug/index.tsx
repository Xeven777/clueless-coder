import { useState, useRef, useEffect } from 'react'
import { useToast } from '@renderer/providers/toast-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ScreenshotQueue from '../queue/screenshot-queue'
import SolutionCommands from '../solutions/solution-commands'
import { ContentSection } from '../solutions/content-section'
import { CodeSection } from './code-section'
import { ComplexitySection } from '../solutions/complexity-section'
interface DebugProps {
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
  currentLanguage: string
  setLanguage: (language: string) => void
}

async function fetchScreenshots() {
  try {
    const existing = await window.electronAPI.getScreenshots()
    console.log('Raw screenshots', existing)
    return (Array.isArray(existing) ? existing : []).map((screenshot) => ({
      id: screenshot.path,
      path: screenshot.path,
      preview: screenshot.preview,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Error fetching screenshots', error)
    throw error
  }
}

const Debug: React.FC<DebugProps> = ({
  isProcessing,
  setIsProcessing,
  currentLanguage,
  setLanguage
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const { showToast } = useToast()

  const { data: screenshots = [], refetch } = useQuery({
    queryKey: ['screenshots'],
    queryFn: fetchScreenshots,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  const [newCode, setNewCode] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(null)
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(null)

  const [debugAnalysis, setDebugAnalysis] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSolution = queryClient.getQueryData(['new_solution']) as {
      code: string
      debug_analysis: string
      thoughts: string[]
      time_complexity: string
      space_complexity: string
    } | null

    if (newSolution) {
      console.log('Found cached solution', newSolution)

      if (newSolution.debug_analysis) {
        setDebugAnalysis(newSolution.debug_analysis)
        setNewCode(newSolution.code || '// Debug mode - see analysis below')

        if (newSolution.debug_analysis.includes('\n\n')) {
          const sections = newSolution.debug_analysis.split('\n\n').filter(Boolean)
          setThoughtsData(sections.slice(0, 3))
        } else {
          setThoughtsData(['Debug analysis based on your screenshots'])
        }
      } else {
        setNewCode(newSolution.code || '// Debug mode - see analysis below')
        setThoughtsData(newSolution.thoughts || ['Debug analysis based on your screenshots'])
      }
      setTimeComplexityData(newSolution.time_complexity)
      setSpaceComplexityData(newSolution.space_complexity)
      setIsProcessing(false)
    }

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onDebugSuccess((data) => {
        console.log('Debug success', data)
        queryClient.setQueryData(['new_solution'], data)

        if (data.debug_analysis) {
          setDebugAnalysis(data.debug_analysis)
          setNewCode(data.code || '// Debug mode - see analysis below')

          if (data.debug_analysis.includes('\n\n')) {
            const sections = data.debug_analysis.split('\n\n').filter(Boolean)
            setThoughtsData(sections.slice(0, 3))
          } else if (data.debug_analysis.includes('\n')) {
            const lines = data.debug_analysis.split('\n')
            const bulletPoints = lines.filter(
              (line) =>
                line.trim().match(/^[\d*\-•]+\s/) ||
                // eslint-disable-next-line no-useless-escape
                line.trim().match(/^[A-Z][\d\.\)\:]/) ||
                (line.includes(':') && line.length < 100)
            )

            if (bulletPoints.length > 0) {
              setThoughtsData(bulletPoints.slice(0, 5))
            } else {
              setThoughtsData(['Debug analysis based on your screenshots'])
            }
          } else {
            setThoughtsData(['Debug analysis based on your screenshots'])
          }
        } else {
          setNewCode(data.code || '// Debug mode - see analysis below')
          setThoughtsData(data.thoughts || ['Debug analysis based on your screenshots'])
          setDebugAnalysis(null)
        }

        setTimeComplexityData(data.time_complexity)
        setSpaceComplexityData(data.space_complexity)
        setIsProcessing(false)
      }),
      window.electronAPI.onDebugStart(() => {
        setIsProcessing(true)
      }),
      window.electronAPI.onDebugError((error) => {
        showToast(
          'Processing Failed',
          'There was an error processing your code. Please try again.',
          'error'
        )
        setIsProcessing(false)
        console.error('Debug error', error)
      })
    ]

    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (tooltipVisible) {
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

    return () => {
      cleanupFunctions.forEach((fn) => fn())
      resizeObserver.disconnect()
    }
  }, [queryClient, setIsProcessing])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(screenshotToDelete.path)
      if (response.success) {
        refetch()
      } else {
        console.error('Failed to delete screenshot', response.error)
        showToast('Delete Failed', 'Failed to delete screenshot. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error deleting screenshot', error)
      showToast('Delete Failed', 'Failed to delete screenshot. Please try again.', 'error')
    }
  }

  return (
    <div ref={contentRef} className="relative">
      <div className="space-y-3 px-4 py-3">
        <div className="bg-transparent w-fit">
          <div className="pb-3">
            <div className="space-y-3 w-fit">
              <ScreenshotQueue
                screenshots={screenshots}
                isLoading={isProcessing}
                onDeleteScreenshot={handleDeleteExtraScreenshot}
              />
            </div>
          </div>
        </div>

        <SolutionCommands
          isProcessing={isProcessing}
          screenshots={screenshots}
          onTooltipVisibilityChange={handleTooltipVisibilityChange}
          extraScreenshots={screenshots}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />

        <div className="w-full text-sm text-black bg-black/50 rounded-md">
          <div className="overflow-hidden rounded-lg">
            <div className="px-4 py-3 space-y-4">
              <ContentSection
                title="What I Changed"
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
                isLoading={isProcessing}
              />

              <CodeSection
                title="What I Changed"
                code={newCode}
                isLoading={!newCode}
                currentLanguage={currentLanguage}
              />

              <div className="space-y-2">
                <h2 className="text-[13px] font-medium text-white tracking-wide">
                  Analysis & Improvements
                </h2>
                {!debugAnalysis ? (
                  <div className="space-y-1.5">
                    <div className="mt-4 flex">
                      <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                        Loading debug analysis...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-black/30 rounded-md p-4 text-[13px] leading-[1.4] text-gray-100 whitespace-pre-wrap overflow-auto max-h-[600px]">
                    {(() => {
                      const sections: { title: string; content: string[] }[] = []
                      const mainSections = debugAnalysis.split(
                        /(?=^#{1,3}\s|^\*\*\*|^\s*[A-Z][\w\s]+\s*$)/m
                      )
                      mainSections.filter(Boolean).forEach((sectionText) => {
                        const lines = sectionText.split('\n')
                        let title = ''
                        let startLineIndex = 0

                        if (
                          lines[0] &&
                          (lines[0].startsWith('#') ||
                            lines[0].startsWith('**') ||
                            lines[0].match(/^[A-Z][\w\s]+$/) ||
                            lines[0].includes('Issues') ||
                            lines[0].includes('Improvements') ||
                            lines[0].includes('Optimizations'))
                        ) {
                          title = lines[0].replace(/^#+\s*|\*\*/g, '')
                          startLineIndex = 1
                        }

                        sections.push({
                          title,
                          content: lines.slice(startLineIndex).filter(Boolean)
                        })
                      })

                      return sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-6">
                          {section.title && (
                            <div className="font-bold text-white/90 text-[14px] mb-2 pb-1 border-b border-white/10">
                              {section.title}
                            </div>
                          )}
                          <div className="pl-1">
                            {section.content.map((line, lineIndex) => {
                              // Handle code blocks - detect full code blocks
                              if (line.trim().startsWith('```')) {
                                // If we find the start of a code block, collect all lines until the end
                                if (line.trim() === '```' || line.trim().startsWith('```')) {
                                  // Find end of this code block
                                  const codeBlockEndIndex = section.content.findIndex(
                                    (l, i) => i > lineIndex && l.trim() === '```'
                                  )

                                  if (codeBlockEndIndex > lineIndex) {
                                    // Get the code content
                                    const codeContent = section.content
                                      .slice(lineIndex + 1, codeBlockEndIndex)
                                      .join('\n')

                                    // Skip ahead in our loop
                                    lineIndex = codeBlockEndIndex

                                    return (
                                      <div
                                        key={lineIndex}
                                        className="font-mono text-xs bg-black/50 p-3 my-2 rounded overflow-x-auto"
                                      >
                                        {codeContent}
                                      </div>
                                    )
                                  }
                                }
                              }

                              // Handle bullet points
                              // eslint-disable-next-line no-useless-escape
                              if (line.trim().match(/^[\-*•]\s/) || line.trim().match(/^\d+\.\s/)) {
                                return (
                                  <div key={lineIndex} className="flex items-start gap-2 my-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                                    <div className="flex-1">
                                      {line.replace(/^[-*•]\s|^\d+\.\s/, '')}
                                    </div>
                                  </div>
                                )
                              }

                              // Handle inline code
                              if (line.includes('`')) {
                                const parts = line.split(/(`[^`]+`)/g)
                                return (
                                  <div key={lineIndex} className="my-1.5">
                                    {parts.map((part, partIndex) => {
                                      if (part.startsWith('`') && part.endsWith('`')) {
                                        return (
                                          <span
                                            key={partIndex}
                                            className="font-mono bg-black/30 px-1 py-0.5 rounded"
                                          >
                                            {part.slice(1, -1)}
                                          </span>
                                        )
                                      }
                                      return <span key={partIndex}>{part}</span>
                                    })}
                                  </div>
                                )
                              }

                              // Handle sub-headers
                              if (
                                line.trim().match(/^#+\s/) ||
                                (line.trim().match(/^[A-Z][\w\s]+:/) && line.length < 60)
                              ) {
                                return (
                                  <div
                                    key={lineIndex}
                                    className="font-semibold text-white/80 mt-3 mb-1"
                                  >
                                    {line.replace(/^#+\s+/, '')}
                                  </div>
                                )
                              }

                              // Regular text
                              return (
                                <div key={lineIndex} className="my-1.5">
                                  {line}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>

              <ComplexitySection
                timeComplexity={timeComplexityData}
                spaceComplexity={spaceComplexityData}
                isLoading={!timeComplexityData || !spaceComplexityData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Debug
