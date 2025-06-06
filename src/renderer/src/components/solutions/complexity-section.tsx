export const ComplexitySection = ({
  timeComplexity,
  spaceComplexity,
  isLoading
}: {
  timeComplexity: string | null
  spaceComplexity: string | null
  isLoading: boolean
}) => {
  const formatComplexity = (complexity: string | null) => {
    if (!complexity || complexity.trim() === '') {
      return 'Complexity not available'
    }

    const bigORegex = /O\([^)]+\)/i
    if (bigORegex.test(complexity)) {
      return complexity
    }

    return `O(${complexity})`
  }

  const formattedTimeComplexity = formatComplexity(timeComplexity)
  const formattedSpaceComplexity = formatComplexity(spaceComplexity)

  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-medium text-white tracking-wide">Complexity</h2>
      {isLoading ? (
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Calculating complexity...
        </p>
      ) : (
        <div className="space-y-3">
          <div className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
              <div>
                <strong>Time: </strong> {formattedTimeComplexity}
              </div>
            </div>
          </div>
          <div className="text-[13px] leading-[1.4] text-gray-100 bg-white/5 rounded-md p-3">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
              <div>
                <strong>Space: </strong> {formattedSpaceComplexity}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
