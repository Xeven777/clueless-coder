import { BrowserWindow } from 'electron'
import { ScreenshotManager } from './screenshot-manager'
import { state } from '../index'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { configManager } from './config-manager'
import fs from 'fs'

export interface IProcessingManager {
  getMainWindow: () => BrowserWindow | null
  getScreenshotManager: () => ScreenshotManager | null
  getView: () => 'queue' | 'solutions' | 'debug'
  setView: (view: 'queue' | 'solutions' | 'debug') => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProblemInfo: () => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setProblemInfo: (problemInfo: any) => void
  getScreenshotQueue: () => string[]
  getExtraScreenshotQueue: () => string[]
  clearQueues: () => void
  takeScreenshot: () => Promise<string>
  getImagePreview: (path: string) => Promise<string>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  setHasDebugged: (hasDebugged: boolean) => void
  getHasDebugged: () => boolean
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS
}

export class ProcessingManager {
  private deps: IProcessingManager
  private screenshotManager: ScreenshotManager | null = null
  private openaiClient: OpenAI | null = null
  private geminiClient: GoogleGenerativeAI | null = null

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

      if (config.apiProvider === 'openai') {
        if (config.apiKey) {
          this.openaiClient = new OpenAI({
            apiKey: config.apiKey,
            timeout: 60000,
            maxRetries: 2
          })
          this.geminiClient = null
          console.log('OpenAI client initialized successfully')
        } else {
          this.openaiClient = null
          this.geminiClient = null
          console.log('OpenAI client not initialized: No API key provided')
        }
      } else if (config.apiProvider === 'gemini') {
        this.openaiClient = null
        if (config.apiKey) {
          this.geminiClient = new GoogleGenerativeAI(config.apiKey)
          console.log('Gemini client initialized successfully')
        } else {
          this.openaiClient = null
          this.geminiClient = null
          console.log('Gemini client not initialized: No API key provided')
        }
      }
    } catch (error) {
      console.error('Error initializing AI client:', error)
      this.openaiClient = null
      this.geminiClient = null
    }
  }

  private async waitForInitialization(mainWindow: BrowserWindow): Promise<void> {
    let attempts = 0
    const maxAttempts = 50

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        'window.__IS_INITIALIZED__'
      )

      if (isInitialized) {
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
  }

  private async getLanguage(): Promise<string> {
    try {
      const config = configManager.loadConfig()
      if (config.language) {
        return config.language
      }

      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        try {
          await this.waitForInitialization(mainWindow)
          const language = await mainWindow.webContents.executeJavaScript('window.__LANGUAGE__')
          if (typeof language === 'string' && language !== undefined && language !== null) {
            return language
          }
        } catch (error) {
          console.error('Error getting language from main window:', error)
        }
      }

      return 'python'
    } catch (error) {
      console.error('Error getting language:', error)
    }
    return 'python'
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    const config = configManager.loadConfig()

    if (config.apiProvider === 'openai' && !this.openaiClient) {
      this.initializeAiClient()
      if (!this.openaiClient) {
        console.error('Failed to initialize OpenAI client')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID)
        return
      }
    } else if (config.apiProvider === 'gemini' && !this.geminiClient) {
      this.initializeAiClient()
      if (!this.geminiClient) {
        console.error('Failed to initialize Gemini client')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID)
        return
      }
    }

    const view = this.deps.getView()

    if (view === 'queue') {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotManager?.getScreenshotQueue()
      console.log('screenshotQueue', screenshotQueue)

      if (!screenshotQueue || screenshotQueue.length === 0) {
        console.log('No screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      const existingScreenshots = screenshotQueue.filter((path) => fs.existsSync(path))
      if (existingScreenshots.length === 0) {
        console.log('No existing screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      try {
        this.currentProcessingAbortController = new AbortController()

        const screenshots = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                preview: await this.screenshotManager?.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              }
            } catch (error) {
              console.error('Error reading screenshot:', error)
              return null
            }
          })
        )

        const validScreenshots = screenshots.filter(Boolean)

        if (!validScreenshots || validScreenshots.length === 0) {
          throw new Error('No valid screenshots to process')
        }

        const result = await this.processScreenshotHelper(
          validScreenshots as Array<{ path: string; data: string }>
        )

        if (!result.success) {
          console.log('Processing failed:', result.error)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            result.error
          )

          console.log('Resetting view to queue due to error')
          this.deps.setView('queue')
          return
        }
        console.log('Processing successful:', result.data)
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, result.data)
        this.deps.setView('solutions')
      } catch (error) {
        console.error('Error processing screenshots:', error)
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        )

        console.log('Resetting view to queue due to error')
        this.deps.setView('queue')
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      const extraScreenshotQueue = this.screenshotManager?.getExtraScreenshotQueue()
      console.log('extraScreenshotQueue', extraScreenshotQueue)

      if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
        console.log('No extra screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      const existingExtraScreenshots = extraScreenshotQueue.filter((path) => fs.existsSync(path))
      if (existingExtraScreenshots.length === 0) {
        console.log('No existing extra screenshots to process')
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

      this.currentExtraProcessingAbortController = new AbortController()

      try {
        const allPaths = [
          ...(this.screenshotManager?.getScreenshotQueue() || []),
          ...existingExtraScreenshots
        ]

        const screenshots = await Promise.all(
          allPaths.map(async (path) => {
            try {
              if (!fs.existsSync(path)) {
                console.warn(`Screenshot not found: ${path}`)
                return null
              }

              return {
                path,
                preview: await this.screenshotManager?.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              }
            } catch (error) {
              console.error('Error reading screenshot:', error)
              return null
            }
          })
        )

        const validScreenshots = screenshots.filter(Boolean)

        if (!validScreenshots || validScreenshots.length === 0) {
          throw new Error('No valid screenshots to process')
        }

        console.log(
          'Combined screenshots for processing',
          validScreenshots.map((s) => s?.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          validScreenshots as Array<{ path: string; data: string }>
        )

        if (result.success) {
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS, result.data)
        } else {
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, result.error)
        }
      } catch (error) {
        console.error('Error processing extra screenshots:', error)
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        )
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotHelper(screenshots: Array<{ path: string; data: string }>) {
    try {
      const config = configManager.loadConfig()
      const language = await this.getLanguage()
      const mainWindow = this.deps.getMainWindow()

      const imageDataList = screenshots.map((screenshot) => screenshot.data)

      if (mainWindow) {
        mainWindow.webContents.send('processing-status', {
          message: 'Analyzing problem from screenshot...',
          progress: 20
        })
      }

      let problemInfo

      if (config.apiProvider === 'openai') {
        if (!this.openaiClient) {
          this.initializeAiClient()

          if (!this.openaiClient) {
            return {
              success: false,
              error: 'Failed to initialize OpenAI client'
            }
          }
        }

        const messages = [
          {
            role: 'system' as const,
            content: `You are a coding challenge interpreter. Analyze the screenshot of the coding problem and extract all relevant information. Return the information in JSON format with these fields: problem_statement, constraints, example_input, example_output. Just return the structured JSON without any other text.`
          },
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: `Extract the coding problem details from these screenshots. Return in JSON format. Preferred coding language we gonna use for this problem is ${language}.`
              },
              ...imageDataList.map((data) => ({
                type: 'image_url' as const,
                image_url: {
                  url: `data:image/jpeg;base64,${data}`
                }
              }))
            ]
          }
        ]

        const extractionResponse = await this.openaiClient.chat.completions.create({
          model: config.extractionModel || 'gpt-4o',
          messages,
          max_tokens: 4000,
          temperature: 0.2
        })

        try {
          const responseText = extractionResponse.choices[0].message.content
          if (responseText === null) {
            throw new Error('No response from OpenAI')
          }

          const jsonText = responseText.replace(/```json|```/g, '').trim()
          problemInfo = JSON.parse(jsonText)
        } catch (error) {
          console.error('Error parsing OpenAI response:', error)
          return {
            success: false,
            error: 'Failed to parse OpenAI response'
          }
        }
      } else if (config.apiProvider === 'gemini') {
        if (!this.geminiClient) {
          this.initializeAiClient()

          if (!this.geminiClient) {
            return {
              success: false,
              error: 'Failed to initialize Gemini client'
            }
          }
        }

        try {
          const geminiParts = [
            {
              text: `Extract the coding problem details from these screenshots. Return in JSON format. Preferred coding language we gonna use for this problem is ${language}.`
            },
            ...imageDataList.map((data) => ({
              inlineData: {
                mimeType: 'image/png',
                data: data
              }
            }))
          ]

          const model = this.geminiClient.getGenerativeModel({
            model: config.extractionModel || 'gemini-2.0-flash'
          })

          const result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: geminiParts
              }
            ],
            generationConfig: {
              temperature: 0.2
            },
            systemInstruction: `You are a coding challenge interpreter. Analyze the screenshot of the coding problem and extract all relevant information. Return the information in JSON format with these fields: problem_statement, constraints, example_input, example_output. Just return the structured JSON without any other text.`
          })

          const response = await result.response
          if (!response) {
            throw new Error('No response from Gemini')
          }

          const responseText = response.text()
          console.log('responseText', responseText)
          if (!responseText) {
            throw new Error('No response from Gemini')
          }

          const jsonText = responseText.replace(/```json|```/g, '').trim()
          problemInfo = JSON.parse(jsonText)
        } catch (error) {
          console.error('Error parsing Gemini response:', error)
          return {
            success: false,
            error: 'Failed to parse Gemini response'
          }
        }
      }

      if (mainWindow) {
        mainWindow.webContents.send('processing-status', {
          message: 'Problem analyzed successfully. Preparing to generate solution...',
          progress: 40
        })
      }

      this.deps.setProblemInfo(problemInfo)

      if (mainWindow) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo)

        const solutionsResponse = await this.generateSolutionsHelper()
        if (solutionsResponse.success) {
          this.screenshotManager?.clearExtraScreenshotQueue()

          mainWindow.webContents.send('processing-status', {
            progress: 100,
            message: 'Solution generated successfully. Displaying results...'
          })

          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
            solutionsResponse.data
          )

          return {
            success: true,
            data: solutionsResponse.data
          }
        } else {
          throw new Error('Failed to generate solutions')
        }
      }

      return { success: false, error: 'Failed to process screenshot' }
    } catch (error) {
      console.error('Error processing screenshot:', error)
      return {
        success: false,
        error: 'Failed to process screenshot'
      }
    }
  }

  private async generateSolutionsHelper() {
    try {
      const problemInfo = this.deps.getProblemInfo()
      const language = await this.getLanguage()
      const config = configManager.loadConfig()

      const mainWindow = this.deps.getMainWindow()

      if (!problemInfo) {
        throw new Error('No problem info found')
      }

      if (mainWindow) {
        mainWindow.webContents.send('processing-status', {
          message: 'Creating optimal solution with detailed explanation...',
          progress: 60
        })
      }

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
 1. Code: A clean, optimized implementation in ${language}
 2. Your Thoughts: A list of key insights and reasoning behind your approach
 3. Time complexity: O(X) with a detailed explanation (at least 2 sentences)
 4. Space complexity: O(X) with a detailed explanation (at least 2 sentences)

 For complexity explanations, please be thorough. For example: "Time complexity: O(n) because we iterate through the array only once. This is optimal as we need to examine each element at least once to find the solution." or "Space complexity: O(n) because in the worst case, we store all elements in the hashmap. The additional space scales linearly with the input size."

 Your solution should be efficient, well-commented, and handle edge cases.
 `

      let responseContent

      if (config.apiProvider === 'openai') {
        if (!this.openaiClient) {
          return {
            success: false,
            error: 'Failed to initialize OpenAI client'
          }
        }

        const solutionResponse = await this.openaiClient.chat.completions.create({
          model: config.solutionModel || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert coding interview assistant. Provide clear, optimal solutions with detailed explanations.`
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          max_tokens: 4000,
          temperature: 0.2
        })

        responseContent = solutionResponse.choices[0].message.content
      } else if (config.apiProvider === 'gemini') {
        if (!this.geminiClient) {
          return {
            success: false,
            error: 'Failed to initialize Gemini client'
          }
        }

        const model = this.geminiClient.getGenerativeModel({
          model: config.solutionModel || 'gemini-1.5-flash'
        })

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: promptText
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })

        responseContent = result.response.text()
        console.log('responseContent', responseContent)
      }

      const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
      const code = codeMatch ? codeMatch[1].trim() : responseContent

      const thoughtsRegex =
        /(?:Thoughts:|Key Insights:|Reasoning:|Approach:)([\s\S]*?)(?:Time complexity:|$)/i
      const thoughtsMatch = responseContent.match(thoughtsRegex)
      let thoughts: string[] = []

      if (thoughtsMatch && thoughtsMatch[1]) {
        const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g)
        if (bulletPoints) {
          thoughts = bulletPoints
            .map((point) => point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim())
            .filter(Boolean)
        } else {
          thoughts = thoughtsMatch[1]
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        }
      }

      const timeComplexityPattern =
        /Time complexity:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:Space complexity|$))/i
      const spaceComplexityPattern =
        /Space complexity:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i

      let timeComplexity =
        'O(n) - Linear time complexity because we only iterate through the array once. Each element is processed exactly one time, and the hashmap lookups are O(1) operations.'
      let spaceComplexity =
        'O(n) - Linear space complexity because we store elements in the hashmap. In the worst case, we might need to store all elements before finding the solution pair.'

      const timeMatch = responseContent.match(timeComplexityPattern)
      if (timeMatch && timeMatch[1]) {
        timeComplexity = timeMatch[1].trim()
        if (!timeComplexity.match(/O\([^)]+\)/i)) {
          timeComplexity = `O(n) - ${timeComplexity}`
        } else if (!timeComplexity.includes('-') && !timeComplexity.includes('because')) {
          const notationMatch = timeComplexity.match(/O\([^)]+\)/i)
          if (notationMatch) {
            const notation = notationMatch[0]
            const rest = timeComplexity.replace(notation, '').trim()
            timeComplexity = `${notation} - ${rest}`
          }
        }
      }

      const spaceMatch = responseContent.match(spaceComplexityPattern)
      if (spaceMatch && spaceMatch[1]) {
        spaceComplexity = spaceMatch[1].trim()
        if (!spaceComplexity.match(/O\([^)]+\)/i)) {
          spaceComplexity = `O(n) - ${spaceComplexity}`
        } else if (!spaceComplexity.includes('-') && !spaceComplexity.includes('because')) {
          const notationMatch = spaceComplexity.match(/O\([^)]+\)/i)
          if (notationMatch) {
            const notation = notationMatch[0]
            const rest = spaceComplexity.replace(notation, '').trim()
            spaceComplexity = `${notation} - ${rest}`
          }
        }
      }

      const formattedResponse = {
        code: code,
        thoughts:
          thoughts.length > 0
            ? thoughts
            : ['Solution approach based on efficiency and readability.'],
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity
      }

      return {
        success: true,
        data: formattedResponse
      }
    } catch (error) {
      console.error('Error generating solutions:', error)
      return {
        success: false,
        error: 'Failed to generate solutions'
      }
    }
  }

  public cancelOngoingRequest(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    this.deps.setHasDebugged(false)
    this.deps.setProblemInfo(null)

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }

  private async processExtraScreenshotsHelper(screenshots: Array<{ path: string; data: string }>) {
    try {
      const config = configManager.loadConfig()
      const language = await this.getLanguage()
      const problemInfo = this.deps.getProblemInfo()
      const mainWindow = this.deps.getMainWindow()

      if (!problemInfo) {
        throw new Error('No problem info found')
      }

      if (mainWindow) {
        mainWindow.webContents.send('processing-status', {
          message: 'Processing debug screenshots...',
          progress: 30
        })
      }

      const imageDataList = screenshots.map((screenshot) => screenshot.data)

      let debugContent

      if (config.apiProvider === 'openai') {
        if (!this.openaiClient) {
          return {
            success: false,
            error: 'Failed to initialize OpenAI client'
          }
        }

        const messages = [
          {
            role: 'system' as const,
            content: `You are a coding interview assistant helping debug and improve solutions. Analyze these screenshots which include either error messages, incorrect outputs, or test cases, and provide detailed debugging help.

            Your response MUST follow this exact structure with these section headers (use ### for headers):
            ### Issues Identified
            - List each issue as a bullet point with clear explanation

            ### Specific Improvements and Corrections
            - List specific code changes needed as bullet points

            ### Optimizations
            - List any performance optimizations if applicable

            ### Explanation of Changes Needed
            Here provide a clear explanation of why the changes are needed

            ### Key Points
            - Summary bullet points of the most important takeaways

            If you include code examples, use proper markdown code blocks with language specification (e.g. \`\`\`java).`
          },
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: `I'm solving this coding problem: "${problemInfo.problem_statement}" in ${language}. I need help with debugging or improving my solution. Here are screenshots of my code, the errors or test cases. Please provide a detailed analysis with:
                1. What issues you found in my code
                2. Specific improvements and corrections
                3. Any optimizations that would make the solution better
                4. A clear explanation of the changes needed`
              },
              ...imageDataList.map((data) => ({
                type: 'image_url' as const,
                image_url: {
                  url: `data:image/jpeg;base64,${data}`
                }
              }))
            ]
          }
        ]

        if (mainWindow) {
          mainWindow.webContents.send('processing-status', {
            message: 'Analyzing debug screenshots...',
            progress: 60
          })
        }

        const debugResponse = await this.openaiClient.chat.completions.create({
          model: config.debuggingModel || 'gpt-4o',
          messages,
          max_tokens: 4000,
          temperature: 0.2
        })

        debugContent = debugResponse.choices[0].message.content
      } else if (config.apiProvider === 'gemini') {
        if (!this.geminiClient) {
          return {
            success: false,
            error: 'Failed to initialize Gemini client'
          }
        }

        const model = this.geminiClient.getGenerativeModel({
          model: config.debuggingModel || 'gemini-2.0-flash'
        })

        const debugPrompt = `
 You are a coding interview assistant helping debug and improve solutions. Analyze these screenshots which include either error messages, incorrect outputs, or test cases, and provide detailed debugging help.

 I'm solving this coding problem: "${problemInfo.problem_statement}" in ${language}. I need help with debugging or improving my solution.

 YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE WITH THESE SECTION HEADERS:
 ### Issues Identified
 - List each issue as a bullet point with clear explanation

 ### Specific Improvements and Corrections
 - List specific code changes needed as bullet points

 ### Optimizations
 - List any performance optimizations if applicable

 ### Explanation of Changes Needed
 Here provide a clear explanation of why the changes are needed

 ### Key Points
 - Summary bullet points of the most important takeaways

 If you include code examples, use proper markdown code blocks with language specification (e.g. \`\`\`java).`

        const solutionResponse = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: debugPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })

        if (mainWindow) {
          mainWindow.webContents.send('processing-status', {
            message: 'Analyzing debug screenshots...',
            progress: 60
          })
        }

        debugContent = solutionResponse.response.text()
      }

      if (mainWindow) {
        mainWindow.webContents.send('processing-status', {
          message: 'Debug analysis complete',
          progress: 100
        })
      }

      let extractedCode = '// Debug mode - see analysis below'
      const codeMatch = debugContent.match(/```(?:[a-zA-Z]+)?([\s\S]*?)```/)
      if (codeMatch && codeMatch[1]) {
        extractedCode = codeMatch[1].trim()
      }

      let formattedDebugContent = debugContent

      if (!debugContent.includes('# ') && !debugContent.includes('## ')) {
        formattedDebugContent = debugContent
          .replace(/issues identified|problems found|bugs found/i, '## Issues Identified')
          .replace(/code improvements|improvements|suggested changes/i, '## Code Improvements')
          .replace(/optimizations|performance improvements/i, '## Optimizations')
          .replace(/explanation|detailed analysis/i, '## Explanation')
      }

      const bulletPoints = formattedDebugContent.match(/(?:^|\n)[ ]*(?:[-*•]|\d+\.)[ ]+([^\n]+)/g)
      const thoughts = bulletPoints
        ? bulletPoints
            .map((point) => point.replace(/^[ ]*(?:[-*•]|\d+\.)[ ]+/, '').trim())
            .slice(0, 5)
        : ['Debug analysis based on your screenshots']

      const response = {
        code: extractedCode,
        debug_analysis: formattedDebugContent,
        thoughts: thoughts,
        time_complexity: 'N/A - Debug mode',
        space_complexity: 'N/A - Debug mode'
      }

      return {
        success: true,
        data: response
      }
    } catch (error) {
      console.error('Error processing extra screenshots:', error)
      return {
        success: false,
        error: 'Failed to process extra screenshots'
      }
    }
  }
}
