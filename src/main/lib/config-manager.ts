import { app } from 'electron'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import OpenAI from 'openai'

interface Config {
  apiKey: string
  apiProvider: 'openai' | 'gemini' | 'groq'
  extractionModel: string
  solutionModel: string
  debuggingModel: string
  language: string
  opacity: number
}

export class ConfigManager extends EventEmitter {
  private configPath: string
  private defaultConfig: Config = {
    apiKey: '',
    apiProvider: 'groq',
    extractionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    solutionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    debuggingModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    language: 'python',
    opacity: 1.0
  }

  constructor() {
    super()
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json')
      console.log('Config path:', this.configPath)
    } catch (error) {
      console.error('Error getting config path:', error)
      this.configPath = path.join(process.cwd(), 'config.json')
    }

    this.ensureConfigFileExists()
  }

  private ensureConfigFileExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig)
        console.log('Created default config file:', this.configPath)
      }
    } catch (error) {
      console.error('Failed to ensure config file exists:', error)
    }
  }

  public saveConfig(config: Config): void {
    try {
      const configDir = path.dirname(this.configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  private sanitizeModelSelection(model: string, provider: 'openai' | 'gemini' | 'groq') {
    if (provider === 'openai') {
      const allowedModels = ['gpt-4o-mini', 'gpt-4o']
      if (!allowedModels.includes(model)) {
        console.log(`Invalid model: ${model} for provider: ${provider}. Defaulting to gpt-4o`)
        return 'gpt-4o'
      }
      return model
    } else if (provider === 'gemini') {
      const allowedModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro'
      ]
      if (!allowedModels.includes(model)) {
        console.log(
          `Invalid model: ${model} for provider: ${provider}. Defaulting to gemini-2.0-flash`
        )
        return 'gemini-2.0-flash'
      }
      return model
    } else if (provider === 'groq') {
      const allowedModels = [
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'llama-3.3-70b-versatile',
        'llama3-70b-8192',
        'llama3-8b-8192'
      ]
      if (!allowedModels.includes(model)) {
        console.log(
          `Invalid model: ${model} for provider: ${provider}. Defaulting to meta-llama/llama-4-scout-17b-16e-instruct`
        )
        return 'meta-llama/llama-4-scout-17b-16e-instruct'
      }
      return model
    }
    return model
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8')
        const config = JSON.parse(configData)

        if (
          config.apiProvider !== 'openai' &&
          config.apiProvider !== 'gemini' &&
          config.apiProvider !== 'groq'
        ) {
          console.log('Invalid API provider. Defaulting to openai')
          config.apiProvider = 'openai'
        }

        if (config.extractionModel) {
          config.extractionModel = this.sanitizeModelSelection(
            config.extractionModel,
            config.apiProvider
          )
        }

        if (config.solutionModel) {
          config.solutionModel = this.sanitizeModelSelection(
            config.solutionModel,
            config.apiProvider
          )
        }

        if (config.debuggingModel) {
          config.debuggingModel = this.sanitizeModelSelection(
            config.debuggingModel,
            config.apiProvider
          )
        }

        return {
          ...this.defaultConfig,
          ...config
        }
      }

      this.saveConfig(this.defaultConfig)
      return this.defaultConfig
    } catch (error) {
      console.error('Failed to load config:', error)
      return this.defaultConfig
    }
  }

  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig()
      let provider = updates.apiProvider || currentConfig.apiProvider

      if (updates.apiKey && !updates.apiProvider) {
        if (updates.apiKey.trim().startsWith('sk-')) {
          provider = 'openai'
          console.log('Detected OpenAI API key. Setting provider to openai')
        } else if (updates.apiKey.trim().startsWith('gsk_')) {
          provider = 'groq'
          console.log('Detected Groq API key. Setting provider to groq')
        } else {
          provider = 'gemini'
          console.log('Detected Gemini API key. Setting provider to gemini')
        }
      }

      updates.apiProvider = provider

      if (updates.apiProvider && updates.apiProvider !== currentConfig.apiProvider) {
        if (updates.apiProvider === 'openai') {
          updates.extractionModel = 'gpt-4o'
          updates.solutionModel = 'gpt-4o'
          updates.debuggingModel = 'gpt-4o'
        } else if (updates.apiProvider === 'gemini') {
          updates.extractionModel = 'gemini-2.0-flash'
          updates.solutionModel = 'gemini-2.0-flash'
          updates.debuggingModel = 'gemini-2.0-flash'
        } else if (updates.apiProvider === 'groq') {
          updates.extractionModel = 'meta-llama/llama-4-scout-17b-16e-instruct'
          updates.solutionModel = 'meta-llama/llama-4-scout-17b-16e-instruct'
          updates.debuggingModel = 'meta-llama/llama-4-scout-17b-16e-instruct'
        }
      }

      if (updates.extractionModel) {
        updates.extractionModel = this.sanitizeModelSelection(
          updates.extractionModel,
          updates.apiProvider
        )
      }
      if (updates.solutionModel) {
        updates.solutionModel = this.sanitizeModelSelection(
          updates.solutionModel,
          updates.apiProvider
        )
      }
      if (updates.debuggingModel) {
        updates.debuggingModel = this.sanitizeModelSelection(
          updates.debuggingModel,
          updates.apiProvider
        )
      }

      const newConfig = {
        ...currentConfig,
        ...updates
      }

      this.saveConfig(newConfig)

      if (
        updates.apiKey !== undefined ||
        updates.apiProvider !== undefined ||
        updates.extractionModel !== undefined ||
        updates.solutionModel !== undefined ||
        updates.debuggingModel !== undefined ||
        updates.language !== undefined
      ) {
        this.emit('config-updated', newConfig)
      }

      return newConfig
    } catch (error) {
      console.error('Failed to update config:', error)
      return this.defaultConfig
    }
  }

  public hasApiKey(): boolean {
    const config = this.loadConfig()
    return !!config.apiKey && config.apiKey.trim().length > 0
  }

  public isValidApiKeyFormat(apiKey: string, provider?: 'openai' | 'gemini' | 'groq'): boolean {
    if (provider === 'openai') {
      return apiKey.trim().startsWith('sk-')
    } else if (provider === 'gemini') {
      return apiKey.trim().startsWith('AIzaSyB')
    } else if (provider === 'groq') {
      return apiKey.trim().startsWith('gsk_')
    }
    return false
  }

  public async testApiKey(
    apiKey: string,
    provider?: 'openai' | 'gemini' | 'groq'
  ): Promise<{
    valid: boolean
    error?: string
  }> {
    if (!provider) {
      if (apiKey.trim().startsWith('sk-')) {
        provider = 'openai'
      } else if (apiKey.trim().startsWith('gsk_')) {
        provider = 'groq'
      } else {
        provider = 'gemini'
      }
    }

    if (provider === 'openai') {
      return this.testOpenAiKey(apiKey)
    } else if (provider === 'gemini') {
      return this.testGeminiKey()
    } else if (provider === 'groq') {
      return this.testGroqKey(apiKey)
    }

    return { valid: false, error: 'Invalid provider' }
  }

  private async testOpenAiKey(apiKey: string): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      const openai = new OpenAI({
        apiKey
      })

      await openai.models.list()
      return { valid: true }
    } catch (error) {
      console.error('OpenAI API key test failed:', error)
      return { valid: false, error: 'Invalid API key' }
    }
  }

  private async testGeminiKey(): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      return { valid: true }
    } catch (error) {
      console.error('Gemini API key test failed:', error)
      return { valid: false, error: 'Invalid API key' }
    }
  }

  private async testGroqKey(apiKey: string): Promise<{
    valid: boolean
    error?: string
  }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()
      if (data && Array.isArray(data.data)) {
        return { valid: true }
      }

      return { valid: false, error: 'Invalid API response' }
    } catch (error) {
      console.error('Groq API key test failed:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate Groq API key'
      }
    }
  }

  public getOpacity(): number {
    const config = this.loadConfig()
    return config.opacity !== undefined ? config.opacity : 1.0
  }

  public setOpacity(opacity: number): void {
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity))
    this.updateConfig({ opacity: validOpacity })
  }

  public getLanguage(): string {
    const config = this.loadConfig()
    return config.language !== undefined ? config.language : 'python'
  }

  public setLanguage(language: string): void {
    this.updateConfig({ language })
  }
}

export const configManager = new ConfigManager()
