import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'

export const ContentSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => {
  if (typeof content !== 'string') {
    return (
      <div className="space-y-2">
        <h2 className="text-[13px] font-medium text-white tracking-wide">{title}</h2>
        {isLoading ? (
          <div className="mt-4 flex">
            <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
              Extracting problem statement...
            </p>
          </div>
        ) : (
          <div className="text-[13px] leading-[1.6] text-gray-100 max-w-[600px] prose prose-sm prose-invert">
            {content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h2 className="text-[13px] font-medium text-white tracking-wide">{title}</h2>
      {isLoading ? (
        <div className="mt-4 flex">
          <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Extracting problem statement...
          </p>
        </div>
      ) : (
        <div className="text-[13px] leading-[1.6] text-gray-100 max-w-[600px] prose prose-sm prose-invert">
          <ReactMarkdown
            components={{
              code: ({
                inline = false,
                className = '',
                children,
                ...props
              }: {
                node?: unknown
                inline?: boolean
                className?: string
                children?: React.ReactNode
              }) => {
                const match = /language-(\w+)/.exec(className)
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={dracula}
                    language={match[1]}
                    PreTag="div"
                    // @ts-ignore - Type definitions for react-syntax-highlighter are incomplete
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              p: (props) => <p className="mb-3" {...props} />,
              ul: (props) => <ul className="list-disc pl-5 mb-3" {...props} />,
              ol: (props) => <ol className="list-decimal pl-5 mb-3" {...props} />,
              li: (props) => <li className="mb-1" {...props} />,
              h1: (props) => <h1 className="text-xl font-bold mb-3 mt-4" {...props} />,
              h2: (props) => <h2 className="text-lg font-bold mb-2 mt-4" {...props} />,
              h3: (props) => <h3 className="text-md font-semibold mb-2 mt-3" {...props} />,
              a: (props) => (
                <a
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {props.children}
                </a>
              ),
              blockquote: (props) => (
                <blockquote
                  className="border-l-4 border-gray-600 pl-4 italic text-gray-300"
                  {...props}
                />
              )
            }}
          >
            {content as string}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
