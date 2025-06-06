import ScreenshotItem from './screenshot-item'

interface Screenshot {
  path: string
  preview: string
}

interface ScreenshotQueueProps {
  screenshots: Screenshot[]
  isLoading: boolean
  onDeleteScreenshot: (index: number) => void
}

const ScreenshotQueue: React.FC<ScreenshotQueueProps> = ({
  screenshots,
  isLoading,
  onDeleteScreenshot
}) => {
  if (screenshots.length === 0) {
    return <></>
  }

  const displayScreenshots = screenshots.slice(0, 5)

  return (
    <div className="flex gap-4">
      {displayScreenshots.map((screenshot, index) => (
        <ScreenshotItem
          key={screenshot.path}
          screenshot={screenshot}
          onDelete={onDeleteScreenshot}
          index={index}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}

export default ScreenshotQueue
