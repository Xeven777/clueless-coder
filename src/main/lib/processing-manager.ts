/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow } from 'electron'
import { ScreenshotManager } from './screenshot-manager'
import { state } from '../index'
import { configManager } from './config-manager'
import fs from 'fs'
import { generateText, generateObject, CoreMessage, LanguageModel } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

export interface IProcessingManager {
  getMainWindow: () => BrowserWindow | null
  getScreenshotManager: () => ScreenshotManager | null
  getView: () => 'queue' | 'solutions' | 'debug' | 'question'
  setView: (view: 'queue' | 'solutions' | 'debug' | 'question') => void
  getProblemInfo: () => any
  setProblemInfo: (problemInfo: any) => void
  getScreenshotQueue: () => string[]
  getExtraScreenshotQueue: () => string[]
  clearQueues: () => void
  takeScreenshot: () => Promise<string>
  getImagePreview: (path: string) => Promise<string>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  setHasDebugged: (hasDebugged: boolean) => void
  getHasDebugged: () => boolean
  getQuestionResponse: () => { answer: string; timestamp: number } | null
  setQuestionResponse: (response: { answer: string; timestamp: number } | null) => void
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS
}

// Define Zod schema for problem information
const problemInfoSchema = z.object({
  problem_statement: z.string().min(1, 'Problem statement is required.'),
  constraints: z.string().optional(),
  example_input: z.string().optional(),
  example_output: z.string().optional()
})
type ProblemInfo = z.infer<typeof problemInfoSchema>

export class ProcessingManager {
  private deps: IProcessingManager
  private screenshotManager: ScreenshotManager | null = null
  private vercelOpenAI: ReturnType<typeof createOpenAI> | null = null
  private vercelGoogle: ReturnType<typeof createGoogleGenerativeAI> | null = null
  private vercelGroq: ReturnType<typeof createGroq> | null = null

  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingManager) {
    this.deps = deps
    this.screenshotManager = deps.getScreenshotManager()

    this.initializeAiClient()

    configManager.on('config-updated', () => {
      this.initializeAiClient()
    })
  }

  private initializeAiClient(): void {
    try {
      const config = configManager.loadConfig()
      this.vercelOpenAI = null
      this.vercelGoogle = null
      this.vercelGroq = null

      if (config.apiProvider === 'openai') {
        if (config.apiKey) {
          this.vercelOpenAI = createOpenAI({
            apiKey: config.apiKey,
            compatibility: 'strict' // or 'compatible' or undefined
          })
          console.log('Vercel OpenAI provider initialized successfully')
        } else {
          console.log('Vercel OpenAI provider not initialized: No API key provided')
        }
      } else if (config.apiProvider === 'gemini') {
        if (config.apiKey) {
          this.vercelGoogle = createGoogleGenerativeAI({
            apiKey: config.apiKey
          })
          console.log('Vercel Google provider initialized successfully')
        } else {
          console.log('Vercel Google provider not initialized: No API key provided')
        }
      } else if (config.apiProvider === 'groq') {
        if (config.apiKey) {
          this.vercelGroq = createGroq({
            apiKey: config.apiKey
            // Add other Groq specific configurations here
          })
          console.log('Vercel Groq provider initialized successfully')
        } else {
          console.log('Vercel Groq provider not initialized: No API key provided')
        }
      }
    } catch (error) {
      console.error('Error initializing Vercel AI provider:', error)
      this.vercelOpenAI = null
      this.vercelGoogle = null
      this.vercelGroq = null
    }
  }

  private getActiveLLMProvider(): LanguageModel | null {
    const config = configManager.loadConfig()
    if (config.apiProvider === 'openai' && this.vercelOpenAI) {
      // Model specified here will be used. Config model names should align.
      return this.vercelOpenAI(config.extractionModel || 'gpt-4o')
    } else if (config.apiProvider === 'gemini' && this.vercelGoogle) {
      return this.vercelGoogle(config.extractionModel || 'gemini-2.0-flash')
    } else if (config.apiProvider === 'groq' && this.vercelGroq) {
      return this.vercelGroq(config.extractionModel || 'meta-llama/llama-4-scout-17b-16e-instruct')
    }
    return null
  }

  private getSolutionLLMProvider(): LanguageModel | null {
    const config = configManager.loadConfig()
    if (config.apiProvider === 'openai' && this.vercelOpenAI) {
      return this.vercelOpenAI(config.solutionModel || 'gpt-4o')
    } else if (config.apiProvider === 'gemini' && this.vercelGoogle) {
      return this.vercelGoogle(config.solutionModel || 'gemini-2.0-flash')
    } else if (config.apiProvider === 'groq' && this.vercelGroq) {
      return this.vercelGroq(config.solutionModel || 'meta-llama/llama-4-scout-17b-16e-instruct')
    }
    return null
  }

  private getDebuggingLLMProvider(): LanguageModel | null {
    const config = configManager.loadConfig()
    if (config.apiProvider === 'openai' && this.vercelOpenAI) {
      return this.vercelOpenAI(config.debuggingModel || 'gpt-4o')
    } else if (config.apiProvider === 'gemini' && this.vercelGoogle) {
      return this.vercelGoogle(config.debuggingModel || 'gemini-2.0-flash')
    } else if (config.apiProvider === 'groq' && this.vercelGroq) {
      return this.vercelGroq(config.debuggingModel || 'meta-llama/llama-4-scout-17b-16e-instruct')
    }
    return null
  }

  private async waitForInitialization(mainWindow: BrowserWindow): Promise<void> {
    let attempts = 0
    const maxAttempts = 50

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        'window.__IS_INITIALIZED__'
      )
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    // Consider throwing an error or logging if not initialized after max attempts
  }

  private async getLanguage(): Promise<string> {
    try {
      const config = configManager.loadConfig()
      if (config.language) return config.language

      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        try {
          await this.waitForInitialization(mainWindow)
          const language = await mainWindow.webContents.executeJavaScript('window.__LANGUAGE__')
          if (typeof language === 'string' && language.trim() !== '') return language
        } catch (error) {
          console.error('Error getting language from main window:', error)
        }
      }
      return 'python' // Default language
    } catch (error) {
      console.error('Error getting language:', error)
      return 'python'
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    // const config = configManager.loadConfig()
    const llmProvider = this.getActiveLLMProvider()

    if (!llmProvider) {
      this.initializeAiClient() // Attempt to re-initialize
      if (!this.getActiveLLMProvider()) {
        // Check again
        console.error('Failed to initialize AI provider.')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID)
        return
      }
    }

    const view = this.deps.getView()

    if (view === 'queue') {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotManager?.getScreenshotQueue() || []
      console.log('screenshotQueue', screenshotQueue)

      if (screenshotQueue.length === 0) {
        console.log('No screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      const existingScreenshots = screenshotQueue.filter((path) => fs.existsSync(path))
      if (existingScreenshots.length === 0) {
        console.log('No existing screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        this.screenshotManager?.clearExtraScreenshotQueue() // Clear invalid paths
        return
      }

      try {
        this.currentProcessingAbortController = new AbortController()

        const screenshotsData = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                data: fs.readFileSync(path) // Read as Buffer for Vercel AI SDK
              }
            } catch (error) {
              console.error('Error reading screenshot:', error)
              return null
            }
          })
        )

        const validScreenshots = screenshotsData.filter(Boolean) as Array<{
          path: string
          data: Buffer
        }>

        if (validScreenshots.length === 0) {
          throw new Error('No valid screenshots to process')
        }

        const result = await this.processScreenshotHelper(
          validScreenshots,
          this.currentProcessingAbortController.signal
        )

        if (!result.success) {
          console.log('Processing failed:', result.error)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            result.error
          )
          this.deps.setView('queue')
          return
        }
        console.log('Processing successful:', result.data)
        // This send is now handled inside processScreenshotHelper's call to generateSolutionsHelper
        // mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, result.data)
        this.deps.setView('solutions')
      } catch (error: any) {
        console.error('Error processing screenshots:', error)
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Screenshot processing aborted.')
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS) // Or a specific ABORTED event
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || 'Unknown error'
          )
        }
        this.deps.setView('queue')
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view is 'solutions' or 'debug', processing extra screenshots
      const extraScreenshotQueue = this.screenshotManager?.getExtraScreenshotQueue() || []
      console.log('extraScreenshotQueue', extraScreenshotQueue)

      if (extraScreenshotQueue.length === 0) {
        console.log('No extra screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS) // Might need a more specific event
        return
      }

      const existingExtraScreenshots = extraScreenshotQueue.filter((path) => fs.existsSync(path))
      if (existingExtraScreenshots.length === 0) {
        console.log('No existing extra screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        this.screenshotManager?.clearExtraScreenshotQueue() // Clear invalid paths
        return
      }

      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)
      this.currentExtraProcessingAbortController = new AbortController()

      try {
        const allPaths = [
          ...(this.screenshotManager?.getScreenshotQueue() || []),
          ...existingExtraScreenshots
        ].filter(fs.existsSync) // Ensure all paths are valid before mapping

        const screenshotsData = await Promise.all(
          // Deduplicate paths before processing
          [...new Set(allPaths)].map(async (path) => {
            try {
              return {
                path,
                data: fs.readFileSync(path) // Read as Buffer
              }
            } catch (error) {
              console.error('Error reading screenshot:', error)
              return null
            }
          })
        )

        const validScreenshots = screenshotsData.filter(Boolean) as Array<{
          path: string
          data: Buffer
        }>

        if (validScreenshots.length === 0) {
          throw new Error('No valid screenshots to process for debug')
        }

        console.log(
          'Combined screenshots for processing',
          validScreenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          validScreenshots,
          this.currentExtraProcessingAbortController.signal
        )

        if (result.success) {
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS, result.data)
        } else {
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, result.error)
        }
      } catch (error: any) {
        console.error('Error processing extra screenshots:', error)
        if (error.name === 'AbortError') {
          console.log('Extra screenshot processing aborted.')
          // Potentially send a specific event or revert view
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message || 'Unknown error'
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotHelper(
    screenshots: Array<{ path: string; data: Buffer }>,
    abortSignal?: AbortSignal
  ) {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return { success: false, error: 'Main window not available' }

    const llmProvider = this.getActiveLLMProvider()
    if (!llmProvider) {
      return { success: false, error: 'AI Provider not initialized' }
    }

    try {
      const language = await this.getLanguage()

      mainWindow.webContents.send('processing-status', {
        message: 'Analyzing problem from screenshot...',
        progress: 20
      })

      const userMessagesContent: Array<
        { type: 'text'; text: string } | { type: 'image'; image: Buffer }
      > = [
        {
          type: 'text' as const,
          text: `Extract the coding problem details from these screenshots. Return in JSON format adhering to the provided schema. Preferred coding language we gonna use for this problem is ${language}.`
        },
        ...screenshots.map((screenshot) => ({
          type: 'image' as const,
          image: screenshot.data // Pass Buffer directly
        }))
      ]

      const { object: problemInfo } = await generateObject({
        model: llmProvider,
        schema: problemInfoSchema,
        messages: [
          {
            role: 'system',
            content: `You are a coding challenge interpreter. Analyze the screenshot of the coding problem and extract all relevant information. Return the information in JSON format matching the Zod schema fields: problem_statement, constraints, example_input, example_output. Just return the structured JSON without any other text.`
          },
          { role: 'user', content: userMessagesContent }
        ],
        temperature: 0.2,
        maxTokens: llmProvider.provider == 'openai' ? 4000 : 6000,
        mode: 'json', // Enforce JSON output mode if supported by the model/provider
        abortSignal
      })
      // console.log({
      //   problemInfo,
      //   usage
      // })

      if (!problemInfo || Object.keys(problemInfo).length === 0) {
        throw new Error('Failed to extract problem information or received empty data.')
      }

      mainWindow.webContents.send('processing-status', {
        message: 'Problem analyzed successfully. Preparing to generate solution...',
        progress: 40
      })

      this.deps.setProblemInfo(problemInfo)
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo)

      const solutionsResponse = await this.generateSolutionsHelper(abortSignal)
      if (solutionsResponse.success) {
        this.screenshotManager?.clearExtraScreenshotQueue() // Clear if any were pending from a previous run

        mainWindow.webContents.send('processing-status', {
          progress: 100,
          message: 'Solution generated successfully. Displaying results...'
        })
        // SOLUTION_SUCCESS is sent from generateSolutionsHelper upon its own success
        return { success: true, data: solutionsResponse.data }
      } else {
        throw new Error(solutionsResponse.error || 'Failed to generate solutions')
      }
    } catch (error: any) {
      console.error('Error in processScreenshotHelper:', error)
      if (error.name === 'AbortError') {
        return { success: false, error: 'Processing aborted by user.' }
      }
      return {
        success: false,
        error: error.message || 'Failed to process screenshot with Vercel AI SDK'
      }
    }
  }

  private async generateSolutionsHelper(abortSignal?: AbortSignal) {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return { success: false, error: 'Main window not available' }

    const solutionLLMProvider = this.getSolutionLLMProvider()
    if (!solutionLLMProvider) {
      return { success: false, error: 'Solution AI Provider not initialized' }
    }

    try {
      const problemInfo: ProblemInfo = this.deps.getProblemInfo()
      if (!problemInfo) throw new Error('No problem info found')

      const language = await this.getLanguage()

      mainWindow.webContents.send('processing-status', {
        message: 'Creating optimal solution with detailed explanation...',
        progress: 60
      })

      const promptText = `
Generate a detailed solution for the following coding problem:

PROBLEM STATEMENT:
${problemInfo.problem_statement}

CONSTRAINTS:
${problemInfo.constraints || 'No specific constraints provided.'}

EXAMPLE INPUT:
${problemInfo.example_input || 'No example input provided.'}

EXAMPLE OUTPUT:
${problemInfo.example_output || 'No example output provided.'}

LANGUAGE: ${language}

I need the response in the following format:
1. Code: A clean, optimized implementation in ${language} (use markdown code block with language specifier)
2. Your Thoughts: A list of key insights and reasoning behind your approach (bullet points)
3. Time complexity: O(X) with a detailed explanation (at least 2 sentences)
4. Space complexity: O(X) with a detailed explanation (at least 2 sentences)

For complexity explanations, please be thorough. For example: "Time complexity: O(n) because we iterate through the array only once. This is optimal as we need to examine each element at least once to find the solution." or "Space complexity: O(n) because in the worst case, we store all elements in the hashmap. The additional space scales linearly with the input size."

Your solution should be efficient, well-commented, and handle edge cases.
`
      const { text: responseContent } = await generateText({
        model: solutionLLMProvider,
        messages: [
          {
            role: 'system',
            content: `You are an expert coding interview assistant. Provide clear, optimal solutions with detailed explanations in the requested format.`
          },
          { role: 'user', content: promptText }
        ],
        temperature: 0.2,
        maxTokens: solutionLLMProvider.provider == 'openai' ? 4000 : 6000,
        abortSignal
      })
      // console.log({
      //   responseContent,
      //   usage
      // })

      if (!responseContent) {
        throw new Error('No content received from AI for solution generation.')
      }

      // Parsing logic (remains largely the same, ensure regex robustness)
      const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
      const code = codeMatch ? codeMatch[1].trim() : '// Code not found or parsing failed'

      const thoughtsRegex =
        /(?:Your Thoughts:|Thoughts:|Key Insights:|Reasoning:|Approach:)\s*([\s\S]*?)(?=\n(?:Time complexity:|Space complexity:|$))/i
      const thoughtsMatch = responseContent.match(thoughtsRegex)
      let thoughts: string[] = []
      if (thoughtsMatch && thoughtsMatch[1]) {
        thoughts = thoughtsMatch[1]
          .split('\n')
          .map((line) => line.replace(/^[-*•\d.]*\s*/, '').trim())
          .filter(Boolean)
      }
      if (thoughts.length === 0)
        thoughts = ['Solution approach based on efficiency and readability.']

      const timeComplexityPattern =
        /Time complexity:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:Space complexity|$))/i
      const spaceComplexityPattern =
        /Space complexity:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z][a-z]*\s*)*$|\n\s*$)/i // Improved end lookahead

      let timeComplexity = 'O(N) - Default: please verify. Iterates through input once.'
      const timeMatch = responseContent.match(timeComplexityPattern)
      if (timeMatch && timeMatch[1]) timeComplexity = timeMatch[1].trim()

      let spaceComplexity =
        'O(N) - Default: please verify. Uses auxiliary space proportional to input.'
      const spaceMatch = responseContent.match(spaceComplexityPattern)
      if (spaceMatch && spaceMatch[1]) spaceComplexity = spaceMatch[1].trim()

      const formattedResponse = {
        code,
        thoughts,
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity
      }

      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, formattedResponse)
      return { success: true, data: formattedResponse }
    } catch (error: any) {
      console.error('Error generating solutions with Vercel AI SDK:', error)
      if (error.name === 'AbortError') {
        return { success: false, error: 'Solution generation aborted by user.' }
      }
      mainWindow.webContents.send(
        this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        error.message || 'Failed to generate solutions'
      )
      return { success: false, error: error.message || 'Failed to generate solutions' }
    }
  }

  public cancelOngoingRequest(): void {
    let wasCancelled = false
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
      console.log('Main processing request cancelled.')
    }
    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
      console.log('Extra processing (debug) request cancelled.')
    }

    // Reset states
    this.deps.setHasDebugged(false)
    // this.deps.setProblemInfo(null) // Keep problem info if initial solution was generated

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      // Send a general cancellation/reset event or specific based on current view
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS) // Or a new CANCELLED event
      mainWindow.webContents.send('processing-status', {
        progress: 0,
        message: 'Processing cancelled.'
      })
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: Buffer }>,
    abortSignal?: AbortSignal
  ) {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return { success: false, error: 'Main window not available' }

    const debuggingLLMProvider = this.getDebuggingLLMProvider()
    if (!debuggingLLMProvider) {
      return { success: false, error: 'Debugging AI Provider not initialized' }
    }

    try {
      const language = await this.getLanguage()
      const problemInfo: ProblemInfo | null = this.deps.getProblemInfo()

      if (!problemInfo) {
        // If no problemInfo, perhaps we can ask the LLM to infer it or just focus on the code in screenshots
        console.warn('No problem info found for debugging. Proceeding with screenshots only.')
        // return { success: false, error: 'No problem info found for debugging context.' }
      }

      mainWindow.webContents.send('processing-status', {
        message: 'Processing debug screenshots...',
        progress: 30
      })

      const userMessagesContent: CoreMessage['content'] = [
        {
          type: 'text',
          text: `I'm trying to solve a coding problem${problemInfo ? `: "${problemInfo.problem_statement}"` : ''} in ${language}. I need help with debugging or improving my solution. Here are screenshots of my code, any errors, or test cases. Please provide a detailed analysis with:
          1. What issues you found (potential bugs, logical errors).
          2. Specific improvements and corrections (code snippets if applicable).
          3. Any optimizations that would make the solution better.
          4. A clear explanation of the changes needed.
          5. Key takeaways or learning points.

          Structure your response clearly with markdown. Use ### for main section headers (e.g., ### Issues Identified).`
        },
        ...screenshots.map((screenshot) => ({
          type: 'image' as const,
          image: screenshot.data, // Pass Buffer
          mimeType: 'image/png' // or 'image/jpeg'
        }))
      ]

      mainWindow.webContents.send('processing-status', {
        message: 'Analyzing debug screenshots with AI...',
        progress: 60
      })

      const { text: debugContent } = await generateText({
        model: debuggingLLMProvider,
        messages: [
          {
            role: 'system',
            content: `You are a coding interview assistant helping debug and improve solutions. Analyze the provided screenshots (which might include code, error messages, incorrect outputs, or test cases) and provide detailed debugging help.
            Your response MUST follow this general structure with markdown section headers (use ### for headers):
            ### Issues Identified
            - List each issue as a bullet point with clear explanation

            ### Specific Improvements and Corrections
            - List specific code changes needed as bullet points. Use markdown code blocks for code.

            ### Optimizations (Optional)
            - List any performance optimizations if applicable

            ### Explanation of Changes
            - Provide a clear explanation of why the changes are needed

            ### Key Points / Takeaways
            - Summary bullet points of the most important takeaways`
          },
          { role: 'user', content: userMessagesContent }
        ],
        temperature: 0.2,
        maxTokens: debuggingLLMProvider.provider == 'openai' ? 4000 : 6000,
        abortSignal
      })
      // console.log({
      //   debugContent,
      //   usage
      // })

      if (!debugContent) {
        throw new Error('No content received from AI for debug analysis.')
      }

      mainWindow.webContents.send('processing-status', {
        message: 'Debug analysis complete',
        progress: 100
      })

      // Basic parsing for code and thoughts, actual content is markdown
      let extractedCode = '// Debug analysis provided in markdown format below.'
      const codeMatch = debugContent.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/) // First code block
      if (codeMatch && codeMatch[1]) {
        extractedCode = codeMatch[1].trim()
      }

      // Extract some bullet points for 'thoughts' (e.g., from "Issues Identified" or "Key Points")
      let thoughts: string[] = []
      const issuesMatch = debugContent.match(/### Issues Identified\s*([\s\S]*?)(?=\n###|$)/i)
      if (issuesMatch && issuesMatch[1]) {
        thoughts = issuesMatch[1]
          .split('\n')
          .map((line) => line.replace(/^[-*•\d.]*\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 5)
      }
      if (thoughts.length === 0) {
        const keyPointsMatch = debugContent.match(
          /### Key Points(?: \/ Takeaways)?\s*([\s\S]*?)(?=\n###|$)/i
        )
        if (keyPointsMatch && keyPointsMatch[1]) {
          thoughts = keyPointsMatch[1]
            .split('\n')
            .map((line) => line.replace(/^[-*•\d.]*\s*/, '').trim())
            .filter(Boolean)
            .slice(0, 5)
        }
      }
      if (thoughts.length === 0) thoughts = ['See full debug analysis for details.']

      const response = {
        code: extractedCode, // This might be less relevant if the analysis is textual
        debug_analysis: debugContent, // The full markdown from the LLM
        thoughts: thoughts,
        time_complexity: 'N/A - Debug Mode', // Not applicable for debug usually
        space_complexity: 'N/A - Debug Mode'
      }

      return { success: true, data: response }
    } catch (error: any) {
      console.error('Error processing extra screenshots with Vercel AI SDK:', error)
      if (error.name === 'AbortError') {
        return { success: false, error: 'Debug processing aborted by user.' }
      }
      return { success: false, error: error.message || 'Failed to process extra screenshots' }
    }
  }

  public async processQuestion(
    question: string,
    attachedScreenshots: string[] = []
  ): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    const llmProvider = this.getActiveLLMProvider()
    if (!llmProvider) {
      console.error('Failed to initialize AI provider.')
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID)
      return
    }

    try {
      mainWindow.webContents.send('processing-status', {
        message: 'Processing your question...',
        progress: 20
      })

      // Prepare the message content
      const userMessagesContent: Array<
        { type: 'text'; text: string } | { type: 'image'; image: Buffer }
      > = [
        {
          type: 'text' as const,
          text: question
        }
      ]

      // Add attached screenshots if any
      if (attachedScreenshots.length > 0) {
        for (const screenshotPath of attachedScreenshots) {
          try {
            const screenshotData = fs.readFileSync(screenshotPath)
            userMessagesContent.push({
              type: 'image' as const,
              image: screenshotData
            })
          } catch (error) {
            console.error('Error reading screenshot:', error)
          }
        }
      }

      mainWindow.webContents.send('processing-status', {
        message: 'Generating response...',
        progress: 60
      })

      const { text: answer } = await generateText({
        model: llmProvider,
        messages: [
          {
            role: 'system',
            content: `<core_identity>You are an assistant called Cluelessly, developed and created by Cluelessly, whose sole purpose is to analyze and solve problems asked by the user or shown on the screen. Your responses must be specific, accurate, and actionable.</core_identity>
<general_guidelines>
NEVER use meta-phrases (e.g., "let me help you", "I can see that").
NEVER summarize unless explicitly requested.
NEVER provide unsolicited advice.
NEVER refer to "screenshot" or "image" refer to it as "the screen" if needed.
ALWAYS be specific, detailed, and accurate.
ALWAYS acknowledge uncertainty when present.
ALWAYS use markdown formatting.
ALWAYS try to responsd in an entusiastic and helpful way as if you are in an interview and trying your best to pass it
**All math must be rendered using LaTeX**: use $...$ for in-line and $$...$$ for multi-line math. Dollar signs
used for money must be escaped (e.g., \\$100).
If asked what model is running or powering you or who you are, respond: "I am Cluelessly powered by a collection of LLM providers". NEVER mention the specific LLM providers or say that Cluelessly is the AI itself.
If user intent is unclear even with many visible elements do NOT offer solutions or organizational suggestions. Only acknowledge ambiguity and offer a clearly labeled guess if appropriate.
Tell answers in details of about 200 words minimum.
</general_guidelines>`
          },
          { role: 'user', content: userMessagesContent }
        ],
        temperature: 0.7,
        maxTokens: llmProvider.provider == 'openai' ? 4000 : 6000
      })

      // console.log({
      //   answer,
      //   usage
      // })

      if (!answer || answer.trim().length === 0) {
        throw new Error('Failed to generate a response to the question.')
      }

      const response = {
        answer: answer.trim(),
        timestamp: Date.now()
      }

      this.deps.setQuestionResponse(response)
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.QUESTION_RESPONSE, response)

      mainWindow.webContents.send('processing-status', {
        progress: 100,
        message: 'Response generated successfully.'
      })
    } catch (error: any) {
      console.error('Error processing question:', error)
      const errorMessage = error.message || 'Failed to process question'
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.QUESTION_ERROR, errorMessage)
    }
  }
}
