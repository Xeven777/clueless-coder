import { COMMAND_KEY } from '@renderer/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { LanguageSelector } from '../language-selector'
import { useToast } from '@renderer/providers/toast-context'

interface QueueCommandsProps {
  screenshotCount?: number
  currentLanguage: string
  setLanguage: (language: string) => void
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
}

export const QueueCommands: React.FC<QueueCommandsProps> = ({
  screenshotCount,
  currentLanguage,
  setLanguage,
  onTooltipVisibilityChange
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }

    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/10 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
            onClick={async () => {
              try {
                const result = await window.electronAPI.triggerScreenshot()
                if (!result.success) {
                  console.log('Failed to trigger screenshot:', result.error)
                  showToast('Error', 'Failed to trigger screenshot', 'error')
                }
              } catch (error) {
                console.error('Error triggering screenshot:', error)
                showToast('Error', 'Failed to trigger screenshot', 'error')
              }
            }}
          >
            <span className="text-[11px] leading-none truncate">
              {screenshotCount === 0
                ? 'Take first screenshot'
                : screenshotCount === 1
                  ? 'Take second screenshot'
                  : screenshotCount === 2
                    ? 'Take third screenshot'
                    : screenshotCount === 3
                      ? 'Take fourth screenshot'
                      : screenshotCount === 4
                        ? 'Take fifth screenshot'
                        : 'Next will repeat first screenshot'}
            </span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                H
              </button>
            </div>
          </div>

          {screenshotCount! > 0 && (
            <div
              className={`flex flex-col cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors`}
              onClick={async () => {
                try {
                  const result = await window.electronAPI.triggerProcessScreenshots()
                  if (!result.success) {
                    console.log('Failed to process screenshot:', result.error)
                    showToast('Error', 'Failed to process screenshot', 'error')
                  }
                } catch (error) {
                  console.error('Error processing screenshot:', error)
                  showToast('Error', 'Failed to process screenshot', 'error')
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] leading-none">Solve</span>
                <div className="flex gap-1 ml-2">
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {COMMAND_KEY}
                  </button>
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    ↵
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mx-2 h-4 w-px bg-white/20" />

          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-4 h-4 flex items-center justify-center cursor-pointer text-white/70 hover:text-white/90 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute top-full left-0 mt-2 w-80 transform -translate-x-[calc(50%-12px)]"
                style={{
                  zIndex: 100
                }}
              >
                <div className="absolute -top-2 right-0 w-full h-2" />
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium truncate">Keyboard Shortcuts</h3>
                    <div className="space-y-3">
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            const result = await window.electronAPI.toggleMainWindow()
                            if (!result.success) {
                              console.log('Failed to toggle window:', result.error)
                              showToast('Error', 'Failed to toggle window', 'error')
                            }
                          } catch (error) {
                            console.error('Error toggling window:', error)
                            showToast('Error', 'Failed to toggle window', 'error')
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Toggle Window</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Show or hide this window
                        </p>
                      </div>
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            const result = await window.electronAPI.triggerScreenshot()
                            if (!result.success) {
                              console.log('Failed to trigger screenshot:', result.error)
                              showToast('Error', 'Failed to trigger screenshot', 'error')
                            }
                          } catch (error) {
                            console.error('Error triggering screenshot:', error)
                            showToast('Error', 'Failed to trigger screenshot', 'error')
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Take Screenshot</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              H
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Take a screenshot of the problem statement
                        </p>
                      </div>
                      <div
                        className={`cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                          screenshotCount! > 0 ? '' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={async () => {
                          if (screenshotCount === 0) return
                          try {
                            const result = await window.electronAPI.triggerProcessScreenshots()
                            if (!result.success) {
                              console.log('Failed to process screenshot:', result.error)
                              showToast('Error', 'Failed to process screenshot', 'error')
                            }
                          } catch (error) {
                            console.error('Error processing screenshot:', error)
                            showToast('Error', 'Failed to process screenshot', 'error')
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Solve Problem</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ↵
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          {screenshotCount! > 0
                            ? 'Generate a solution based on the current problem'
                            : 'Take a screenshot first to generate a solution.'}
                        </p>
                      </div>
                      <div
                        className={`cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                          screenshotCount! > 0 ? '' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={async () => {
                          if (screenshotCount === 0) return
                          try {
                            const result = await window.electronAPI.deleteLastScreenshot()
                            if (!result.success) {
                              console.log('Failed to delete last screenshot:', result.error)
                              showToast('Error', 'Failed to delete last screenshot', 'error')
                            }
                          } catch (error) {
                            console.error('Error deleting last screenshot:', error)
                            showToast('Error', 'Failed to delete last screenshot', 'error')
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Delete Last Screenshot</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              L
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          {screenshotCount! > 0
                            ? 'Delete the last screenshot'
                            : 'No screenshots to delete'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/10">
                      <LanguageSelector
                        currentLanguage={currentLanguage}
                        setLanguage={setLanguage}
                      />

                      <div className="mb-3 px-2 space-y-1">
                        <div className="flex items-center justify-between text-[13px] font-medium text-white/90">
                          <span>AI API Settings</span>
                          <button
                            className="text-[11px] bg-white/10 hover:bg-white/20 rounded px-2 py-1"
                            onClick={() => window.electronAPI.openSettingsPortal()}
                          >
                            Settings
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
